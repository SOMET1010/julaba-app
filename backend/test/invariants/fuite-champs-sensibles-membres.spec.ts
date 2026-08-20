// Invariant Sécurité — GET /cooperatives/membres ne doit JAMAIS renvoyer les
// champs d'authentification sensibles de l'entité User (passwordHash,
// pinCodeHash, pinCodeEncryptedIdentificateur, webauthnCredentials,
// webauthnChallenge) : un hash exposé côté client est attaquable hors ligne
// (brute-force). Trouvé par audit — corrigé dans
// backend/src/cooperatives-rest/cooperatives-rest.controller.ts (méthode
// `membres`), via `stripSensitiveUserFields` (backend/src/users/sanitize-user.util.ts).
//
// Propriétés attendues (🟢) :
//  - aucun des champs sensibles n'apparaît dans la réponse JSON pour un
//    membre, quel que soit son état de sécurité (PIN configuré, WebAuthn
//    enregistré) ;
//  - le score Jùlaba par membre (PR #194) continue de fonctionner sans
//    régression : le champ `scoreJulaba` reste présent et numérique.
//
// Même passe de correctif, même nature de bug — vérifiée ici aussi :
//  - GET /acteurs et GET /acteurs/:id (backend/src/acteurs-rest/acteurs-rest.controller.ts)
//    ne renvoyaient AUCUN filtrage de l'entité User brute.
//
// ── Fuite résiduelle (lot suivant) ──────────────────────────────────────────
// Le correctif ci-dessus n'avait PAS été étendu à deux endpoints réels,
// trouvés par une recette end-to-end en HTTP réel :
//  - GET /auth/me (AuthController.me) — appelait userRepo.findOne(...) et
//    renvoyait l'entité brute, SANS passer par stripSensitiveUserFields.
//  - GET /wallets/me (WalletsService.getByUserId) — chargeait la relation
//    `user` du wallet en eager join et la renvoyait telle quelle.
// Cause racine : aucun ClassSerializerInterceptor n'était enregistré
// globalement (backend/src/main.ts) — les décorateurs @Exclude() posés sur
// l'entité User étaient donc inertes, seule la sanitisation manuelle
// protégeait réellement. Corrigé par :
//  1. stripSensitiveUserFields appliqué dans AuthController.me et
//     WalletsService.getByUserId (même pattern que UsersService/AuthService).
//  2. @Exclude() ajouté sur webauthnCredentials/webauthnChallenge (seuls
//     passwordHash/pinCodeHash/pinCodeEncryptedIdentificateur l'avaient).
//  3. ClassSerializerInterceptor enregistré globalement dans main.ts, en
//     PLUS de la sanitisation manuelle (filet de sécurité en profondeur, pas
//     un remplacement — les objets JSON bruts construits à la main n'ont pas
//     de décorateurs et ne sont pas concernés par cet interceptor).
// Trouvé dans la même recette, sans rapport avec la fuite mais corrigé dans
// le même lot : POST /cooperatives renvoyait un 500 brut (contrainte unique
// responsable_id violée) au lieu d'un refus propre — voir le describe dédié
// en bas de ce fichier.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

const SENSITIVE_FIELDS = [
  'passwordHash',
  'pinCodeHash',
  'pinCodeEncryptedIdentificateur',
  'webauthnCredentials',
  'webauthnChallenge',
];

describe('Invariant Sécurité — aucun champ sensible User dans les réponses REST (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let presidentToken: string;
  let superAdminToken: string;
  let marchandId: string;
  let marchandToken: string;

  // Préfixe de sprint dédié à ce fichier — jamais réutilisé ailleurs dans
  // backend/test/invariants/*.spec.ts (vérifié via
  // `grep -rhoE "\+2250[0-9]{9}" backend/test/invariants/*.spec.ts | sort -u`
  // avant écriture) pour éviter toute collision d'unicité `phone` entre
  // fichiers exécutés dans la même base jetable (--runInBand).
  const PHONE_PRESIDENT = '+2250796500001';
  const PHONE_MARCHAND = '+2250796500002';
  const PHONE_SUPER_ADMIN = '+2250796500003';

  const signup = async (phone: string, role: string, firstName: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone, firstName, lastName: 'FuiteTest', role, genre: 'femme' });
    expect([200, 201]).toContain(res.status);
    const token = res.body.accessToken as string;
    // Mot de passe acteur par défaut « 0000 » + mustChangePassword=true : la
    // garde JWT bloque tout sauf change-password tant qu'il n'est pas levé.
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
    return { token, id: res.body.user.id as string };
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    // signup role=cooperateur crée AUTOMATIQUEMENT la coopérative du président
    // (responsable_id = son id) — cf. AuthService.signup.
    const president = await signup(PHONE_PRESIDENT, 'cooperateur', 'Fatou');
    presidentToken = president.token;

    const marchand = await signup(PHONE_MARCHAND, 'marchand', 'Ibrahim');
    marchandId = marchand.id;
    marchandToken = marchand.token;

    // L'inscription publique refuse les rôles à privilèges (cf.
    // AuthController.signup : ForbiddenException si role hors ACTEUR_ROLES) —
    // on crée donc un compte acteur ordinaire puis on le promeut super_admin
    // directement en base, uniquement pour obtenir un token autorisé à
    // interroger GET /acteurs dans ce test.
    await signup(PHONE_SUPER_ADMIN, 'producteur', 'Admin');
    await ds.query(`UPDATE users SET role = 'super_admin', validated = true WHERE phone = $1`, [
      PHONE_SUPER_ADMIN,
    ]);
    const superAdminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ phone: PHONE_SUPER_ADMIN, password: '1234' });
    expect(superAdminLogin.status).toBe(200);
    superAdminToken = superAdminLogin.body.accessToken;

    // Le président ajoute le marchand comme membre de sa coopérative.
    const addRes = await request(app.getHttpServer())
      .post('/api/v1/cooperatives/membres')
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({ marchand_id: marchandId, role_membre: 'membre' });
    expect(addRes.status).toBe(201);
    expect(addRes.body.success).toBe(true);

    // Le marchand configure un PIN ET enregistre un credential WebAuthn en
    // base directement (pas de flux navigateur en test) : le test doit
    // prouver que MÊME quand ces champs sont réellement remplis pour ce
    // membre, ils ne fuitent jamais dans la réponse — un test sur des colonnes
    // NULL ne prouverait rien.
    await ds.query(
      `UPDATE users
       SET pin_code_hash = '$2a$10$fakeHashFakeHashFakeHashFakeHashFakeHashFa',
           pin_security_enabled = true,
           webauthn_credentials = $1::jsonb,
           webauthn_challenge = 'fake-challenge-en-cours'
       WHERE id = $2`,
      [
        JSON.stringify([
          {
            credentialID: 'fake-credential-id',
            credentialPublicKey: 'fake-public-key',
            counter: 0,
            deviceType: 'singleDevice',
            backedUp: false,
          },
        ]),
        marchandId,
      ],
    );

    // Activité RÉELLE en base pour vérifier la non-régression du score
    // Jùlaba (PR #194) en même temps que l'absence de fuite.
    await ds.query(
      `INSERT INTO caisse_transactions (user_id, marchand_id, type, montant, description, created_at)
       SELECT $1, $1, 'vente', 15000, 'vente-fuite-test-' || g, NOW() - (g || ' days')::interval
       FROM generate_series(1, 10) g`,
      [marchandId],
    );
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /cooperatives/membres : aucun champ sensible dans la réponse JSON, scoreJulaba fonctionne toujours', async () => {
    const r = await request(app.getHttpServer())
      .get('/api/v1/cooperatives/membres')
      .set('Authorization', `Bearer ${presidentToken}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.membres)).toBe(true);
    expect(r.body.membres.length).toBe(1);

    const raw = JSON.stringify(r.body);
    for (const field of SENSITIVE_FIELDS) {
      // Vérification au niveau clé JSON (pas juste sous-chaîne) : le nom du
      // champ ne doit apparaître nulle part comme clé sérialisée.
      expect(r.body.membres[0]).not.toHaveProperty(field);
      // Filet de sécurité supplémentaire : le nom du champ n'apparaît nulle
      // part dans le JSON brut de la réponse (repère toute variante snake_case
      // qui aurait fuité par une autre voie).
      expect(raw.includes(`"${field}"`)).toBe(false);
    }

    // Non-régression PR #194 : le score Jùlaba par membre doit continuer de
    // fonctionner (valeur numérique présente), pas juste "champ sensible absent".
    const membre = r.body.membres[0];
    expect(membre.id).toBe(marchandId);
    expect(typeof membre.scoreJulaba).toBe('number');
    expect(membre.scoreJulaba).toBeGreaterThan(0);
    expect(membre.scoreJulaba).toBeLessThanOrEqual(100);

    // Les champs légitimes (non sensibles) doivent, eux, rester présents —
    // preuve que le correctif retire précisément les champs sensibles et
    // rien d'autre.
    expect(membre).toHaveProperty('firstName');
    expect(membre).toHaveProperty('phone');
    expect(membre).toHaveProperty('statut_membre');
    expect(membre).toHaveProperty('role_membre');
  });

  it('GET /acteurs et GET /acteurs/:id : aucun champ sensible dans la réponse JSON (même correctif, même lot)', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/acteurs')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThan(0);

    const rawList = JSON.stringify(listRes.body);
    for (const field of SENSITIVE_FIELDS) {
      for (const row of listRes.body.data) {
        expect(row).not.toHaveProperty(field);
      }
      expect(rawList.includes(`"${field}"`)).toBe(false);
    }

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/acteurs/${marchandId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(marchandId);

    const rawDetail = JSON.stringify(detailRes.body);
    for (const field of SENSITIVE_FIELDS) {
      expect(detailRes.body).not.toHaveProperty(field);
      expect(rawDetail.includes(`"${field}"`)).toBe(false);
    }
  });

  it('GET /users/me : aucun champ sensible dans la réponse JSON (UsersService.findOne, même correctif)', async () => {
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${marchandToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.id).toBe(marchandId);

    const raw = JSON.stringify(meRes.body);
    for (const field of SENSITIVE_FIELDS) {
      expect(meRes.body).not.toHaveProperty(field);
      expect(raw.includes(`"${field}"`)).toBe(false);
    }
  });

  it('GET /auth/me : aucun champ sensible dans la réponse JSON (fuite résiduelle corrigée — AuthController.me)', async () => {
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${marchandToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.id).toBe(marchandId);

    const raw = JSON.stringify(meRes.body);
    for (const field of SENSITIVE_FIELDS) {
      expect(meRes.body.user).not.toHaveProperty(field);
      expect(raw.includes(`"${field}"`)).toBe(false);
    }

    // Champs légitimes toujours présents — preuve que le correctif retire
    // précisément les champs sensibles et rien d'autre.
    expect(meRes.body.user).toHaveProperty('firstName');
    expect(meRes.body.user).toHaveProperty('phone');
    expect(meRes.body.user).toHaveProperty('role');
  });

  it('GET /wallets/me : aucun champ sensible dans le user imbriqué (fuite résiduelle corrigée — WalletsService.getByUserId)', async () => {
    const walletRes = await request(app.getHttpServer())
      .get('/api/v1/wallets/me')
      .set('Authorization', `Bearer ${marchandToken}`);
    expect(walletRes.status).toBe(200);
    expect(walletRes.body.userId).toBe(marchandId);

    const raw = JSON.stringify(walletRes.body);
    for (const field of SENSITIVE_FIELDS) {
      if (walletRes.body.user) {
        expect(walletRes.body.user).not.toHaveProperty(field);
      }
      expect(raw.includes(`"${field}"`)).toBe(false);
    }
  });

  it('GET /users (admin, backoffice) : aucun champ sensible dans la réponse JSON (findAll — SELECT u.* brut mal filtré)', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThan(0);

    const raw = JSON.stringify(listRes.body);
    for (const field of SENSITIVE_FIELDS) {
      for (const row of listRes.body.data) {
        expect(row).not.toHaveProperty(field);
      }
      expect(raw.includes(`"${field}"`)).toBe(false);
    }
  });
});

// Anomalie secondaire trouvée dans la même recette end-to-end : POST
// /cooperatives renvoyait un 500 brut (contrainte unique `responsable_id`
// violée en base) quand l'appelant avait déjà une coopérative
// auto-provisionnée à l'inscription (signup role=cooperateur). Corrigé dans
// CooperativesRestController.create : vérification de l'existant AVANT
// l'insert + filet de sécurité sur l'erreur 23505 (course concurrente).
describe('Invariant — POST /cooperatives refuse proprement un doublon (🟢 attendu, pas de 500 brut)', () => {
  let app: INestApplication;
  let ds: DataSource;

  // Plage distincte de fuite-champs-sensibles-membres (+2250796500xxx) et de
  // toutes les autres plages du dossier invariants (vérifié via
  // `grep -rhoE "\+2250[0-9]{9}" backend/test/invariants/*.spec.ts | sort -u`).
  const PHONE_PRESIDENT_2 = '+2250796510001';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('un compte ayant déjà une coopérative (auto-provisionnée à l\'inscription) reçoit 409/400, jamais 500', async () => {
    const signupRes = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        phone: PHONE_PRESIDENT_2,
        firstName: 'Awa',
        lastName: 'ConflitCoopTest',
        role: 'cooperateur',
        genre: 'femme',
      });
    expect([200, 201]).toContain(signupRes.status);
    const token = signupRes.body.accessToken as string;
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });

    // Le signup role=cooperateur a déjà auto-provisionné une coopérative
    // (responsable_id = son id) — cf. AuthService.signup. Une seconde
    // création par le même compte doit être refusée proprement.
    const conflictRes = await request(app.getHttpServer())
      .post('/api/v1/cooperatives')
      .set('Authorization', `Bearer ${token}`)
      .send({ nom: 'Deuxième coopérative — doit être refusée' });

    expect([400, 409]).toContain(conflictRes.status);
    expect(conflictRes.status).not.toBe(500);
    expect(typeof conflictRes.body.message).toBe('string');
    expect(conflictRes.body.message.length).toBeGreaterThan(0);

    // Une seule coopérative reste enregistrée pour ce responsable.
    const rows = await ds.query(
      `SELECT COUNT(*)::int AS n FROM cooperatives WHERE responsable_id::text = (SELECT id::text FROM users WHERE phone = $1)`,
      [PHONE_PRESIDENT_2],
    );
    expect(rows[0].n).toBe(1);
  });
});
