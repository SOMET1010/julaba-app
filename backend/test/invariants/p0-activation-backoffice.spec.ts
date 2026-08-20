// Invariant P0.0 — chemin BACK-OFFICE (ADR-002), jumeau de p0-activation.spec.ts.
//
// Contexte (audit) : POST /users/backoffice/create (backoffice-users.service.ts)
// posait `status = ACTIF` + mot de passe CONSTANT '0000' pour tout acteur
// non-admin (marchand/producteur/cooperateur/institution/identificateur) —
// exactement l'exploit de masse que P0.0 ferme sur `create-with-acteur`
// (« quiconque connaît le numéro » pouvait se connecter avant que l'acteur
// n'ait rien choisi lui-même). Ce lot applique le MÊME modèle P0.0 à ce
// chemin : le compte naît en_attente_activation, non-loginable, et n'est
// activable que via le code d'activation à usage unique émis par le MÊME
// ActivationService que create-with-acteur (Constitution §1 : une seule
// implémentation).
//
// PROPRIÉTÉS VÉRIFIÉES (au niveau HTTP, comme bo-communication-send-bulk.spec.ts) :
//  1) POST /users/backoffice/create sur un rôle non-admin ne renvoie JAMAIS de
//     mot de passe exploitable ; le compte créé est en_attente_activation.
//  2) login({numéro, '0000'}) sur ce compte fraîchement créé → REJETÉ (le
//     takeover de masse, réintroduit par ce chemin, est refermé).
//  3) Le code d'activation renvoyé par ce chemin fonctionne réellement de
//     bout en bout via POST /auth/activer (même service, mêmes garanties :
//     usage unique, expiration — déjà prouvées par p0-activation.spec.ts au
//     niveau service ; on prouve ici que ce chemin les hérite sans les
//     contourner).
//  4) La création d'un compte ADMIN par un super_admin (cas légitimement
//     exempté, documenté dans backoffice-users.service.ts) n'est PAS cassée
//     par ce lot : mot de passe réel renvoyé, compte ACTIF immédiatement.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';
import { AuthService } from '../../src/auth/auth.service';

describe('Invariant P0.0 (back-office) — POST /users/backoffice/create ne réintroduit plus le takeover 0000', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let authService: AuthService;
  const api = () => request(app.getHttpServer());

  const SUPER_ADMIN_PHONE = '+2250750100001';
  const MARCHAND_PHONE = '+2250750100002';
  const ADMIN_CREE_PHONE = '+2250750100003';
  const MARCHAND_REJEU_PHONE = '+2250750100004';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }),
      })
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
    // LIKE : couvre aussi les variantes SUPER_ADMIN_PHONE + '9' / + '8' utilisées
    // pour éviter les collisions de numéro unique entre les `it()` de ce fichier.
    await ds.query(`DELETE FROM users WHERE phone LIKE '+2250750100%'`).catch(() => undefined);
    if (app) await app.close();
  });

  async function seedSuperAdmin(phone: string): Promise<{ token: string; id: string }> {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone,
      firstName: 'Super',
      lastName: 'Admin',
      genre: 'femme',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('123456', 10),
    } as any);
    const saved: any = await repo.save(u as any);
    const token = await jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
    return { token, id: saved.id };
  }

  it('marchand créé via le BO : AUCUN mot de passe exploitable renvoyé, compte en_attente_activation', async () => {
    const superAdmin = await seedSuperAdmin(SUPER_ADMIN_PHONE);

    const res = await api()
      .post('/api/v1/users/backoffice/create')
      .set('Authorization', `Bearer ${superAdmin.token}`)
      .send({
        firstName: 'Awa',
        lastName: 'Marchande',
        phone: MARCHAND_PHONE,
        role: 'marchand',
        sousProfilMarchand: 'detaillant',
      });

    expect(res.status).toBe(201);
    // RÉGRESSION VISÉE : ne doit plus jamais renvoyer un mot de passe constant
    // ('0000') exploitable, ni prétendre que le compte est déjà utilisable.
    expect(res.body.defaultPassword).toBeUndefined();
    expect(res.body.motDePasseInitial).toBeUndefined();
    expect(typeof res.body.activationCode).toBe('string');
    expect(res.body.activationCode.length).toBeGreaterThan(10);
    expect(res.body.status).toBe(UserStatus.EN_ATTENTE_ACTIVATION);

    const created = await ds.getRepository(User).findOne({ where: { phone: MARCHAND_PHONE } });
    expect(created).toBeDefined();
    expect(created!.status).toBe(UserStatus.EN_ATTENTE_ACTIVATION);
  });

  it('login {numéro, 0000} sur un compte fraîchement créé par le BO → REJETÉ (le takeover de masse reste mort)', async () => {
    // Le compte MARCHAND_PHONE a été créé par le test précédent (même describe,
    // exécution séquentielle Jest par défaut au sein d'un même fichier).
    await expect(
      authService.login({ phone: MARCHAND_PHONE, password: '0000' } as any),
    ).rejects.toBeDefined();

    // Confirme aussi côté HTTP (mapping complet, pas seulement l'exception service).
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ phone: MARCHAND_PHONE, password: '0000' });
    expect(res.status).toBe(401);
  });

  it('le code d’activation émis par le chemin BO active réellement le compte via POST /auth/activer (bout en bout)', async () => {
    const superAdmin = await seedSuperAdmin(SUPER_ADMIN_PHONE + '9'); // évite collision unique-phone si tests réordonnés
    const createRes = await api()
      .post('/api/v1/users/backoffice/create')
      .set('Authorization', `Bearer ${superAdmin.token}`)
      .send({
        firstName: 'Fatou',
        lastName: 'Productrice',
        phone: MARCHAND_REJEU_PHONE,
        role: 'producteur',
      });
    expect(createRes.status).toBe(201);
    const code = createRes.body.activationCode as string;
    expect(typeof code).toBe('string');

    // Avant activation : inerte.
    const before = await ds.getRepository(User).findOne({ where: { phone: MARCHAND_REJEU_PHONE } });
    expect(before!.status).toBe(UserStatus.EN_ATTENTE_ACTIVATION);

    // Activation réelle avec un secret choisi par l'acteur (jamais '0000'/'1234').
    const activerRes = await api()
      .post('/api/v1/auth/activer')
      .send({ code, nouveauSecret: '7531' });
    expect(activerRes.status).toBe(200);
    expect(activerRes.body).toMatchObject({ success: true });

    const after = await ds.getRepository(User).findOne({ where: { phone: MARCHAND_REJEU_PHONE } });
    expect(after!.status).toBe(UserStatus.ACTIF);

    // Le secret choisi fonctionne ; '0000' (le mot de passe jeté à la création) non.
    await expect(
      authService.login({ phone: MARCHAND_REJEU_PHONE, password: '7531' } as any),
    ).resolves.toBeDefined();
    await expect(
      authService.login({ phone: MARCHAND_REJEU_PHONE, password: '0000' } as any),
    ).rejects.toBeDefined();

    // USAGE UNIQUE hérité du même ActivationService (pas de logique dupliquée,
    // pas de contournement de la garantie anti-rejeu) : le même code rejoué échoue.
    const rejeuRes = await api()
      .post('/api/v1/auth/activer')
      .send({ code, nouveauSecret: '9999' });
    expect(rejeuRes.status).toBe(401);
  });

  it('exemption documentée : compte ADMIN créé par un super_admin reste ACTIF avec mot de passe réel (non cassé par ce lot)', async () => {
    const superAdmin = await seedSuperAdmin(SUPER_ADMIN_PHONE + '8');
    const res = await api()
      .post('/api/v1/users/backoffice/create')
      .set('Authorization', `Bearer ${superAdmin.token}`)
      .send({
        firstName: 'Koffi',
        lastName: 'Admin',
        phone: ADMIN_CREE_PHONE,
        role: 'operateur_terrain',
        email: 'koffi.admin.p0test@example.com',
        zoneIdOptional: undefined,
      });

    expect(res.status).toBe(201);
    expect(typeof res.body.defaultPassword).toBe('string');
    expect(res.body.defaultPassword).not.toBe('0000');
    expect(res.body.activationCode).toBeUndefined();
    expect(res.body.status).toBe(UserStatus.ACTIF);

    const created = await ds.getRepository(User).findOne({ where: { phone: ADMIN_CREE_PHONE } });
    expect(created!.status).toBe(UserStatus.ACTIF);
  });
});
