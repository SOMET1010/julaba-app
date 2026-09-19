// SEC-2 — LE PIN DE L'IDENTIFICATEUR N'EST PLUS JAMAIS RENDU, ET IL EST VERROUILLÉ
//
// Trois propriétés, prouvées bout en bout sur un vrai Postgres et de vraies
// requêtes HTTP — pas sur des fonctions appelées à la main :
//
//   1. AUCUNE réponse d'`auth` ne contient le code. Ni à la création
//      (SEC-06 : `pinGenere` supprimé), ni à la réinitialisation, ni ailleurs :
//      la route de déchiffrement (SEC-05) n'existe plus du tout.
//   2. La réinitialisation invalide VRAIMENT : ancien code refusé, ancienne
//      session morte, nouveau code accepté, trace `PIN_RESET` écrite.
//   3. Le verrou de `verrou-pin.ts` s'applique au PIN identificateur, et
//      CHANGER DE SESSION NE LE CONTOURNE PAS.
//
// La troisième est la condition de l'arbitrage « 4 chiffres, alphabet 2–9 »
// (Patrick, 19/09/2026) : 4 096 combinaisons ne sont acceptables que derrière
// un verrou. Avant ce lot, `identificateur/me/verify-pin` n'avait AUCUN
// compteur — on pouvait tout essayer en quelques minutes. Ces tests échouent
// si quelqu'un retire le verrou.
//
// LE CODE EST LU DANS LE SMS, à dessein : c'est le seul endroit où il existe.
// Si un jour il repassait par une réponse HTTP, le test « aucun secret dans la
// réponse » virerait au rouge.
//
// Numéros réservés à cette suite : +22507990001xx (cf. telephones-tests-uniques).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { SmsService } from '../../src/sms/sms.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';
import { PALIER } from '../../src/auth/verrou-pin';

const TEL_ADMIN = '+2250799000101';
const TEL_IDENT = '+2250799000102';
const TEL_IDENT_CREE = '+2250799000103';
const TEL_TERRAIN = '+2250799000104';
const TEL_MARCHANDE = '+2250799000105';
const MDP = 'Julaba2026!';

describe('SEC-2 — le PIN identificateur ne sort plus, et il est verrouillé', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let jetonAdmin: string;
  let identId: string;
  const smsEnvoyes: { phone: string; message: string }[] = [];
  let smsEchoue = false;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      // Le throttler n'est pas le sujet : on l'écarte pour que les refus
      // mesurés soient bien ceux du verrou, jamais des 429.
      .overrideProvider(ThrottlerStorage)
      .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }) })
      // On intercepte l'envoi pour LIRE le code : c'est le seul canal.
      .overrideProvider(SmsService)
      .useValue({
        sendSms: async (phone: string, message: string) => {
          smsEnvoyes.push({ phone, message });
          return smsEchoue
            ? { success: false, error: 'operateur injoignable (simulé)' }
            : { success: true };
        },
      })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    jetonAdmin = await seed('super_admin' as UserRole, TEL_ADMIN);
    identId = await seedId('identificateur' as UserRole, TEL_IDENT);
  }, 90000);

  afterAll(async () => {
    if (app) await app.close();
  });

  async function seedId(role: UserRole, phone: string): Promise<string> {
    const repo = ds.getRepository(User);
    const u: any = await repo.save(repo.create({
      phone, firstName: 'Sec2', lastName: String(role), genre: 'femme',
      role, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash(MDP, 10),
    } as any) as any);
    return u.id;
  }
  async function seed(role: UserRole, phone: string): Promise<string> {
    const id = await seedId(role, phone);
    return jwt.signAsync({ sub: id, phone, role }, { secret: process.env.JWT_SECRET });
  }

  const admin = (r: request.Test) => r.set('Authorization', `Bearer ${jetonAdmin}`);

  /** Une session réelle, obtenue par /auth/login — pas un jeton fabriqué. */
  async function ouvrirSession(phone: string) {
    const r = await api().post('/api/v1/auth/login').send({ phone, password: MDP });
    expect(r.status).toBe(200);
    return { access: r.body.accessToken as string, refresh: r.body.refreshToken as string };
  }

  const verifierPin = (access: string, pin: string) =>
    api().post('/api/v1/auth/identificateur/me/verify-pin')
      .set('Authorization', `Bearer ${access}`).send({ pin });

  /** Le code tel qu'il part réellement : 4 chiffres isolés dans le SMS. */
  function pinDuDernierSms(): string {
    const dernier = smsEnvoyes[smsEnvoyes.length - 1];
    expect(dernier).toBeDefined();
    const m = dernier.message.match(/(?<!\d)(\d{4})(?!\d)/);
    expect(m).not.toBeNull();
    return m![1];
  }

  async function poserPinConnu(pin: string) {
    const r = await admin(api().post(`/api/v1/auth/identificateur/${identId}/pin`)).send({ pin });
    expect(r.body.success).toBe(true);
    await ds.query(
      `UPDATE users SET failed_identificateur_pin_attempts = 0,
                        identificateur_pin_locked_until = NULL WHERE id = $1`, [identId]);
  }

  // ── 1. AUCUN SECRET NE SORT ──────────────────────────────────────────────

  it('la route de déchiffrement du PIN n’existe plus', async () => {
    const r = await admin(api().get(`/api/v1/auth/identificateur/${identId}/pin-decrypted`));
    expect(r.status).toBe(404);
  });

  // SEC-06 — CE QUE LE TEST A TROUVÉ EN VOULANT LE PROUVER.
  //
  // La branche qui renvoyait `pinGenere` était INATTEIGNABLE. `create-acteur`
  // passe par `authService.signup`, dont l'allow-list M6/M8 est fail-closed
  // pour les rôles administratifs : `rolesCreablesPar('super_admin')` rend `[]`.
  // Aucun appelant, quel que soit son rôle, ne peut donc créer un
  // `identificateur` par cette route — et le bloc PIN qui suivait n'était
  // jamais exécuté.
  //
  // À dire honnêtement : la fuite SEC-06 était RÉELLE DANS LE CODE mais NON
  // EXPLOITABLE par ce chemin. On la retire quand même — du code mort qui rend
  // un secret redevient vivant le jour où quelqu'un élargit l'allow-list sans
  // lire ce qui suit. L'alphabet 2–9 (SEC-07) est donc prouvé plus bas, sur le
  // chemin VIVANT : le SMS de réinitialisation.
  it('create-acteur refuse le rôle identificateur — la fuite SEC-06 était morte', async () => {
    const r = await admin(api().post('/api/v1/auth/create-acteur')).send({
      phone: TEL_IDENT_CREE, firstName: 'Nouvelle', lastName: 'Ident',
      genre: 'femme', role: 'identificateur',
    });
    expect(r.status).toBe(403);
  });

  it('sur une création qui aboutit, rien qui ressemble à un code ne revient', async () => {
    const identTerrain = await seed('identificateur' as UserRole, TEL_TERRAIN);
    const r = await api().post('/api/v1/auth/create-acteur')
      .set('Authorization', `Bearer ${identTerrain}`)
      .send({ phone: TEL_MARCHANDE, firstName: 'Awa', lastName: 'Sec2', genre: 'femme', role: 'marchand' });
    expect([200, 201]).toContain(r.status);
    expect(r.body).not.toHaveProperty('pinGenere');
    expect(r.body).not.toHaveProperty('pin');
  });

  // ── 2. LA RÉINITIALISATION INVALIDE VRAIMENT ─────────────────────────────

  it('après reset : ancien code refusé, ancienne session morte, nouveau code accepté, PIN_RESET écrit', async () => {
    const ancienPin = '2468';
    await poserPinConnu(ancienPin);

    // Une session bien vivante, et un code qui marche.
    const session = await ouvrirSession(TEL_IDENT);
    expect((await verifierPin(session.access, ancienPin)).body.valid).toBe(true);

    const avant = smsEnvoyes.length;
    const reset = await admin(api().post(`/api/v1/auth/identificateur/${identId}/reinitialiser-pin`));
    expect(reset.status).toBe(200);

    // (a) la réponse ne porte AUCUN secret
    expect(reset.body).toEqual({ success: true });

    // (b) le nouveau code est parti par SMS, et par LÀ seulement
    expect(smsEnvoyes.length).toBe(avant + 1);
    const nouveauPin = pinDuDernierSms();
    expect(nouveauPin).not.toBe(ancienPin);
    // SEC-07, sur le chemin vivant : tiré dans l'alphabet 2–9, 4 chiffres.
    expect(nouveauPin).toMatch(/^[2-9]{4}$/);

    // (c) trace PIN_RESET, et le code n'y figure pas — ni entier, ni en morceaux
    const [{ n }] = await ds.query(
      `SELECT count(*)::int n FROM audit_logs WHERE action = 'PIN_RESET' AND entite_id = $1`, [identId]);
    expect(n).toBeGreaterThan(0);
    const [trace] = await ds.query(
      `SELECT details::text AS d FROM audit_logs WHERE action='PIN_RESET' AND entite_id=$1
        ORDER BY created_at DESC LIMIT 1`, [identId]);
    expect(trace.d).not.toContain(nouveauPin);
    expect(trace.d).not.toContain(nouveauPin.slice(0, 2));
    expect(trace.d).not.toContain(nouveauPin.slice(-2));

    // (d) l'ANCIENNE session est révoquée : son jeton de rafraîchissement
    //     ne rend plus la main.
    const refresh = await api().post('/api/v1/auth/refresh').send({ refreshToken: session.refresh });
    expect(refresh.body.accessToken).toBeUndefined();

    // (e) sur une session NEUVE : l'ancien code est refusé, le nouveau passe.
    const neuve = await ouvrirSession(TEL_IDENT);
    expect((await verifierPin(neuve.access, ancienPin)).body.valid).toBe(false);
    expect((await verifierPin(neuve.access, nouveauPin)).body.valid).toBe(true);
  }, 60000);

  it('SMS non délivré : on le dit, on ne montre jamais le code — et le reset tient quand même', async () => {
    await poserPinConnu('3579');
    smsEchoue = true;
    let r: request.Response;
    try {
      r = await admin(api().post(`/api/v1/auth/identificateur/${identId}/reinitialiser-pin`));
    } finally {
      smsEchoue = false;
    }
    expect(r!.status).toBe(200);
    expect(r!.body.code).toBe('SMS_NON_DELIVRE');
    expect(r!.body.success).toBe(false);
    // L'état d'acheminement, jamais le lot de consolation.
    expect(r!.body).not.toHaveProperty('pin');
    expect(r!.body).not.toHaveProperty('pinGenere');
    expect(JSON.stringify(r!.body)).not.toMatch(/(?<!\d)\d{4}(?!\d)/);
    // Le code a bel et bien changé : on ne revient pas en arrière sur une
    // invalidation de secret parce que l'opérateur téléphonique a toussé.
    expect(r!.body.pinChange).toBe(true);
    const neuve = await ouvrirSession(TEL_IDENT);
    expect((await verifierPin(neuve.access, '3579')).body.valid).toBe(false);
  }, 60000);

  // ── 3. LE VERROU, ET L'IMPOSSIBILITÉ DE LE CONTOURNER ────────────────────

  it(`le palier tombe à ${PALIER} essais ratés, et le verrou est réel`, async () => {
    const bon = '4826';
    await poserPinConnu(bon);
    const s = await ouvrirSession(TEL_IDENT);

    // Les deux premiers échecs préviennent sans bloquer : le droit à l'hésitation.
    for (let i = 1; i < PALIER; i += 1) {
      const r = await verifierPin(s.access, '9999');
      expect(r.body.valid).toBe(false);
      expect(r.body.locked).toBe(false);
      expect(r.body.essaisRestants).toBe(PALIER - i);
    }

    // Le troisième pose l'attente.
    const palier = await verifierPin(s.access, '9999');
    expect(palier.body.locked).toBe(true);
    expect(palier.body.attenteMs).toBeGreaterThan(0);

    // ET LE BON CODE EST REFUSÉ AUSSI. C'est ce qui distingue un verrou d'un
    // simple compteur : sans cette ligne, la force brute continuerait.
    const avecLeBon = await verifierPin(s.access, bon);
    expect(avecLeBon.body.valid).toBe(false);
    expect(avecLeBon.body.locked).toBe(true);
  }, 60000);

  it('changer de session ne lève pas le verrou — le compteur vit sur le compte', async () => {
    const bon = '5837';
    await poserPinConnu(bon);
    const s1 = await ouvrirSession(TEL_IDENT);
    for (let i = 0; i < PALIER; i += 1) await verifierPin(s1.access, '9999');
    expect((await verifierPin(s1.access, bon)).body.locked).toBe(true);

    // Nouvelle connexion complète : nouveau jeton d'accès, nouvelle session.
    // C'est exactement le contournement à rendre impossible — et il l'est
    // parce que le compteur du PIN identificateur a SES PROPRES colonnes :
    // s'il partageait `failedPinAttempts`, ce login réussi l'aurait remis à
    // zéro et ce test serait vert pour la pire des raisons.
    const s2 = await ouvrirSession(TEL_IDENT);
    // Une session réellement neuve : le jeton de rafraîchissement est distinct.
    // (Les jetons d'ACCÈS, eux, peuvent être identiques à la seconde près —
    //  même `sub`, même `iat` en secondes — donc les comparer ne prouve rien.)
    expect(s2.refresh).not.toBe(s1.refresh);
    const apres = await verifierPin(s2.access, bon);
    expect(apres.body.valid).toBe(false);
    expect(apres.body.locked).toBe(true);

    // LA PREUVE DE LA SÉPARATION DES COMPTEURS, en base.
    // Le login qu'on vient de faire a remis `failed_pin_attempts` (mot de passe)
    // à zéro — c'est son comportement normal. Si le PIN identificateur partageait
    // ce champ, le verrou serait tombé avec. Il ne partage rien : son compteur
    // est toujours au palier.
    const [u] = await ds.query(
      `SELECT failed_pin_attempts AS mdp, failed_identificateur_pin_attempts AS pin
         FROM users WHERE id = $1`, [identId]);
    expect(Number(u.mdp)).toBe(0);
    expect(Number(u.pin)).toBeGreaterThanOrEqual(PALIER);
  }, 60000);

  it('change-pin ne contourne pas le verrou : c’est l’autre porte, elle est fermée aussi', async () => {
    const bon = '6394';
    await poserPinConnu(bon);
    const s = await ouvrirSession(TEL_IDENT);
    for (let i = 0; i < PALIER; i += 1) {
      await api().post('/api/v1/auth/identificateur/me/change-pin')
        .set('Authorization', `Bearer ${s.access}`).send({ oldPin: '9999', newPin: '8765' });
    }
    const r = await api().post('/api/v1/auth/identificateur/me/change-pin')
      .set('Authorization', `Bearer ${s.access}`).send({ oldPin: bon, newPin: '8765' });
    expect(r.body.success).toBe(false);
    expect(r.body.locked).toBe(true);
    // Le code n'a pas changé : le verrou a tenu.
    await ds.query(`UPDATE users SET identificateur_pin_locked_until = NULL WHERE id = $1`, [identId]);
    expect((await verifierPin(s.access, bon)).body.valid).toBe(true);
  }, 60000);

  it('la réinitialisation lève le verrou — sinon on enverrait un code inutilisable', async () => {
    await poserPinConnu('7261');
    const s = await ouvrirSession(TEL_IDENT);
    for (let i = 0; i < PALIER; i += 1) await verifierPin(s.access, '9999');
    expect((await verifierPin(s.access, '7261')).body.locked).toBe(true);

    await admin(api().post(`/api/v1/auth/identificateur/${identId}/reinitialiser-pin`));
    const nouveau = pinDuDernierSms();
    const neuve = await ouvrirSession(TEL_IDENT);
    expect((await verifierPin(neuve.access, nouveau)).body.valid).toBe(true);
  }, 60000);
});
