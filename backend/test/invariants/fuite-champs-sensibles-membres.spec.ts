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
});
