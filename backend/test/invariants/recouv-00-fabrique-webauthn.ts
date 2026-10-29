// ──────────────────────────────────────────────────────────────────────────
// recouv-00-fabrique-webauthn.ts — LA FABRIQUE DE DOIGT DU HARNAIS.
//
// LOT-RECOVERY, marche 3 : le serveur exige une VRAIE réponse WebAuthn
// (verifyRegistrationResponse : challenge, origin, rpIdHash, UP/UV, COSE).
// Un harnais qui enverrait du bruit ne prouverait rien — il serait refusé
// pour de mauvaises raisons. Cette fabrique fabrique la réponse qu'un
// authentificateur de plateforme (P-256, fmt 'none', aucun nom de fabricant)
// produirait pour un challenge donné :
//
//   paire P-256 (WebCrypto) → clé publique COSE/ES256 (CBOR minimal) →
//   authData = rpIdHash‖UP|UV|AT‖compteur‖AAGUID‖id‖COSE →
//   attestationObject = { fmt:'none', attStmt:{}, authData } →
//   clientDataJSON = { type:'webauthn.create', challenge, origin }.
//
// CBOR est écrit à la main — quelques encodages déterministes, pas une
// dépendance de plus. La preuve que la fabrique est correcte ne repose PAS
// sur elle-même : `verifyRegistrationResponse` d'@simplewebauthn/server —
// LE vérificateur que le contrôleur appelle en production — la valide
// (test unitaire recouv-fabrique-webauthn.spec.ts, harnais recouv-01).
// ──────────────────────────────────────────────────────────────────────────

import { webcrypto } from 'node:crypto';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

export interface OptionsFabrique {
  /** Le challenge base64url TEL QUE RENVOYÉ par /webauthn/options. */
  challenge: string;
  /** L'origine attendue par le serveur (ex. 'https://julaba.online'). */
  origin: string;
  /** Le RP ID attendu (ex. 'julaba.online') — haché dans l'authData. */
  rpId: string;
  /** Facultatif — par défaut 32 octets tirés du générateur cryptographique. */
  credentialId?: Buffer;
}

/** Entier positif CBOR (majeure 0). */
function cborEntierPositif(v: number): Buffer {
  if (v < 24) return Buffer.from([v]);
  if (v <= 0xff) return Buffer.from([0x18, v]);
  const b = Buffer.alloc(3);
  b[0] = 0x19;
  b.writeUInt16BE(v, 1);
  return b;
}

/** Entier négatif CBOR (majeure 1) — v strictement < 0, encodé comme -1-n. */
function cborEntierNegatif(v: number): Buffer {
  const m = -1 - v;
  if (m < 24) return Buffer.from([0x20 + m]);
  return Buffer.from([0x38, m]);
}

/** Octets CBOR (majeure 2 — byte string, longueurs courtes couvertes). */
function cborOctets(b: Buffer): Buffer {
  if (b.length < 24) return Buffer.concat([Buffer.from([0x40 + b.length]), b]);
  if (b.length <= 0xff) return Buffer.concat([Buffer.from([0x58, b.length]), b]);
  const h = Buffer.alloc(3);
  h[0] = 0x59;
  h.writeUInt16BE(b.length, 1);
  return Buffer.concat([h, b]);
}

/** Texte CBOR (majeure 3). */
function cborTexte(s: string): Buffer {
  const b = Buffer.from(s, 'utf8');
  if (b.length < 24) return Buffer.concat([Buffer.from([0x60 + b.length]), b]);
  if (b.length <= 0xff) return Buffer.concat([Buffer.from([0x78, b.length]), b]);
  const h = Buffer.alloc(3);
  h[0] = 0x79;
  h.writeUInt16BE(b.length, 1);
  return Buffer.concat([h, b]);
}

/**
 * Une réponse d'enregistrement WebAuthn COMPLÈTE et honnête — celle qu'un
 * vrai authentificateur de plateforme renverrait pour ce challenge.
 */
export async function fabriquerReponseEnregistrement(
  options: OptionsFabrique,
): Promise<RegistrationResponseJSON> {
  // 1. La paire de clés du credential — EC2/P-256, l'algorithme ES256.
  const paire = (await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const brut = Buffer.from(await webcrypto.subtle.exportKey('raw', paire.publicKey));
  // L'export 'raw' d'une clé EC = 0x04 ‖ X (32) ‖ Y (32).
  const x = brut.subarray(1, 33);
  const y = brut.subarray(33, 65);

  const credentialId = options.credentialId ?? Buffer.from(webcrypto.getRandomValues(new Uint8Array(32)));

  // 2. La clé publique au format COSE : {1:2 (EC2), 3:-7 (ES256),
  //    -1:1 (P-256), -2:X, -3:Y} — map(5), encodage canonique court.
  const cose = Buffer.concat([
    Buffer.from([0xa5]),
    cborEntierPositif(1), cborEntierPositif(2), // kty: EC2
    cborEntierPositif(3), cborEntierNegatif(-7), // alg: ES256
    cborEntierNegatif(-1), cborEntierPositif(1), // crv: P-256
    cborEntierNegatif(-2), cborOctets(x),        // X
    cborEntierNegatif(-3), cborOctets(y),        // Y
  ]);

  // 3. authData : rpIdHash (32) ‖ drapeaux ‖ compteur (4) ‖ AAGUID (16) ‖
  //    longueur id (2) ‖ credentialId ‖ COSE.
  //    Drapeaux : UP (0x01, présence) | UV (0x04, doigt vérifié) |
  //               AT (0x40, données de credential présentes).
  const rpIdHash = Buffer.from(
    await webcrypto.subtle.digest('SHA-256', Buffer.from(options.rpId, 'utf8')),
  );
  const drapeaux = Buffer.from([0x01 | 0x04 | 0x40]);
  const compteur = Buffer.alloc(4); // compteur 0 : plateformes sans compteur
  const aaguid = Buffer.alloc(16); // AAGUID nul : fmt 'none', aucun fabricant
  const longueurId = Buffer.alloc(2);
  longueurId.writeUInt16BE(credentialId.length);
  const authData = Buffer.concat([
    rpIdHash, drapeaux, compteur, aaguid, longueurId, credentialId, cose,
  ]);

  // 4. attestationObject — fmt 'none' : l'attestation vide que le serveur
  //    a demandée (attestationType: 'none').
  const attestationObject = Buffer.concat([
    Buffer.from([0xa3]), // map(3)
    cborTexte('fmt'), cborTexte('none'),
    cborTexte('attStmt'), Buffer.from([0xa0]), // attStmt vide
    cborTexte('authData'), cborOctets(authData),
  ]);

  // 5. clientDataJSON — le challenge EST celui du serveur, l'origine EST
  //    celle attendue : la fabrique ne triche sur rien.
  const clientDataJSON = Buffer.from(
    JSON.stringify({
      type: 'webauthn.create',
      challenge: options.challenge,
      origin: options.origin,
      crossOrigin: false,
    }),
    'utf8',
  );

  const id = credentialId.toString('base64url');
  return {
    id,
    rawId: id,
    response: {
      clientDataJSON: clientDataJSON.toString('base64url'),
      attestationObject: attestationObject.toString('base64url'),
      transports: ['internal'],
    },
    type: 'public-key',
    clientExtensionResults: {},
    authenticatorAttachment: 'platform',
  } as unknown as RegistrationResponseJSON;
}
