// DGE-11 — la configuration des modules institution est PERSISTÉE et
// immédiatement opposable (20/10/2026).
//
// Constat (AUDIT-PARCOURS-DGE-BACKOFFICE §DGE-11) : côté front, les modules
// de l'espace institution étaient une LISTE EN DUR (InstitutionAccessContext)
// et BOConfigInstitution ne persistait RIEN (0 appel réseau, bouton
// « Enregistrer » condamné derrière un isBackendReady=false qui attendait un
// /api/v1/admin/config jamais existé). Pendant ce temps le SERVEUR avait déjà
// le vrai mécanisme : institutions.modules (jsonb, module -> NiveauAcces),
// appliqué fail-closed par InstitutionScopeGuard via @RequireInstitutionModule.
//
// Ce test verrouille la BOUCLE COMPLÈTE côté API — le contrat que le front
// corrigé doit consommer :
//  - DGE-11-a : super_admin PATCH /institutions/:id {modules} → persisté en
//    base + entrée d'audit UPDATE_INSTITUTION_MODULES.
//  - DGE-11-b : le niveau écrit est immédiatement opposable — GET
//    /institution/{dashboard,analytics,audit,acteurs,transactions} passent au
//    niveau 'lecture', tombent en 403 au niveau 'aucun' (dashboard et son
//    analytics partagent la même clé), SANS redémarrage ni cache.
//  - DGE-11-c : les garde-fous — un compte institution ne peut pas
//    s'auto-configurer (403 rôles), modules non-objet → 400 explicite.
//
// Le front honnête (même session) : InstitutionAccessContext lit CE modules
// serveur (fail-closed tant que le serveur n'a pas parlé), BOConfigInstitution
// écrit via CE PATCH. Toute dérive vers une liste en dur est trahie par le
// garde front (modulesPilote.test.mts).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ThrottlerStorage } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole } from '../../src/users/entities/user.entity';

const ZONE_A = '13111111-1111-1111-1111-111111111111';

describe('Invariant DGE-11 — modules institution persistés et immédiatement opposables (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;

  let tokenSuperAdmin: string;
  let tokenInstitution: string;
  let institutionId: string;

  const api = () => request(app.getHttpServer());

  const seedUser = async (role: UserRole, phone: string, zoneId?: string): Promise<{ id: string; token: string }> => {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone, firstName: 'Agent', lastName: role, genre: 'homme',
      role, status: 'actif' as any, passwordHash: await bcrypt.hash('1234', 10),
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
      ['Institution DGE-11', zoneId, responsableId, JSON.stringify(modules)],
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

    const superAdmin = await seedUser(UserRole.SUPER_ADMIN, '+2250700000611');
    tokenSuperAdmin = superAdmin.token;

    // Institution démarre SANS module dashboard (niveau 'aucun' explicite) :
    // le 403 initial prouve que c'est le NIVEAU ÉCRIT qui décide, pas une
    // whitelist front.
    const inst = await seedUser(UserRole.INSTITUTION, '+2250700000612', ZONE_A);
    tokenInstitution = inst.token;
    institutionId = await seedInstitution(inst.id, ZONE_A, {
      dashboard: 'aucun', acteurs: 'aucun', transactions: 'aucun', audit: 'aucun',
    });
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('DGE-11-a : super_admin PATCH {modules} → persisté en base + audit UPDATE_INSTITUTION_MODULES', async () => {
    const r = await api()
      .patch(`/api/v1/institutions/${institutionId}`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ modules: { dashboard: 'lecture', acteurs: 'lecture', transactions: 'lecture', audit: 'lecture' } });
    expect([200, 201]).toContain(r.status);

    // Persisté en base (pas seulement renvoyé).
    const enBase = await ds.query(
      `SELECT modules FROM institutions WHERE id = $1`,
      [institutionId],
    );
    expect(enBase[0]?.modules?.dashboard).toBe('lecture');

    // L'écriture est journalisée (conformité 2013-450).
    const auditRows = await ds.query(
      `SELECT details FROM audit_logs
        WHERE action = 'UPDATE_INSTITUTION_MODULES' AND entite_id::text = $1`,
      [institutionId],
    );
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
    expect(auditRows[0].details?.modules?.dashboard).toBe('lecture');
  });

  it('DGE-11-b : le niveau écrit est immédiatement opposable (200 après PATCH)', async () => {
    // dashboard (clé 'dashboard')…
    const dash = await api()
      .get('/api/v1/institution/dashboard')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(dash.status).toBe(200);

    // …analytics partage la MÊME clé serveur (RequireInstitutionModule('dashboard'))…
    const analytics = await api()
      .get('/api/v1/institution/analytics')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(analytics.status).toBe(200);

    // …audit, acteurs et transactions sur leurs clés respectives.
    const audit = await api()
      .get('/api/v1/institution/audit')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(audit.status).toBe(200);
    const acteurs = await api()
      .get('/api/v1/institution/acteurs')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(acteurs.status).toBe(200);
    const transactions = await api()
      .get('/api/v1/institution/transactions')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(transactions.status).toBe(200);
  });

  it('DGE-11-b (suite) : niveau ramené à \u0027aucun\u0027 → 403 immédiat, sans cache ni redémarrage', async () => {
    const r = await api()
      .patch(`/api/v1/institutions/${institutionId}`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ modules: { dashboard: 'aucun', acteurs: 'lecture', transactions: 'lecture', audit: 'lecture' } });
    expect([200, 201]).toContain(r.status);

    const dash = await api()
      .get('/api/v1/institution/dashboard')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(dash.status).toBe(403);
    expect(String(dash.body?.message || '')).toContain('dashboard');

    const analytics = await api()
      .get('/api/v1/institution/analytics')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(analytics.status).toBe(403);

    // Les autres modules restent inchangés : le retrait est SCOPÉ à la clé.
    const audit = await api()
      .get('/api/v1/institution/audit')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(audit.status).toBe(200);
  });

  it('DGE-11-c : un compte institution ne peut pas s\u2019auto-configurer (403 rôles)', async () => {
    const r = await api()
      .patch(`/api/v1/institutions/${institutionId}`)
      .set('Authorization', `Bearer ${tokenInstitution}`)
      .send({ modules: { dashboard: 'complet' } });
    expect(r.status).toBe(403);

    // Et rien n'a bougé en base.
    const enBase = await ds.query(`SELECT modules FROM institutions WHERE id = $1`, [institutionId]);
    expect(enBase[0]?.modules?.dashboard).toBe('aucun');
  });

  it('DGE-11-c (suite) : modules non-objet → 400 explicite', async () => {
    const r = await api()
      .patch(`/api/v1/institutions/${institutionId}`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ modules: 'tout-ou-rien' });
    expect(r.status).toBe(400);
    expect(String(r.body?.message || '')).toContain('modules');
  });
});
