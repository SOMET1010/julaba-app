// IDENT-05 — LE PIN SERVEUR SUR LES ÉCRITURES PII DE L'IDENTIFICATEUR.
// (plan d'action audit workflow officiel §5 item 11, 20/10/2026)
//
// L'identificateur modifie la PII des acteurs de sa zone (numCNPS, numCMU,
// dateNaissance, photo…) via PATCH /users/:id. La re-vérification du PIN ne
// vivait que dans l'ÉCRAN (POST /auth/identificateur/me/verify-pin) : un
// attaquant avec la session ouverte (téléphone volé) appelait le PATCH
// directement, sans PIN — IDENTIFICATEUR-02 du 19/10 restait valable.
//
// Correctif : la vérification est SERVEUR, à chaque écriture PII hors self,
// avec l'échelle de verrou (verrou-pin.ts : 3 échecs → 5 min, 6 → 15 min,
// 9+ → 1 h, jamais définitif) et les colonnes dédiées du PIN identificateur.
// L'arbitrage « 4 chiffres, alphabet 2-9 » tient PARCE QUE ce chemin est
// verrouillé (cf. pin-identificateur.ts).
//
// Propriétés vérifiées (🟢 attendu) :
//  - IDENT-05-a : PATCH PII SANS pin → 401, aucune écriture.
//  - IDENT-05-b : PIN FAUX → 401, aucune écriture ; au 3ᵉ échec l'attente
//    tombe (verrou 5 min) — le compteur n'est remis à zéro QUE par un PIN juste.
//  - IDENT-05-c : BON PIN → 200, la PII est modifiée, le compteur remis à 0.
//  - IDENT-05-d : l'identificateur modifie SON profil SANS pin → 200 (le
//    verrou ne s'applique qu'aux fiches d'AUTRUI).
//  - IDENT-05-e : un compte BO modifie la PII SANS pin → 200 (habilitation
//    serveur, pas de péage inutile).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ThrottlerStorage } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { PinCryptoService } from '../../src/auth/pin-crypto.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

const ZONE = '4a111111-4111-4111-8111-111111111111'; // uuid v4
const PIN = '4567';

describe('Invariant IDENT-05 — le PIN serveur garde la PII des acteurs', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let pinCrypto: PinCryptoService;
  let tokenIdentif: string;
  let tokenAdmin: string;
  let identifId: string;
  let acteurId: string;

  const api = () => request(app.getHttpServer());

  const patchPii = (token: string, body: Record<string, unknown>) =>
    api().patch(`/api/v1/users/${acteurId}`).set('Authorization', `Bearer ${token}`).send(body);

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
    pinCrypto = app.get(PinCryptoService);
    await app.get(DbInitService, { strict: false }).runInit();

    const repo = ds.getRepository(User);
    await ds.query(`INSERT INTO zones (id, nom, ville, actif) VALUES ($1,'Zone PIN','Yamoussoukro',true)`, [ZONE]);

    // L'identificateur, avec son PIN chiffré (le même mécanisme que le BO).
    const identif: any = await repo.save(repo.create({
      phone: '+2250700020601', firstName: 'Idrissa', lastName: 'PinPII', genre: 'homme',
      role: UserRole.IDENTIFICATEUR, status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('1234', 10), zoneId: ZONE,
    } as any));
    identifId = identif.id;
    await repo.update(identifId, {
      pinCodeEncryptedIdentificateur: pinCrypto.encrypt(PIN),
      failedIdentificateurPinAttempts: 0,
    } as any);
    tokenIdentif = await jwt.signAsync(
      { sub: identifId, phone: identif.phone, role: identif.role },
      { secret: process.env.JWT_SECRET },
    );

    // L'acteur de la zone (dont la PII sera modifiée).
    const acteur: any = await repo.save(repo.create({
      phone: '+2250700020602', firstName: 'Adjoua', lastName: 'Acteur', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('1234', 10), zoneId: ZONE,
      numCNPS: 'OLD-000',
    } as any));
    acteurId = acteur.id;

    // Un compte BO (habilitation serveur, pas de PIN pour lui).
    const admin: any = await repo.save(repo.create({
      phone: '+2250700020603', firstName: 'Admin', lastName: 'PinPII', genre: 'homme',
      role: UserRole.ADMIN_GENERAL, status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    tokenAdmin = await jwt.signAsync(
      { sub: admin.id, phone: admin.phone, role: admin.role },
      { secret: process.env.JWT_SECRET },
    );
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const numCNPSActuel = async (): Promise<string> =>
    (await ds.query('SELECT num_cnps FROM users WHERE id = $1', [acteurId]))[0]?.num_cnps;

  it('IDENT-05-a : PATCH PII SANS pin → 401, aucune écriture', async () => {
    const r = await patchPii(tokenIdentif, { numCNPS: 'NEW-111' });
    expect(r.status).toBe(401);
    expect(await numCNPSActuel()).toBe('OLD-000');
  });

  it('IDENT-05-b : PIN FAUX → 401 ; au 3ᵉ échec l\u2019attente tombe (verrou)', async () => {
    const r1 = await patchPii(tokenIdentif, { numCNPS: 'NEW-111', pin: '9999' });
    expect(r1.status).toBe(401);
    expect(await numCNPSActuel()).toBe('OLD-000');

    const r2 = await patchPii(tokenIdentif, { numCNPS: 'NEW-111', pin: '9999' });
    expect(r2.status).toBe(401);
    // 3ᵉ échec : le palier tombe — 5 minutes d'attente annoncées.
    const r3 = await patchPii(tokenIdentif, { numCNPS: 'NEW-111', pin: '9999' });
    expect(r3.status).toBe(401);
    expect(String(r3.body?.message || '')).toMatch(/minute/i);
    expect(await numCNPSActuel()).toBe('OLD-000');
  });

  it('IDENT-05-c : BON PIN → 200, PII modifiée, compteur remis à zéro', async () => {
    // Le verrou de 3 échecs est posé par le test précédent : on simule l'écoulement
    // (l'échelle est un palier serveur, pas un mur) en repoussant lockedUntil au passé.
    await ds.query(
      `UPDATE users SET identificateur_pin_locked_until = NOW() - INTERVAL '1 minute' WHERE id = $1`,
      [identifId],
    );
    const r = await patchPii(tokenIdentif, { numCNPS: 'NEW-222', pin: PIN });
    expect(r.status).toBe(200);
    expect(await numCNPSActuel()).toBe('NEW-222');

    const row = (await ds.query(
      'SELECT failed_identificateur_pin_attempts, identificateur_pin_locked_until FROM users WHERE id = $1',
      [identifId],
    ))[0];
    expect(Number(row.failed_identificateur_pin_attempts)).toBe(0);
    expect(row.identificateur_pin_locked_until).toBeNull();
  });

  it('IDENT-05-d : l\u2019identificateur modifie SON profil sans pin → 200', async () => {
    const r = await api()
      .patch(`/api/v1/users/${identifId}`)
      .set('Authorization', `Bearer ${tokenIdentif}`)
      .send({ numCNPS: 'SELF-OK' });
    expect(r.status).toBe(200);
  });

  it('IDENT-05-e : un compte BO modifie la PII sans pin → 200', async () => {
    const r = await patchPii(tokenAdmin, { numCNPS: 'BO-OK' });
    expect(r.status).toBe(200);
    expect(await numCNPSActuel()).toBe('BO-OK');
  });
});
