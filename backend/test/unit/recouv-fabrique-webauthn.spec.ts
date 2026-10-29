/**
 * LOT-RECOVERY — la fabrique WebAuthn du harnais produit une VRAIE réponse.
 *
 * Le harnais HTTP (recouv-01) envoie au serveur la réponse de la marche 3
 * fabriquée par recouv-00-fabrique-webauthn. Si cette fabrique était fausse,
 * le harnais prouverait la RÉSISTANCE du serveur, pas son PARCOURS — le test
 * passerait en bouclant sur le refus. Ce banc ferme cette porte : la fabrique
 * est validée PAR LE VÉRIFICATEUR MÊME DE LA PRODUCTION
 * (verifyRegistrationResponse d'@simplewebauthn/server), avec les options
 * générées PAR LE VRAI GÉNÉRATEUR DU CONTRÔLEUR
 * (generateRegistrationOptionsPourRecuperation) et les mêmes attentes
 * (origin, RP ID) que `re-enroler`.
 *
 * Sans base, sans réseau — juste la cryptographie et la vérité du code.
 *
 * Ce que ce banc verrouille :
 *   1. les options du contrôleur exigent residentKey 'required' et
 *      userVerification 'required' (découvrable — le pivot du LOT-WA-01) ;
 *   2. userID = user.id, encodé base64url — l'assertion usernameless
 *      rapportera CE userHandle au quotidien ;
 *   3. la réponse fabriquée PASSE la vérification production : challenge,
 *      origin, rpIdHash, UP|UV, fmt 'none', COSE P-256 — tout est vrai ;
 *   4. la clé rendue est LA clé fabriquée (même credentialID, clé publique
 *      présente, deviceType singleDevice — pas de drapeau de sauvegarde
 *      dans les drapeaux de la fabrique) ;
 *   5. le challenge LIE la réponse : la même réponse contre un autre
 *      challenge est rejetée — le harnais ne peut pas rejouer un passé.
 *
 * Lancer : npm run test:unit -- recouv-fabrique
 */
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { fabriquerReponseEnregistrement } from '../invariants/recouv-00-fabrique-webauthn';
import { generateRegistrationOptionsPourRecuperation } from '../../src/auth/recuperation.controller';

// Les valeurs par DÉFAUT du contrôleur (aucune variable d'environnement
// WeBAUTHN ne doit fuiter dans ce banc) — c'est la production nue qu'on prouve.
delete process.env.WEBAUTHN_RP_ID;
delete process.env.WEBAUTHN_ORIGIN;
const RP_ID = 'julaba.online';
const ORIGINE = 'https://julaba.online';

const COMPTE = {
  id: '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f',
  phone: '+2250700000002',
  firstName: 'Awa',
  lastName: 'Konaté',
  webauthnCredentials: [],
} as any;

describe('recouv-fabrique-webauthn (le doigt du harnais est un vrai doigt)', () => {
  it('les options du contrôleur exigent un credential découvrable, userID = user.id', async () => {
    const options = await generateRegistrationOptionsPourRecuperation(COMPTE);
    expect(options.authenticatorSelection?.residentKey).toBe('required');
    expect(options.authenticatorSelection?.userVerification).toBe('required');
    expect(options.rp.id).toBe(RP_ID);
    expect(options.user.id).toBe(Buffer.from(COMPTE.id, 'utf8').toString('base64url'));
    expect(options.challenge).toBeTruthy();
  });

  it('la réponse fabriquée passe le vérificateur de la production', async () => {
    const options = await generateRegistrationOptionsPourRecuperation(COMPTE);
    const reponse = await fabriquerReponseEnregistrement({
      challenge: options.challenge,
      origin: ORIGINE,
      rpId: RP_ID,
    });
    const verdict = await verifyRegistrationResponse({
      response: reponse,
      expectedChallenge: options.challenge,
      expectedOrigin: ORIGINE,
      expectedRPID: RP_ID,
    });
    expect(verdict.verified).toBe(true);
    expect(verdict.registrationInfo?.credential.id).toBe(reponse.id);
    expect(verdict.registrationInfo?.credential.publicKey.length).toBeGreaterThan(0);
    expect(verdict.registrationInfo?.credentialDeviceType).toBe('singleDevice');
    expect(verdict.registrationInfo?.userVerified).toBe(true);
  });

  it('le challenge LIE la réponse : rejouer contre un autre challenge échoue', async () => {
    const options = await generateRegistrationOptionsPourRecuperation(COMPTE);
    const reponse = await fabriquerReponseEnregistrement({
      challenge: options.challenge,
      origin: ORIGINE,
      rpId: RP_ID,
    });
    const autreChallenge = Buffer.from('challenge-fabrique-tout-autre-0000').toString('base64url');
    await expect(
      verifyRegistrationResponse({
        response: reponse,
        expectedChallenge: autreChallenge,
        expectedOrigin: ORIGINE,
        expectedRPID: RP_ID,
      }),
    ).rejects.toThrow(/challenge/i);
  });

  it('l\u2019origine LIE la réponse : un autre origin échoue', async () => {
    const options = await generateRegistrationOptionsPourRecuperation(COMPTE);
    const reponse = await fabriquerReponseEnregistrement({
      challenge: options.challenge,
      origin: ORIGINE,
      rpId: RP_ID,
    });
    await expect(
      verifyRegistrationResponse({
        response: reponse,
        expectedChallenge: options.challenge,
        expectedOrigin: 'https://site-imposteur.example',
        expectedRPID: RP_ID,
      }),
    ).rejects.toThrow(/origin/i);
  });
});
