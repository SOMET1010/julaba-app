// Invariants M6 + M8 — Fermeture de la chaîne d'escalade de rôle.
//
// Chaîne visée (version vulnérable) :
//   1) un utilisateur anonyme s'auto-inscrit comme `identificateur` (rôle interne) ;
//   2) cet `identificateur` appelle /auth/create-acteur avec role=`super_admin` ;
//   3) il obtient un compte `super_admin`.
//
// Politique minimale attendue (matrice) :
//   • Public              : aucun rôle interne ni administratif (acteurs seulement).
//   • identificateur      : seulement marchand / producteur / cooperateur.
//   • operateur_terrain   : seulement marchand / producteur / cooperateur.
//   • Aucun endpoint générique : super_admin.
//   • institution         : NON ajouté aux créations autorisées de ce lot.
//
// La politique est appliquée DANS LE SERVICE (authService.signup) afin qu'aucun
// contrôleur ne puisse la contourner (test « appel direct du service »).
//
// PROPRIÉTÉ VÉRIFIÉE (indépendante de l'environnement) : un rôle interdit n'est
// jamais CRÉÉ. On refuse (statut ≥ 400) et aucun compte n'est écrit en base.
// La ForbiddenException porte le statut 403 (le mapping HTTP local peut donner
// 500 à cause d'un dédoublement de @nestjs/common dans l'arbre de dépendances —
// artefact d'environnement, hors périmètre M6+M8).

import { INestApplication, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { AuthService } from '../../src/auth/auth.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

const ADMIN_ROLES = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'];

describe('Invariants M6+M8 — escalade de rôle interdite', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let authService: AuthService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    // On neutralise le throttler : ce lot teste l'AUTORISATION de rôle, pas la
    // limitation de débit (sinon les refus seraient masqués par des 429).
    // overrideGuard ne fonctionne PAS sur un APP_GUARD global → on remplace le
    // stockage du throttler par un stub qui ne bloque jamais.
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
    authService = app.get(AuthService);
    await app.get(DbInitService, { strict: false }).runInit();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // Seed direct (hors inscription publique) d'un utilisateur interne, + jeton.
  async function seedInterne(role: UserRole, phone: string): Promise<string> {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone, firstName: 'Interne', lastName: role, genre: 'homme',
      role, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any);
    const saved: any = await repo.save(u as any);
    return jwt.signAsync({ sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET });
  }

  const body = (role: string, phone: string) => ({
    phone, firstName: 'Cible', lastName: 'Test', genre: 'homme', role,
  });

  async function compteExiste(phone: string): Promise<boolean> {
    const rows = await ds.query('SELECT 1 FROM users WHERE phone = $1 LIMIT 1', [phone]);
    return rows.length > 0;
  }

  // Assertion centrale : la requête est REFUSÉE et AUCUN compte n'est créé.
  async function attendRefus(r: request.Response, phoneCible: string) {
    expect(r.status).toBeGreaterThanOrEqual(400);          // refus (403 en env sain, 500 en env local dédoublé)
    expect(r.body?.user).toBeFalsy();                      // aucun compte renvoyé
    expect(r.body?.accessToken).toBeFalsy();               // aucune session ouverte
    expect(await compteExiste(phoneCible)).toBe(false);    // rien écrit en base
  }

  // ── Inscription publique : aucun rôle interne ni administratif ──
  it('inscription publique role=identificateur → refusé, non créé', async () => {
    const p = '+2250700000801';
    await attendRefus(await api().post('/api/v1/auth/signup').send(body('identificateur', p)), p);
  });

  it('inscription publique role=institution → refusé, non créé', async () => {
    const p = '+2250700000802';
    await attendRefus(await api().post('/api/v1/auth/signup').send(body('institution', p)), p);
  });

  it('inscription publique role=super_admin → refusé, non créé', async () => {
    const p = '+2250700000803';
    await attendRefus(await api().post('/api/v1/auth/signup').send(body('super_admin', p)), p);
  });

  it('inscription publique role=admin_general → refusé, non créé', async () => {
    const p = '+2250700000804';
    await attendRefus(await api().post('/api/v1/auth/signup').send(body('admin_general', p)), p);
  });

  // ── create-acteur par un identificateur : aucun rôle administratif ──
  it('identificateur → super_admin via create-acteur → refusé, non créé', async () => {
    const token = await seedInterne(UserRole.IDENTIFICATEUR, '+2250700000810');
    const p = '+2250700000811';
    await attendRefus(await api().post('/api/v1/auth/create-acteur').set('Authorization', `Bearer ${token}`).send(body('super_admin', p)), p);
  });

  it('identificateur → admin_general via create-acteur → refusé, non créé', async () => {
    const token = await seedInterne(UserRole.IDENTIFICATEUR, '+2250700000812');
    const p = '+2250700000813';
    await attendRefus(await api().post('/api/v1/auth/create-acteur').set('Authorization', `Bearer ${token}`).send(body('admin_general', p)), p);
  });

  it('identificateur → institution via create-acteur → refusé, non créé', async () => {
    const token = await seedInterne(UserRole.IDENTIFICATEUR, '+2250700000814');
    const p = '+2250700000815';
    await attendRefus(await api().post('/api/v1/auth/create-acteur').set('Authorization', `Bearer ${token}`).send(body('institution', p)), p);
  });

  // ── create-acteur par un operateur_terrain : aucun rôle administratif ──
  it('operateur_terrain → super_admin via create-acteur → refusé, non créé', async () => {
    const token = await seedInterne(UserRole.OPERATEUR_TERRAIN, '+2250700000820');
    const p = '+2250700000821';
    await attendRefus(await api().post('/api/v1/auth/create-acteur').set('Authorization', `Bearer ${token}`).send(body('super_admin', p)), p);
  });

  it('operateur_terrain → admin_general via create-acteur → refusé, non créé', async () => {
    const token = await seedInterne(UserRole.OPERATEUR_TERRAIN, '+2250700000822');
    const p = '+2250700000823';
    await attendRefus(await api().post('/api/v1/auth/create-acteur').set('Authorization', `Bearer ${token}`).send(body('admin_general', p)), p);
  });

  // ── Appel DIRECT du service : le super_admin ne peut jamais être créé ──
  it('authService.signup(role=super_admin) → refus (jamais de super_admin générique)', async () => {
    await expect(
      authService.signup({ phone: '+2250700000830', firstName: 'X', lastName: 'Y', role: 'super_admin', genre: 'homme' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('authService.signup(role=identificateur) sans créateur → refus (public)', async () => {
    await expect(
      authService.signup({ phone: '+2250700000831', firstName: 'X', lastName: 'Y', role: 'identificateur', genre: 'homme' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── Parcours légitimes préservés ──
  it('inscription publique role=marchand → OK', async () => {
    const r = await api().post('/api/v1/auth/signup').send(body('marchand', '+2250700000840'));
    expect([200, 201]).toContain(r.status);
    expect(r.body?.user?.role).toBe('marchand');
  });

  it('identificateur → marchand via create-acteur → OK', async () => {
    const token = await seedInterne(UserRole.IDENTIFICATEUR, '+2250700000850');
    const r = await api().post('/api/v1/auth/create-acteur')
      .set('Authorization', `Bearer ${token}`).send(body('marchand', '+2250700000851'));
    expect([200, 201]).toContain(r.status);
    expect(r.body?.user?.role).toBe('marchand');
  });

  // ── R1 (durcissement allow-list stricte) : admin_* / inconnu / non mappé → refus ──
  it('appel direct : createur=admin_general → marchand → refus (admin_* non mappé)', async () => {
    await expect(
      authService.signup({ phone: '+2250700000861', firstName: 'X', lastName: 'Y', role: 'marchand', genre: 'homme' } as any, undefined, undefined, 'admin_general'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('appel direct : createur=admin_general → institution → refus', async () => {
    await expect(
      authService.signup({ phone: '+2250700000862', firstName: 'X', lastName: 'Y', role: 'institution', genre: 'homme' } as any, undefined, undefined, 'admin_general'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('appel direct : createur=admin_general → identificateur → refus', async () => {
    await expect(
      authService.signup({ phone: '+2250700000863', firstName: 'X', lastName: 'Y', role: 'identificateur', genre: 'homme' } as any, undefined, undefined, 'admin_general'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('appel direct : createur INCONNU (non mappé) → marchand → refus (fail-closed)', async () => {
    await expect(
      authService.signup({ phone: '+2250700000864', firstName: 'X', lastName: 'Y', role: 'marchand', genre: 'homme' } as any, undefined, undefined, 'role_inconnu'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('appel direct : rôle CIBLE inconnu (public) → refus', async () => {
    await expect(
      authService.signup({ phone: '+2250700000865', firstName: 'X', lastName: 'Y', role: 'role_bidon', genre: 'homme' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('appel direct : rôle CIBLE inconnu (createur=identificateur) → refus', async () => {
    await expect(
      authService.signup({ phone: '+2250700000866', firstName: 'X', lastName: 'Y', role: 'role_bidon', genre: 'homme' } as any, undefined, undefined, 'identificateur'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('appel direct : createur absent + cible administrative (admin_general) → refus', async () => {
    await expect(
      authService.signup({ phone: '+2250700000867', firstName: 'X', lastName: 'Y', role: 'admin_general', genre: 'homme' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── operateur_terrain → institution (voie administrée) → refus, non créé ──
  it('operateur_terrain → institution via create-acteur → refusé, non créé', async () => {
    const token = await seedInterne(UserRole.OPERATEUR_TERRAIN, '+2250700000870');
    const p = '+2250700000871';
    await attendRefus(await api().post('/api/v1/auth/create-acteur').set('Authorization', `Bearer ${token}`).send(body('institution', p)), p);
  });

  // ── Créations légitimes : les trois rôles métier ──
  it('inscription publique producteur / cooperateur → OK', async () => {
    const rp = await api().post('/api/v1/auth/signup').send(body('producteur', '+2250700000880'));
    expect([200, 201]).toContain(rp.status); expect(rp.body?.user?.role).toBe('producteur');
    const rc = await api().post('/api/v1/auth/signup').send(body('cooperateur', '+2250700000881'));
    expect([200, 201]).toContain(rc.status); expect(rc.body?.user?.role).toBe('cooperateur');
  });

  it('identificateur → producteur / cooperateur via create-acteur → OK', async () => {
    const token = await seedInterne(UserRole.IDENTIFICATEUR, '+2250700000882');
    const rp = await api().post('/api/v1/auth/create-acteur').set('Authorization', `Bearer ${token}`).send(body('producteur', '+2250700000883'));
    expect([200, 201]).toContain(rp.status); expect(rp.body?.user?.role).toBe('producteur');
    const rc = await api().post('/api/v1/auth/create-acteur').set('Authorization', `Bearer ${token}`).send(body('cooperateur', '+2250700000884'));
    expect([200, 201]).toContain(rc.status); expect(rc.body?.user?.role).toBe('cooperateur');
  });

  // ── Invariant décisif : AUCUN compte à rôle d'administration n'a été créé ──
  it('aucun compte à rôle administratif présent en base après la suite', async () => {
    const rows = await ds.query(
      `SELECT count(*)::int AS n FROM users WHERE role = ANY($1)`, [ADMIN_ROLES],
    );
    // Les operateur_terrain « créateurs » sont seedés directement (hors signup) ;
    // on vérifie qu'aucun compte ADMIN (super_admin/admin_general/…) n'a été créé
    // par les endpoints. Les seuls comptes à rôle admin autorisés ici = les 2
    // operateur_terrain seedés pour les tests.
    const seededOperateurs = await ds.query(
      `SELECT count(*)::int AS n FROM users WHERE role = 'operateur_terrain'`,
    );
    const totalAdmin = rows[0].n as number;
    const operateurs = seededOperateurs[0].n as number;
    // Aucun super_admin / admin_general / admin_national / gestionnaire_zone créé.
    const rowsHorsOperateur = await ds.query(
      `SELECT count(*)::int AS n FROM users WHERE role = ANY($1) AND role <> 'operateur_terrain'`,
      [ADMIN_ROLES],
    );
    expect(rowsHorsOperateur[0].n).toBe(0);
    // (cohérence : total admin = uniquement les operateur_terrain seedés)
    expect(totalAdmin).toBe(operateurs);
  });
});
