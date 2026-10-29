// ──────────────────────────────────────────────────────────────────────────
// recouv-01-parcours-trois-marches.spec.ts — LES INVARIANTS HTTP DE LA
// RÉCUPÉRATION, BOUT EN BOUT.
//
// Le banc unitaire (session-recuperation.spec.ts) verrouille la machine à
// états en mémoire. Ici, on prouve le PARCOURS RÉEL : AppModule complet,
// supertest sur le Postgres jetable, SMS intercepté — le même montage que
// bo0-harnais. Cinq invariants que la spec d'écran (SPEC-ECRAN-RECUPERATION)
// et SPEC-AUTH-CIBLE §3 imposent au serveur :
//
//   R1  la naissance du code ne révèle JAMAIS le secret — pas dans la
//       réponse HTTP, pas ailleurs que dans le SMS de l'AGENT ;
//   R2  un seul code actif par compte — la régénération tue l'ancien ;
//   R3  initier refuse UNIFORMÉMENT — rien ne discrimine numéro inconnu,
//       code faux, code malsain (AUTH-07, anti-énumération) ;
//   R4  LE CODE SEUL NE SUFFIT JAMAIS — sans le geste d'ELLE (marche 2),
//       la marche 3 est murée (options et ré-enrôlement refusés) ;
//   R5  le geste posé ouvre la marche 3 — options DÉCOUVRABLES
//       (residentKey required, userVerification required, userID = user.id :
//       le pivot du LOT-WA-01), ancienne clé dans excludeCredentials ;
//   R6  une VRAIE réponse WebAuthn (fabriquée par recouv-00, validée par le
//       MÊME vérificateur que la production) reconnecte : anciennes clés
//       remplacées, code consommé, jetons dans le corps pour l'APK ;
//   R7  usage unique — le jeton mort refuse tout, le code consommé refuse
//       uniformément ;
//   R8  l'échelle d'attente verrouille MÊME le vrai code après 3 échecs —
//       et l'attente se dit en clair.
//
// Lancer : npm run test:invariants -- recouv-01
// (Postgres requis : DB_PORT/DB_USERNAME/DB_NAME sur le PG embarqué ou CI.)
// ──────────────────────────────────────────────────────────────────────────

import { HarnaisBO0, monterHarnais } from './bo0-harnais';
import { fabriquerReponseEnregistrement } from './recouv-00-fabrique-webauthn';
import { CodeRecuperation } from '../../src/auth/entities/code-recuperation.entity';
import { User, UserStatus } from '../../src/users/entities/user.entity';

// Le harnais ÉPINGLE l'origine et le RP : la réponse fabriquée et le serveur
// doivent viser le MÊME monde, sans dépendre de l'environnement de la machine.
process.env.WEBAUTHN_RP_ID = 'julaba-invariants.test';
process.env.WEBAUTHN_ORIGIN = 'https://julaba-invariants.test';
const ORIGINE = process.env.WEBAUTHN_ORIGIN;
const RP_ID = process.env.WEBAUTHN_RP_ID;

const CHEMIN = '/api/v1/auth/recuperation';

describe('LOT-RECOVERY — le parcours à trois marches, en HTTP réel', () => {
  let h: HarnaisBO0;
  let agent: { id: string; token: string; phone: string };
  let marchande: { id: string; token: string; phone: string };
  const sms: Array<{ phone: string; message: string }> = [];

  const dernierCode = (): string => {
    const message = sms[sms.length - 1]?.message ?? '';
    const m = message.match(/code de recuperation : ([0-9A-Z-]+)\s*\./);
    expect(m).not.toBeNull();
    return m![1];
  };
  const codesRepo = () => h.ds.getRepository(CodeRecuperation);
  const ligneCode = async (id: string) =>
    (await codesRepo().findOneBy({ id })) as CodeRecuperation;
  const envoyerCodes = async (token: string, phone: string) =>
    h.api().post(`${CHEMIN}/codes`).set('Authorization', `Bearer ${token}`).send({ phone });
  const initier = async (phone: string, code: string) =>
    h.api().post(`${CHEMIN}/initier`).send({ phone, code });

  beforeAll(async () => {
    h = await monterHarnais({
      // Le SEUL exemplaire du code part par SMS : on intercepte le canal.
      sms: {
        sendSms: async (phone, message) => {
          sms.push({ phone, message });
          return { success: true };
        },
      },
    });
    agent = { ...(await h.mk('+2250700000001', 'identificateur')), phone: '+2250700000001' };
    marchande = { ...(await h.mk('+2250700000002', 'marchand')), phone: '+2250700000002' };
    // La marchande a perdu son téléphone : son ANCIENNE clé (volée, réinstallée)
    // traîne encore côté serveur — c'est elle que le ré-enrôlement doit remplacer.
    await h.ds.getRepository(User).update(marchande.id, {
      status: UserStatus.ACTIF,
      webauthnCredentials: [
        {
          credentialID: 'ancienne-cle-perdue',
          credentialPublicKey: 'perdue',
          counter: 3,
          deviceType: 'singleDevice',
          backedUp: false,
          transports: [],
        },
      ],
      webauthnChallenge: null,
    } as any);
  }, 60000);

  afterAll(async () => {
    if (h) await h.close();
  });

  it('R1 — la naissance du code ne révèle jamais le secret', async () => {
    const res = await envoyerCodes(agent.token, marchande.phone);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.codeId).toBeTruthy();

    // Le SEUL exemplaire du code est parti sur le téléphone de l'AGENT.
    expect(sms.length).toBe(1);
    expect(sms[0].phone).toBe(agent.phone);
    const code1 = dernierCode();
    expect(code1).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);

    // La réponse HTTP ne contient RIEN — ni le code, ni un fragment.
    expect(JSON.stringify(res.body)).not.toContain(code1);
    expect(JSON.stringify(res.body)).not.toContain('code:');

    // En base : un hash, jamais le clair.
    const ligne = await ligneCode(res.body.codeId);
    expect(ligne.statut).toBe('actif');
    expect(ligne.codeHash).not.toContain(code1);
    expect(ligne.codeHash.startsWith('$2')).toBe(true); // bcrypt
    expect(ligne.echecs).toBe(0);
  });

  it('R2 — un seul code actif : la régénération tue l\u2019ancien', async () => {
    const res = await envoyerCodes(agent.token, marchande.phone);
    expect(res.body.success).toBe(true);
    const code2 = dernierCode();
    expect(sms.length).toBe(2);
    expect(sms[1].phone).toBe(agent.phone);

    const lignes = await codesRepo().find({ where: { userId: marchande.id } });
    const actives = lignes.filter((l) => l.statut === 'actif');
    expect(actives.length).toBe(1);
    expect(actives[0].id).toBe(res.body.codeId);
    const mortes = lignes.filter((l) => l.statut === 'revoque');
    expect(mortes.length).toBe(1);
    expect(mortes[0].revoqueLe).not.toBeNull();
    expect(mortes[0].revoquePar).toBe(agent.id);

    // Deux codes tirés au hasard ne se ressemblent pas.
    const premier = sms[0].message.match(/code de recuperation : ([0-9A-Z-]+)\s*\./)![1];
    expect(code2).not.toBe(premier);
    global.__code2 = code2;
    global.__code2Id = actives[0].id;
  });

  it('R3 — initier refuse uniformément : rien ne discrimine', async () => {
    const code2: string = global.__code2;
    const refusInconnu = await initier('+2250999999999', code2);
    const refusCodeFaux = await initier(marchande.phone, 'AAAA-BBBB');
    const refusCodeFaux2 = await initier(marchande.phone, 'CCCC-DDDD');

    // Le MÊME corps, à la lettre — pas de code d'erreur discriminant.
    expect(refusInconnu.body).toEqual({ success: false, message: 'Numéro ou code refusé' });
    expect(refusCodeFaux.body).toEqual(refusInconnu.body);
    expect(refusCodeFaux2.body).toEqual(refusInconnu.body);
    expect(refusInconnu.body).not.toHaveProperty('jeton');

    // Deux échecs comptés sur la ligne du code, sans verrou (palier à 3).
    const ligne = await ligneCode(global.__code2Id);
    expect(ligne.echecs).toBe(2);
    expect(ligne.verrouLe).toBeNull();

    global.__refus = refusInconnu.body;
  });

  it('R4 — le code seul ne suffit jamais : la marche 3 est murée', async () => {
    const code2: string = global.__code2;
    const ok = await initier(marchande.phone, code2);
    expect(ok.body.success).toBe(true);
    expect(typeof ok.body.jeton).toBe('string');
    global.__jeton = ok.body.jeton;

    // Les échecs sont effacés : un code juste remet le compteur à zéro.
    const ligne = await ligneCode(global.__code2Id);
    expect(ligne.echecs).toBe(0);
    expect(ligne.verrouLe).toBeNull();

    // Options d'enrôlement SANS le geste : refus, aucun challenge rendu.
    const options = await h.api()
      .post(`${CHEMIN}/webauthn/options`)
      .send({ jeton: global.__jeton });
    expect(options.body.error).toBeTruthy();
    expect(options.body.challenge).toBeUndefined();

    // Ré-enrôlement SANS le geste : refus explicite — le code et le geste.
    const bidon = {
      jeton: global.__jeton,
      reponse: { id: 'x', rawId: 'x', type: 'public-key', response: {}, clientExtensionResults: {} },
    };
    const reEnrolement = await h.api().post(`${CHEMIN}/re-enroler`).send(bidon);
    expect(reEnrolement.body.verified).toBe(false);
    expect(reEnrolement.body.error).toMatch(/le code et le geste sont requis/i);

    // Un jeton inventé n'ouvre rien non plus.
    const inconnu = await h.api().post(`${CHEMIN}/consentement`).send({ jeton: 'jeton-fantome' });
    expect(inconnu.body.success).toBe(false);
  });

  it('R5 — le geste posé ouvre la marche 3 : options découvrables', async () => {
    // MARCHE 2 — LE GESTE D'ELLE : l'écran n'appelle cette route qu'après le
    // toucher long ; ici, le harnais pose le trace que l'écran déclenche.
    const geste = await h.api()
      .post(`${CHEMIN}/consentement`)
      .send({ jeton: global.__jeton });
    expect(geste.body.success).toBe(true);
    expect(geste.body.etape).toBe('consentement');

    const options = await h.api()
      .post(`${CHEMIN}/webauthn/options`)
      .send({ jeton: global.__jeton });
    expect(options.body.challenge).toBeTruthy();
    expect(options.body.rp.id).toBe(RP_ID);
    expect(options.body.authenticatorSelection.residentKey).toBe('required');
    expect(options.body.authenticatorSelection.userVerification).toBe('required');
    // Le pivot du LOT-WA-01 : userID = user.id — l'assertion usernameless
    // quotidienne rapportera CE userHandle.
    expect(options.body.user.id).toBe(Buffer.from(marchande.id, 'utf8').toString('base64url'));
    // L'ancienne clé perdue est dans la liste d'exclusion.
    expect((options.body.excludeCredentials ?? []).some((c: { id: string }) => c.id === 'ancienne-cle-perdue')).toBe(true);

    global.__options = options.body;
  });

  it('R6 — la vraie réponse WebAuthn reconnecte, remplace les clés, consomme le code', async () => {
    const reponse = await fabriquerReponseEnregistrement({
      challenge: global.__options.challenge,
      origin: ORIGINE,
      rpId: RP_ID,
    });
    const res = await h.api()
      .post(`${CHEMIN}/re-enroler`)
      .send({ jeton: global.__jeton, reponse });
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.user.id).toBe(marchande.id);
    // Elle repart CONNECTÉE : jetons dans le corps (APK) — cookies en plus (web).
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.accessToken.length).toBeGreaterThan(20);
    expect(typeof res.body.refreshToken).toBe('string');

    // L'ancienne clé perdue est REMPLACÉE, pas archivée : une seule clé, la sienne.
    const apres = (await h.ds.getRepository(User).findOneBy({ id: marchande.id })) as User;
    expect(apres.webauthnCredentials!.length).toBe(1);
    expect(apres.webauthnCredentials![0].credentialID).toBe(reponse.id);
    expect(apres.webauthnCredentials![0].credentialID).not.toBe('ancienne-cle-perdue');
    expect(apres.webauthnChallenge).toBeNull();

    // Le code a servi : consommé, horodaté — usage unique.
    const ligne = await ligneCode(global.__code2Id);
    expect(ligne.statut).toBe('consomme');
    expect(ligne.consommeLe).not.toBeNull();
  });

  it('R7 — usage unique : le jeton mort et le code consommé ne servent plus', async () => {
    // Le même jeton, la même réponse : refus — la session est consommée.
    const reponse = await fabriquerReponseEnregistrement({
      challenge: global.__options.challenge,
      origin: ORIGINE,
      rpId: RP_ID,
    });
    const rejoue = await h.api()
      .post(`${CHEMIN}/re-enroler`)
      .send({ jeton: global.__jeton, reponse });
    expect(rejoue.body.verified).toBe(false);

    // Le code consommé : le MÊME refus uniforme qu'un code inconnu (R3).
    const repasse = await initier(marchande.phone, global.__code2);
    expect(repasse.body).toEqual(global.__refus);
  });

  it('R8 — l\u2019échelle d\u2019attente verrouille même le vrai code', async () => {
    // Un code tout neuf, remis à l'agent.
    const res = await envoyerCodes(agent.token, marchande.phone);
    expect(res.body.success).toBe(true);
    const code3 = dernierCode();

    // Trois faux codes bien formés (alphabet Crockford) — REFUS à chaque fois.
    for (const faux of ['AAAA-BBBB', 'CCCC-DDDD', 'EEEE-FFGG']) {
      const echec = await initier(marchande.phone, faux);
      expect(echec.body).toEqual(global.__refus);
    }

    // Au quatrième essai, MÊME avec le VRAI code : ATTENTE, annoncée en clair.
    const verrouille = await initier(marchande.phone, code3);
    expect(verrouille.body.success).toBe(false);
    expect(verrouille.body.code).toBe('ATTENTE');
    expect(verrouille.body.message).toMatch(/Attends/);
    expect(verrouille.body.message).toMatch(/minute/i);

    // Le verrou vit sur la LIGNE — il survit aux redémarrages.
    const ligne = await ligneCode(res.body.codeId);
    expect(ligne.echecs).toBe(3);
    expect(ligne.verrouLe).not.toBeNull();
    expect(ligne.verrouLe!.getTime()).toBeGreaterThan(Date.now());
  });
});

// Poche du suite — les invariants se passent l'état en séquence (maxWorkers: 1).
declare global {
  // eslint-disable-next-line no-var
  var __code2: string;
  // eslint-disable-next-line no-var
  var __code2Id: string;
  // eslint-disable-next-line no-var
  var __jeton: string;
  // eslint-disable-next-line no-var
  var __options: { challenge: string };
  // eslint-disable-next-line no-var
  var __refus: { success: boolean; message: string };
}
