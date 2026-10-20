// IDENT-01 / DGE-12 — `gestionnaire_zone` peut valider les enrôlements DE SA
// ZONE (déblocage arbitré A-03, 20/10/2026).
//
// Trou constaté le 20/10 (AUDIT-PARCOURS-IDENTIFICATEUR §IDENT-01 + DGE-12) :
// `gestionnaire_zone` porte `enrolement.validate` PAR DÉFAUT
// (auth/bo-autorisation.ts:27) et l'UI BO lui affiche l'écran Enrôlement,
// mais il était ABSENT des listes `isAdmin` de identifications.controller
// (findAll/findOne/PATCH) : sa liste de dossiers était VIDE (fallback « ses
// propres dossiers ») et toute validation → 403 « Accès refusé ». Le rôle
// opérationnel de terrain de la DGE ne pouvait pas valider.
//
// Correctif : le gestionnaire de zone passe les portes admin SCOPÉ À SA ZONE
// (identifications.zone_id = users.zone_id) ; sans zone affectée, il ne voit
// RIEN (fail-closed, doctrine zones). C-12 n'est pas touché : le propriétaire
// d'un dossier ne s'auto-approuve toujours pas, et operateur_terrain (sans
// `enrolement.validate` depuis C-12) reste incapable de valider.
//
// Propriétés vérifiées (🟢 attendu) :
//  - IDENT-01-a : la liste GET /identifications du gestionnaire de zone
//    contient les dossiers de SA zone, jamais ceux des autres zones.
//  - IDENT-01-b : il lit (GET :id) un dossier de sa zone, pas d'une autre.
//  - IDENT-01-c : il VALIDE (PATCH statut 'approuve') un dossier de sa zone ;
//    l'audit IDENTIFICATION_STATUT_MODIFIE est écrit dans la même transaction.
//  - IDENT-01-d : toute écriture hors de sa zone → 403.
//  - IDENT-01-e : sans zone affectée → liste vide + 403 à l'écriture (fail-closed).
//  - IDENT-01-f (régressions C-12) : le propriétaire identificateur → 403,
//    l'operateur_terrain → 403.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ThrottlerStorage } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

const ZONE_A = '11111111-1111-1111-1111-111111111111';
const ZONE_B = '22222222-2222-2222-2222-222222222222';

describe('Invariant IDENT-01 — gestionnaire_zone valide dans sa zone (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;

  let identificateurId: string;
  let dossierZoneAId: string;
  let dossierZoneBId: string;
  let tokenGZ: string;
  let tokenGZSansZone: string;
  let tokenIdentificateur: string;
  let tokenOperateur: string;

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

  const seedDossier = async (zoneId: string, statut: string): Promise<string> => {
    const rows = await ds.query(
      `INSERT INTO identifications (identificateur_id, acteur_nom, type_acteur, statut, zone_id)
       VALUES ($1, 'Acteur Test', 'marchand', $2, $3) RETURNING id`,
      [identificateurId, statut, zoneId],
    );
    return rows[0].id as string;
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }) })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    const identificateur = await seedUser(UserRole.IDENTIFICATEUR, '+2250700000401');
    identificateurId = identificateur.id;
    tokenIdentificateur = identificateur.token;

    const gz = await seedUser(UserRole.GESTIONNAIRE_ZONE, '+2250700000402', ZONE_A);
    tokenGZ = gz.token;
    const gzSansZone = await seedUser(UserRole.GESTIONNAIRE_ZONE, '+2250700000403');
    tokenGZSansZone = gzSansZone.token;
    const operateur = await seedUser(UserRole.OPERATEUR_TERRAIN, '+2250700000404');
    tokenOperateur = operateur.token;

    dossierZoneAId = await seedDossier(ZONE_A, 'en_attente');
    dossierZoneBId = await seedDossier(ZONE_B, 'en_attente');
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('IDENT-01-a : la liste du gestionnaire de zone contient SA zone, pas les autres', async () => {
    const r = await api()
      .get('/api/v1/identifications')
      .set('Authorization', `Bearer ${tokenGZ}`);
    expect(r.status).toBe(200);
    const ids: string[] = (r.body.data || []).map((d: any) => d.id);
    expect(ids).toContain(dossierZoneAId);
    expect(ids).not.toContain(dossierZoneBId);
  });

  it('IDENT-01-b : il lit un dossier de sa zone (200), pas celui d\u2019une autre zone (403)', async () => {
    const ok = await api()
      .get(`/api/v1/identifications/${dossierZoneAId}`)
      .set('Authorization', `Bearer ${tokenGZ}`);
    expect(ok.status).toBe(200);

    const ko = await api()
      .get(`/api/v1/identifications/${dossierZoneBId}`)
      .set('Authorization', `Bearer ${tokenGZ}`);
    expect(ko.status).toBe(403);
  });

  it('IDENT-01-c : il VALIDE un dossier de sa zone — audit écrit, machine à états respectée', async () => {
    const r = await api()
      .patch(`/api/v1/identifications/${dossierZoneAId}`)
      .set('Authorization', `Bearer ${tokenGZ}`)
      .send({ statut: 'approuve' });
    expect([200, 201]).toContain(r.status);

    const dossier = await ds.query(`SELECT statut FROM identifications WHERE id = $1`, [dossierZoneAId]);
    expect(dossier[0].statut).toBe('approuve');

    const audit = await ds.query(
      `SELECT action, entite_id FROM audit_logs WHERE entite = 'identification' AND entite_id = $1 AND action = 'IDENTIFICATION_STATUT_MODIFIE'`,
      [dossierZoneAId],
    );
    expect(audit.length).toBe(1);
  });

  it('IDENT-01-d : toute écriture hors de sa zone est refusée (403)', async () => {
    const r = await api()
      .patch(`/api/v1/identifications/${dossierZoneBId}`)
      .set('Authorization', `Bearer ${tokenGZ}`)
      .send({ statut: 'approuve' });
    expect(r.status).toBe(403);

    const dossier = await ds.query(`SELECT statut FROM identifications WHERE id = $1`, [dossierZoneBId]);
    expect(dossier[0].statut).toBe('en_attente');
  });

  it('IDENT-01-e : sans zone affectée — liste vide et écriture refusée (fail-closed)', async () => {
    const liste = await api()
      .get('/api/v1/identifications')
      .set('Authorization', `Bearer ${tokenGZSansZone}`);
    expect(liste.status).toBe(200);
    // Sans zone, il retombe sur « ses propres dossiers » — il n'en a aucun.
    expect((liste.body.data || []).length).toBe(0);

    const ecriture = await api()
      .patch(`/api/v1/identifications/${dossierZoneBId}`)
      .set('Authorization', `Bearer ${tokenGZSansZone}`)
      .send({ statut: 'approuve' });
    expect(ecriture.status).toBe(403);
  });

  it('IDENT-01-f : C-12 intact — le propriétaire et l\u2019operateur_terrain ne valident toujours pas', async () => {
    // Un nouveau dossier en attente pour les deux tentatives.
    const idDossier = await seedDossier(ZONE_A, 'en_attente');

    const proprietaire = await api()
      .patch(`/api/v1/identifications/${idDossier}`)
      .set('Authorization', `Bearer ${tokenIdentificateur}`)
      .send({ statut: 'rejete', motif_rejet: 'essai' });
    expect(proprietaire.status).toBe(403);

    const operateur = await api()
      .patch(`/api/v1/identifications/${idDossier}`)
      .set('Authorization', `Bearer ${tokenOperateur}`)
      .send({ statut: 'rejete', motif_rejet: 'essai' });
    expect(operateur.status).toBe(403);
  });
});
