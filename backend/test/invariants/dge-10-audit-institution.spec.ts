// DGE-10 — la piste d'audit du régulateur : scopée à sa zone, ses lectures
// journalisées (20/10/2026).
//
// Constat (AUDIT-PARCOURS-DGE-BACKOFFICE §DGE-10, reconduisant INSTITUTION-05
// du 19/10 et INSTITUTION-08 du 05/10) : GET /audit porte @Roles('ADMIN') —
// les rôles back-office uniquement — donc le compte `institution` essuyait un
// 403 garanti, son écran AuditTrail restait vide, et ses propres accès
// n'étaient journalisés nulle part (conformité 2013-450 impossible).
//
// Correctif : GET /institution/audit (module `audit` requis, périmètre
// InstitutionScopeGuard fail-closed) — journal du périmètre = auteur dans la
// zone OU objet dossier d'identification de la zone OU le régulateur lui-même.
// Chaque lecture écrit INSTITUTION_AUDIT_LECTURE.
//
// Propriétés vérifiées (🟢 attendu) :
//  - DGE-10-a : l'institution lit SA piste : la décision BO sur le dossier de
//    SA zone y figure, celle du dossier d'une autre zone n'y figure jamais.
//  - DGE-10-b : la lecture est elle-même journalisée — la trace
//    INSTITUTION_AUDIT_LECTURE du régulateur apparaît dans sa piste.
//  - DGE-10-c : fail-closed — sans module `audit` (403 nommant le module),
//    sans zone configurée (403), et un marchand (403 rôle).
//  - DGE-10-d : super_admin lit la piste PLATEFORME (les deux zones) —
//    convention inchangée des routes /institution/*.
//  - DGE-10-e : régression — l'ancienne GET /audit reste hors d'atteinte du
//    rôle institution (403), la nouvelle route est le seul chemin.

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

describe('Invariant DGE-10 — audit scopé institution + lectures journalisées (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;

  let tokenAdmin: string;
  let tokenInstitution: string;
  let tokenInstitutionSansModule: string;
  let tokenInstitutionSansZone: string;
  let tokenMarchand: string;
  let tokenSuperAdmin: string;

  let dossierZoneAId: string;
  let dossierZoneBId: string;

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

  const seedInstitution = async (responsableId: string, zoneId: string | null, modules: Record<string, string>): Promise<string> => {
    const rows = await ds.query(
      `INSERT INTO institutions (nom, type, zone_id, responsable_id, modules)
       VALUES ($1, 'dge', $2, $3, $4::jsonb) RETURNING id`,
      ['Institution Test', zoneId, responsableId, JSON.stringify(modules)],
    );
    return rows[0].id;
  };

  const seedDossier = async (identificateurId: string, zoneId: string): Promise<string> => {
    const rows = await ds.query(
      `INSERT INTO identifications (identificateur_id, acteur_nom, type_acteur, statut, zone_id)
       VALUES ($1, 'Acteur Test', 'marchand', 'en_attente', $2) RETURNING id`,
      [identificateurId, zoneId],
    );
    return rows[0].id;
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

    // Un identificateur (auteur des dossiers) + un admin_national (décisions BO).
    const ident = await seedUser(UserRole.IDENTIFICATEUR, '+2250700000601', ZONE_A);
    const admin = await seedUser(UserRole.ADMIN_NATIONAL, '+2250700000602');
    tokenAdmin = admin.token;

    // Deux dossiers : un en zone A (périmètre), un en zone B (hors périmètre).
    dossierZoneAId = await seedDossier(ident.id, ZONE_A);
    dossierZoneBId = await seedDossier(ident.id, ZONE_B);

    // Le BO tranche les deux dossiers → 2 entrées IDENTIFICATION_STATUT_MODIFIE.
    const va = await api()
      .patch(`/api/v1/identifications/${dossierZoneAId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ statut: 'approuve' });
    expect([200, 201]).toContain(va.status);
    const vb = await api()
      .patch(`/api/v1/identifications/${dossierZoneBId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ statut: 'approuve' });
    expect([200, 201]).toContain(vb.status);

    // Les comptes institution du jeu d'essai.
    const inst = await seedUser(UserRole.INSTITUTION, '+2250700000603');
    tokenInstitution = inst.token;
    await seedInstitution(inst.id, ZONE_A, { audit: 'lecture', dashboard: 'lecture' });

    const instSansModule = await seedUser(UserRole.INSTITUTION, '+2250700000604');
    tokenInstitutionSansModule = instSansModule.token;
    await seedInstitution(instSansModule.id, ZONE_A, { dashboard: 'lecture' }); // pas de module audit

    const instSansZone = await seedUser(UserRole.INSTITUTION, '+2250700000605');
    tokenInstitutionSansZone = instSansZone.token;
    await seedInstitution(instSansZone.id, null, { audit: 'lecture' }); // zone non configurée

    const marchand = await seedUser(UserRole.MARCHAND, '+2250700000606');
    tokenMarchand = marchand.token;

    const superAdmin = await seedUser(UserRole.SUPER_ADMIN, '+2250700000607');
    tokenSuperAdmin = superAdmin.token;
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('DGE-10-a : l\u2019institution lit SA piste — décision de sa zone visible, autre zone jamais', async () => {
    const r = await api()
      .get('/api/v1/institution/audit')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.logs)).toBe(true);

    const entites: string[] = r.body.logs
      .filter((l: any) => l.entite === 'identification')
      .map((l: any) => String(l.entite_id));
    expect(entites).toContain(String(dossierZoneAId));
    expect(entites).not.toContain(String(dossierZoneBId));
  });

  it('DGE-10-b : la lecture est elle-même journalisée (INSTITUTION_AUDIT_LECTURE)', async () => {
    // Une première lecture (trace posée), puis la piste doit montrer la trace.
    await api()
      .get('/api/v1/institution/audit')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    const r = await api()
      .get('/api/v1/institution/audit')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(r.status).toBe(200);

    const instId = await ds.query(`SELECT id::text AS id FROM users WHERE phone = '+2250700000603'`);
    const lectures = r.body.logs.filter(
      (l: any) => l.action === 'INSTITUTION_AUDIT_LECTURE' && String(l.user_id) === String(instId[0].id),
    );
    expect(lectures.length).toBeGreaterThanOrEqual(1);

    // Vérification directe en base : l'entrée existe avec son périmètre.
    const enBase = await ds.query(
      `SELECT details FROM audit_logs WHERE action = 'INSTITUTION_AUDIT_LECTURE' AND user_id::text = $1`,
      [instId[0].id],
    );
    expect(enBase.length).toBeGreaterThanOrEqual(2);
    expect(enBase[0].details?.perimetre).toBe('zone');
  });

  it('DGE-10-c : fail-closed — sans module, sans zone, ou rôle marchand → 403', async () => {
    // Institution SANS module `audit` configuré : 403 nommant le module.
    const sansModule = await api()
      .get('/api/v1/institution/audit')
      .set('Authorization', `Bearer ${tokenInstitutionSansModule}`);
    expect(sansModule.status).toBe(403);
    expect(String(sansModule.body?.message || '')).toContain('audit');

    // Institution SANS zone configurée : 403 (périmètre non configuré).
    const sansZone = await api()
      .get('/api/v1/institution/audit')
      .set('Authorization', `Bearer ${tokenInstitutionSansZone}`);
    expect(sansZone.status).toBe(403);

    // Un marchand n'a rien à faire sur la piste d'audit : 403 (rôle).
    const marchand = await api()
      .get('/api/v1/institution/audit')
      .set('Authorization', `Bearer ${tokenMarchand}`);
    expect(marchand.status).toBe(403);
  });

  it('DGE-10-d : super_admin lit la piste plateforme (les deux zones)', async () => {
    const r = await api()
      .get('/api/v1/institution/audit?entite=identification')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);
    expect(r.status).toBe(200);

    const entites: string[] = r.body.logs.map((l: any) => String(l.entite_id));
    expect(entites).toContain(String(dossierZoneAId));
    expect(entites).toContain(String(dossierZoneBId));
  });

  it('DGE-10-e : régression — GET /audit (BO) reste 403 pour le rôle institution', async () => {
    const r = await api()
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(r.status).toBe(403);
  });

  // Garde anti-faux-positif : les entrées de décision existent bien (le test
  // DGE-10-a doit prouver un FILTRE, pas une base vide).
  it('DGE-10-f : garde — les deux décisions BO existent dans audit_logs', async () => {
    const rows = await ds.query(
      `SELECT entite_id FROM audit_logs
        WHERE action = 'IDENTIFICATION_STATUT_MODIFIE' AND entite_id::text = ANY($1::text[])`,
      [[dossierZoneAId, dossierZoneBId]],
    );
    expect(rows.length).toBe(2);
  });
});
