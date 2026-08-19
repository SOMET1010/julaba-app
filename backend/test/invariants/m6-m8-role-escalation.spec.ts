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
// PROPRIÉTÉ VÉRIFIÉE : un rôle interdit n'est jamais CRÉÉ — on refuse et aucun
// compte n'est écrit en base. Depuis l'alignement des versions @nestjs (lot
// « contrat HTTP NestJS »), la ForbiddenException ressort au vrai statut HTTP
// 403 : les assertions sont désormais promues à `toBe(403)` (plus de 500).
//
// NOTE SUR L'INVARIANT FINAL (robustesse à l'ordre d'exécution) :
// `jest --runInBand` n'exécute pas les fichiers de *.spec.ts dans un ordre
// garanti. Plusieurs AUTRES fichiers de test du dossier `invariants/` seedent
// légitimement des comptes admin (super_admin/admin_general/…) pour tester
// des endpoints back-office, et ne les nettoient pas toujours en `afterAll`.
// Si l'un de ces fichiers s'exécute AVANT celui-ci, un test qui vérifierait
// « zéro compte admin dans TOUTE la base » échouerait à tort (faux négatif),
// alors qu'aucune escalade n'a eu lieu ICI. L'invariant final compare donc un
// DELTA (comptes admin présents avant vs après CETTE suite), pas un total
// absolu : c'est la même garantie de sécurité, mais indépendante du bruit
// laissé par d'autres fichiers et de l'ordre dans lequel Jest les choisit.

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

// Rôles réellement « administratifs » au sens de M6+M8 : ceux que ce lot
// interdit de créer via /auth/signup et /auth/create-acteur. `operateur_terrain`
// n'y figure PAS : ce fichier seed lui-même des comptes `operateur_terrain`
// (rôle interne légitime, cf. `seedInterne` ci-dessous) pour jouer le rôle de
// « créateur » dans les scénarios d'escalade — ce n'est pas ce que l'invariant
// final surveille.
const ROLES_ADMINISTRATIFS_INTERDITS = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone'];

describe('Invariants M6+M8 — escalade de rôle interdite', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let authService: AuthService;
  // Snapshot des comptes admin déjà présents en base AVANT que cette suite ne
  // joue le moindre scénario (seedés par DbInitService.runInit() et/ou laissés
  // par d'autres fichiers *.spec.ts exécutés plus tôt par Jest). C'est le
  // « bruit » de référence contre lequel on mesure un delta, pas un absolu.
  let idsAdminAvant: Set<string>;
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

    // Snapshot AVANT tout test de cette suite : quels comptes admin existent
    // déjà (seed d'init applicatif, résidus d'autres fichiers de test…).
    const rowsAvant = await ds.query(
      `SELECT id FROM users WHERE role = ANY($1)`, [ROLES_ADMINISTRATIFS_INTERDITS],
    );
    idsAdminAvant = new Set(rowsAvant.map((r: any) => r.id));
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
    expect(r.status).toBe(403);                            // refus d'autorisation = 403 (contrat HTTP réel)
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

  // ── Invariant décisif : AUCUN NOUVEAU compte à rôle administratif n'est
  //    apparu pendant cette suite (delta, pas un total absolu — cf. la note
  //    en tête de fichier sur la robustesse à l'ordre d'exécution de Jest).
  it('aucun NOUVEAU compte à rôle administratif créé pendant la suite', async () => {
    const rowsApres = await ds.query(
      `SELECT id FROM users WHERE role = ANY($1)`, [ROLES_ADMINISTRATIFS_INTERDITS],
    );
    const idsNouveaux = rowsApres
      .map((r: any) => r.id as string)
      .filter((id: string) => !idsAdminAvant.has(id));
    // Propriété testée : les endpoints /auth/signup et /auth/create-acteur
    // n'ont créé AUCUN compte super_admin/admin_general/admin_national/
    // gestionnaire_zone pendant l'exécution de cette suite — quel que soit le
    // nombre de comptes admin déjà présents en base avant qu'elle ne démarre
    // (bruit laissé par d'autres fichiers de test, dans un ordre que Jest ne
    // garantit pas). Comparer un delta plutôt qu'un total absolu rend cet
    // invariant indépendant de cet ordre, sans affaiblir la garantie.
    expect(idsNouveaux).toEqual([]);
  });
});
