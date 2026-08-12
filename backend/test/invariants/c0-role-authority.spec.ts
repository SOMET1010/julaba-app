// C0.1 — Barrière M6 + M8 : autorité sur la création de rôles.
//
// Tests de RÉGRESSION : rouges sur la base vulnérable 524d7f9, verts après M6+M8.
// Base Postgres jetable (aucun test contre la production).
//
// NB harnais : ce build a des versions @nestjs/common@10 / @nestjs/core@11
// mélangées (problème adjacent consigné, hors lot) ; les HttpException du code
// (403/401) y ressortent en 500. Les tests e2e vérifient donc l'INVARIANT de
// sécurité — opération REJETÉE (status >= 400) ET aucun compte privilégié créé —
// robuste à ce quirk ; un test UNITAIRE prouve le 403 littéral au niveau service.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserStatus } from '../../src/users/entities/user.entity';

describe('C0.1 — autorité des rôles (M6 + M8)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let tokenSuperAdmin: string;
  let tokenIdentificateur: string;
  let tokenOperateur: string;

  const seedToken = async (phone: string, role: string): Promise<string> => {
    const repo = ds.getRepository(User);
    const saved = await repo.save(repo.create({
      phone, passwordHash: 'seeded-no-login', firstName: 'Seed', lastName: role,
      role: role as any, genre: 'homme' as any,
      status: UserStatus.ACTIF, validated: true, mustChangePassword: false,
    } as any)) as any;
    return app.get(JwtService).signAsync({ sub: saved.id, phone: saved.phone, role: saved.role });
  };
  // Vide le compteur du throttler avant chaque requête (le harnais applique
  // ~5/min sur toutes les routes ; on veut la VRAIE réponse, jamais un 429).
  const resetThrottle = () => {
    try {
      const s: any = app.get(ThrottlerStorage, { strict: false });
      const bag = s?.storage ?? s?._storage; // v6 : Map<string, ...>
      if (bag && typeof bag.clear === 'function') bag.clear();
      else if (bag) for (const k of Object.keys(bag)) delete bag[k];
    } catch { /* pas de storage accessible : ignoré */ }
  };
  const signup = (body: any) => {
    resetThrottle();
    return request(app.getHttpServer()).post('/api/v1/auth/signup').send(body);
  };
  const createActeur = (token: string, body: any) => {
    resetThrottle();
    return request(app.getHttpServer()).post('/api/v1/auth/create-acteur').set('Authorization', `Bearer ${token}`).send(body);
  };
  const login = (phone: string, password: string) => {
    resetThrottle();
    return request(app.getHttpServer()).post('/api/v1/auth/login').send({ phone, password });
  };
  const countRole = async (role: string): Promise<number> =>
    (await ds.query('SELECT count(*)::int n FROM users WHERE role=$1', [role]))[0].n;
  const rejete = (status: number) => status >= 400 && status < 600; // rejet (403 réel, 500 sous le quirk)

  beforeAll(async () => {
    // Le harnais applique globalement des limiteurs stricts (~5/min sur toutes
    // les routes) ; on les neutralise pour que CHAQUE test reçoive la vraie
    // réponse du contrôle de sécurité (jamais un 429 masquant).
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    tokenSuperAdmin = await seedToken('+2250790000001', 'super_admin');
    tokenIdentificateur = await seedToken('+2250790000002', 'identificateur');
    tokenOperateur = await seedToken('+2250790000003', 'operateur_terrain');
  }, 60000);

  afterAll(async () => { if (app) await app.close(); });

  // ── M6 : inscription publique ────────────────────────────────────────
  it('M6 — signup public identificateur → REJETÉ, aucun identificateur créé par cette voie', async () => {
    const before = await countRole('identificateur');
    const r = await signup({ phone: '+2250790000010', firstName: 'A', lastName: 'B', role: 'identificateur', genre: 'homme' });
    expect(rejete(r.status)).toBe(true);
    expect(await countRole('identificateur')).toBe(before);
  }, 30000);

  it('M6 — signup public rôle administratif (admin_general) → REJETÉ (critère)', async () => {
    const before = await countRole('admin_general');
    const r = await signup({ phone: '+2250790000012', firstName: 'A', lastName: 'B', role: 'admin_general', genre: 'homme' });
    expect(rejete(r.status)).toBe(true);
    expect(await countRole('admin_general')).toBe(before);
  }, 30000);

  it('M6 — signup public marchand → accepté (non-régression)', async () => {
    expect([200, 201]).toContain((await signup({ phone: '+2250790000011', firstName: 'A', lastName: 'B', role: 'marchand', genre: 'femme' })).status);
  }, 30000);

  // ── M8 : autorité sur la création ────────────────────────────────────
  it('M8 — identificateur → super_admin → REJETÉ, aucun super_admin créé', async () => {
    const before = await countRole('super_admin');
    const r = await createActeur(tokenIdentificateur, { phone: '+2250790000020', firstName: 'E', lastName: 'A', role: 'super_admin', genre: 'homme' });
    expect(rejete(r.status)).toBe(true);
    expect(await countRole('super_admin')).toBe(before);
  }, 30000);

  it('M8 — identificateur → rôle administratif (admin_national) → REJETÉ', async () => {
    const before = await countRole('admin_national');
    const r = await createActeur(tokenIdentificateur, { phone: '+2250790000023', firstName: 'E', lastName: 'A', role: 'admin_national', genre: 'homme' });
    expect(rejete(r.status)).toBe(true);
    expect(await countRole('admin_national')).toBe(before);
  }, 30000);

  it('M8 — operateur_terrain → rôle administratif (admin_general) → REJETÉ', async () => {
    const before = await countRole('admin_general');
    const r = await createActeur(tokenOperateur, { phone: '+2250790000024', firstName: 'E', lastName: 'A', role: 'admin_general', genre: 'homme' });
    expect(rejete(r.status)).toBe(true);
    expect(await countRole('admin_general')).toBe(before);
  }, 30000);

  it('M8 — super_admin → super_admin via endpoint générique → REJETÉ (impossible)', async () => {
    const before = await countRole('super_admin');
    const r = await createActeur(tokenSuperAdmin, { phone: '+2250790000022', firstName: 'A', lastName: 'R', role: 'super_admin', genre: 'homme' });
    expect(rejete(r.status)).toBe(true);
    expect(await countRole('super_admin')).toBe(before);
  }, 30000);

  it('M8 — créations légitimes marchand / producteur / cooperateur → OK', async () => {
    expect([200, 201]).toContain((await createActeur(tokenIdentificateur, { phone: '+2250790000031', firstName: 'M', lastName: 'A', role: 'marchand', genre: 'femme' })).status);
    expect([200, 201]).toContain((await createActeur(tokenIdentificateur, { phone: '+2250790000032', firstName: 'P', lastName: 'B', role: 'producteur', genre: 'homme' })).status);
    expect([200, 201]).toContain((await createActeur(tokenIdentificateur, { phone: '+2250790000033', firstName: 'C', lastName: 'C', role: 'cooperateur', genre: 'homme' })).status);
  }, 30000);

  // ── M8 : compte admin créé = inactif (sans activation introduite) ────
  it('M8 — compte admin créé par super_admin naît INACTIF (login refusé)', async () => {
    const ADMIN_PHONE = '+2250790000030';
    expect([200, 201]).toContain((await createActeur(tokenSuperAdmin, { phone: ADMIN_PHONE, firstName: 'N', lastName: 'A', role: 'admin_national', genre: 'homme' })).status);
    expect(rejete((await login(ADMIN_PHONE, '123456')).status)).toBe(true); // login refusé tant qu'inactif
  }, 30000);

  // ── Preuve du 403 LITTÉRAL au niveau service (indépendant du quirk HTTP) ──
  it('appel DIRECT du service : refus (403) sur rôle interdit, accepté sur rôle autorisé', async () => {
    const svc = require('../../src/auth/auth.service');
    expect(typeof svc.assertRoleCreationAllowed).toBe('function');
    const err = (target: string, caller?: string) => {
      try { svc.assertRoleCreationAllowed(target, caller); return null; } catch (e) { return e as any; }
    };
    // Interdits → ForbiddenException (status 403)
    expect(err('super_admin', 'identificateur')?.status).toBe(403);
    expect(err('admin_general', 'operateur_terrain')?.status).toBe(403);
    expect(err('super_admin', 'super_admin')?.status).toBe(403);     // endpoint générique
    expect(err('identificateur', undefined)?.status).toBe(403);       // public : rôle privilégié
    // Autorisés → aucune exception
    expect(err('marchand', 'identificateur')).toBeNull();
    expect(err('marchand', undefined)).toBeNull();                    // public : acteur OK
    expect(err('admin_national', 'super_admin')).toBeNull();          // super_admin peut créer un BO (inactif)
  }, 30000);
});
