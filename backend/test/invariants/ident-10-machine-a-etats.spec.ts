// IDENT-10 — la machine à états C-12 est VERROUILLÉE PAR LA CI (20/10/2026).
//
// Constat (AUDIT-PARCOURS-IDENTIFICATEUR §IDENT-10) : aucun *.spec.ts backend
// n'exerçait exigerTransitionStatut / enrolement.validate — le correctif C-12
// (19/10) n'était pas verrouillé par la CI, une régression pouvait le rouvrir
// en silence.
//
// Cette spec fait passer la CI sur les cinq propriétés demandées par l'audit,
// plus la double porte :
//  - IDENT-10-a : le PROPRIÉTAIRE du dossier (identificateur) → 403 explicite
//    C-12, statut inchangé, AUCUN audit, AUCUN SMS.
//  - IDENT-10-b : l'operateur_terrain → 403 sur /identifications ET sur la
//    route jumelle /dossiers (double porte, même verrou).
//  - IDENT-10-c : le gestionnaire_de_zone de la zone (IDENT-01 débloqué) →
//    200, statut appliqué, audit IDENTIFICATION_STATUT_MODIFIE écrit avec
//    source=agent_habilite.
//  - IDENT-10-d : transition interdite (approuve → rejete) → 409 nommant les
//    deux états ; statut inchangé ; aucun audit supplémentaire.
//  - IDENT-10-e : rejet sans motif → 400 « Le motif de rejet est obligatoire ».
//  - IDENT-10-f : rejet AVEC motif → 200, SMS de rejet parti, audit portant
//    le motif.
//  - IDENT-10-g : le propriétaire ne contourne pas non plus par /dossiers.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ThrottlerStorage } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { FeedbakSmsService } from '../../src/feedbak-sms/feedbak-sms.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

const ZONE_A = '11111111-1111-1111-1111-111111111111';
const ZONE_B = '22222222-2222-2222-2222-222222222222';

describe('Invariant IDENT-10 — la machine à états C-12 est verrouillée par la CI (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;

  const smsAppels: string[] = [];
  let identificateurToken: string;
  let operateurToken: string;
  let tokenGZ: string;
  let tokenGZAutreZone: string;
  let acteurId: string;

  const api = () => request(app.getHttpServer());

  const seedUser = async (role: UserRole, phone: string, zoneId?: string): Promise<{ id: string; token: string }> => {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone, firstName: 'Agent', lastName: role, genre: 'homme',
      role, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
      ...(zoneId !== undefined ? { zoneId } : {}),
    } as any);
    const saved: any = await repo.save(u as any);
    const token = await jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
    return { id: saved.id, token };
  };

  const seedDossier = async (zoneId: string, statut = 'en_attente'): Promise<string> => {
    const ident = await ds.query(`SELECT id::text AS id FROM users WHERE phone = '+2250700000701'`);
    const rows = await ds.query(
      `INSERT INTO identifications (identificateur_id, acteur_id, acteur_nom, type_acteur, statut, zone_id)
       VALUES ($1, $2, 'Acteur Test', 'marchand', $3, $4) RETURNING id`,
      [ident[0].id, acteurId, statut, zoneId],
    );
    return rows[0].id;
  };

  const nbAudits = async (dossierId: string): Promise<number> => {
    const rows = await ds.query(
      `SELECT COUNT(*)::int AS n FROM audit_logs WHERE entite = 'identification' AND entite_id::text = $1`,
      [String(dossierId)],
    );
    return rows[0].n;
  };

  beforeAll(async () => {
    // Espion SMS : enregistre les notifications émises, n'envoie rien. On
    // remplace FeedbakSmsService (le service des notifications de dossier)
    // par un bouchon explicite de ses méthodes publiques.
    const feedbakSpy = {
      notifyDossierSoumis: async () => { smsAppels.push('notifyDossierSoumis'); },
      notifyDossierValide: async () => { smsAppels.push('notifyDossierValide'); },
      notifyDossierValideActivationRequise: async () => { smsAppels.push('notifyDossierValideActivationRequise'); },
      notifyDossierValideCompteDejaActif: async () => { smsAppels.push('notifyDossierValideCompteDejaActif'); },
      notifyDossierRejete: async () => { smsAppels.push('notifyDossierRejete'); },
      notifyComplementRequis: async () => { smsAppels.push('notifyComplementRequis'); },
      notifyCompteSuspendu: async () => { smsAppels.push('notifyCompteSuspendu'); },
      notifyCompteReactive: async () => { smsAppels.push('notifyCompteReactive'); },
      notifyMutationZone: async () => { smsAppels.push('notifyMutationZone'); },
      notifyPinIdentificateurCreated: async () => { smsAppels.push('notifyPinIdentificateurCreated'); return true; },
      notifyPinIdentificateurReset: async () => { smsAppels.push('notifyPinIdentificateurReset'); return true; },
      notifyMotDePasseBo: async () => { smsAppels.push('notifyMotDePasseBo'); return true; },
      notifyPinChanged: async () => { smsAppels.push('notifyPinChanged'); },
    };
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }) })
      .overrideProvider(FeedbakSmsService)
      .useValue(feedbakSpy)
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    const identificateur = await seedUser(UserRole.IDENTIFICATEUR, '+2250700000701', ZONE_A);
    identificateurToken = identificateur.token;
    // L'acteur du dossier : un vrai compte avec un téléphone pour les branches SMS.
    const acteur = await seedUser(UserRole.MARCHAND, '+2250700000702');
    acteurId = acteur.id;

    const operateur = await seedUser(UserRole.OPERATEUR_TERRAIN, '+2250700000703');
    operateurToken = operateur.token;
    const gz = await seedUser(UserRole.GESTIONNAIRE_ZONE, '+2250700000704', ZONE_A);
    tokenGZ = gz.token;
    const gzAutre = await seedUser(UserRole.GESTIONNAIRE_ZONE, '+2250700000705', ZONE_B);
    tokenGZAutreZone = gzAutre.token;
  }, 180000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('IDENT-10-a : le propriétaire → 403 C-12 explicite, statut inchangé, zéro audit, zéro SMS', async () => {
    const idDossier = await seedDossier(ZONE_A);
    const avant = await nbAudits(idDossier);

    const r = await api()
      .patch(`/api/v1/identifications/${idDossier}`)
      .set('Authorization', `Bearer ${identificateurToken}`)
      .send({ statut: 'approuve' });
    expect(r.status).toBe(403);
    expect(String(r.body?.message || '')).toContain('C-12');

    const apres = await ds.query(`SELECT statut FROM identifications WHERE id = $1`, [idDossier]);
    expect(apres[0].statut).toBe('en_attente');
    expect(await nbAudits(idDossier)).toBe(avant);
    expect(smsAppels).toHaveLength(0);
  });

  it('IDENT-10-b : l\u2019operateur_terrain → 403 sur /identifications ET sur /dossiers (double porte)', async () => {
    const idDossier = await seedDossier(ZONE_A);

    const principal = await api()
      .patch(`/api/v1/identifications/${idDossier}`)
      .set('Authorization', `Bearer ${operateurToken}`)
      .send({ statut: 'approuve' });
    expect(principal.status).toBe(403);

    const jumelle = await api()
      .patch(`/api/v1/dossiers/${idDossier}`)
      .set('Authorization', `Bearer ${operateurToken}`)
      .send({ statut: 'approuve' });
    expect(jumelle.status).toBe(403);

    const apres = await ds.query(`SELECT statut FROM identifications WHERE id = $1`, [idDossier]);
    expect(apres[0].statut).toBe('en_attente');
  });

  it('IDENT-10-c : gestionnaire_zone de la zone → 200, statut appliqué, audit écrit (source agent_habilite)', async () => {
    const idDossier = await seedDossier(ZONE_A);

    const r = await api()
      .patch(`/api/v1/identifications/${idDossier}`)
      .set('Authorization', `Bearer ${tokenGZ}`)
      .send({ statut: 'approuve' });
    expect([200, 201]).toContain(r.status);

    const apres = await ds.query(`SELECT statut FROM identifications WHERE id = $1`, [idDossier]);
    expect(apres[0].statut).toBe('approuve');

    const audits = await ds.query(
      `SELECT action, details FROM audit_logs
        WHERE entite = 'identification' AND entite_id::text = $1 AND action = 'IDENTIFICATION_STATUT_MODIFIE'`,
      [String(idDossier)],
    );
    expect(audits.length).toBe(1);
    expect(audits[0].details?.ancien_statut).toBe('en_attente');
    expect(audits[0].details?.nouveau_statut).toBe('approuve');
    expect(audits[0].details?.source).toBe('agent_habilite');
  });

  it('IDENT-10-d : transition interdite (approuve → rejete) → 409 nommant les deux états, zéro nouvel audit', async () => {
    const idDossier = await seedDossier(ZONE_A);
    // Mise en approuve par le gestionnaire de zone (chemin légal).
    const ok = await api()
      .patch(`/api/v1/identifications/${idDossier}`)
      .set('Authorization', `Bearer ${tokenGZ}`)
      .send({ statut: 'approuve' });
    expect([200, 201]).toContain(ok.status);
    const avant = await nbAudits(idDossier);

    const ko = await api()
      .patch(`/api/v1/identifications/${idDossier}`)
      .set('Authorization', `Bearer ${tokenGZ}`)
      .send({ statut: 'rejete', motif_rejet: 'tentative de retour arrière' });
    expect(ko.status).toBe(409);
    expect(String(ko.body?.message || '')).toContain('approuve');
    expect(String(ko.body?.message || '')).toContain('rejete');

    const apres = await ds.query(`SELECT statut FROM identifications WHERE id = $1`, [idDossier]);
    expect(apres[0].statut).toBe('approuve');
    expect(await nbAudits(idDossier)).toBe(avant);
  });

  it('IDENT-10-e : rejet sans motif → 400 « Le motif de rejet est obligatoire »', async () => {
    const idDossier = await seedDossier(ZONE_A);

    const r = await api()
      .patch(`/api/v1/identifications/${idDossier}`)
      .set('Authorization', `Bearer ${tokenGZ}`)
      .send({ statut: 'rejete' });
    expect(r.status).toBe(400);
    expect(String(r.body?.message || '')).toContain('motif de rejet est obligatoire');

    const apres = await ds.query(`SELECT statut FROM identifications WHERE id = $1`, [idDossier]);
    expect(apres[0].statut).toBe('en_attente');
  });

  it('IDENT-10-f : rejet AVEC motif → 200, SMS de rejet parti, audit portant le motif', async () => {
    const idDossier = await seedDossier(ZONE_A);
    smsAppels.length = 0;

    const r = await api()
      .patch(`/api/v1/identifications/${idDossier}`)
      .set('Authorization', `Bearer ${tokenGZ}`)
      .send({ statut: 'rejete', motif_rejet: 'photo illisible' });
    expect([200, 201]).toContain(r.status);

    const apres = await ds.query(`SELECT statut FROM identifications WHERE id = $1`, [idDossier]);
    expect(apres[0].statut).toBe('rejete');

    expect(smsAppels.some((m) => /rejete|reject|rejet/i.test(m))).toBe(true);

    const audits = await ds.query(
      `SELECT details FROM audit_logs
        WHERE entite = 'identification' AND entite_id::text = $1 AND action = 'IDENTIFICATION_STATUT_MODIFIE'`,
      [String(idDossier)],
    );
    expect(audits.length).toBe(1);
    expect(audits[0].details?.motif).toBe('photo illisible');
    expect(audits[0].details?.nouveau_statut).toBe('rejete');
  });

  it('IDENT-10-g : le propriétaire ne contourne pas par /dossiers (403 C-12)', async () => {
    const idDossier = await seedDossier(ZONE_A);

    const r = await api()
      .patch(`/api/v1/dossiers/${idDossier}`)
      .set('Authorization', `Bearer ${identificateurToken}`)
      .send({ statut: 'approuve' });
    expect(r.status).toBe(403);
    expect(String(r.body?.message || '')).toContain('C-12');

    const apres = await ds.query(`SELECT statut FROM identifications WHERE id = $1`, [idDossier]);
    expect(apres[0].statut).toBe('en_attente');
  });
});
