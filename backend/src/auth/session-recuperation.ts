// ──────────────────────────────────────────────────────────────────────────
// session-recuperation.ts — LE PASSE-PORTE À TROIS ÉTAPES.
//
// LA RÈGLE QUI FAIT TOUT TENIR (SPEC-AUTH-CIBLE §3.1.3, décision du 16/08 §8.4) :
// LE CODE SEUL NE SUFFIT JAMAIS. Le détenteur du code — l'identificateur, en
// SEMI-CONFIANCE — ne doit jamais pouvoir ré-enrôler un authentificateur à la
// place de la marchande. Le serveur exige donc DEUX preuves distinctes avant de
// toucher aux credentials :
//   étape 1  le CODE (détenu par l'identificateur)        → étape « code_valide »
//   étape 2  la PRÉSENCE de la marchande (son geste sur
//            « C'est mon compte », tracé et horodaté)    → étape « consentement »
//   étape 3  le RÉ-ENRÔLEMENT — refusé tant que l'étape 2 n'est pas posée.
//
// POURQUOI EN MÉMOIRE, comme le challenge usernameless. Une session de
// récupération est courte (10 minutes, le temps de l'assistance) et ne DOIT pas
// survivre à un redémarrage : un état sensible qui dormrait sur disque serait
// un butin de plus. Le serveur redémarre → la personne reprend le parcours du
// début, le code, lui, reste valable. Aucun état persistant n'en dépend.
//
// USAGE UNIQUE. La session meurt au ré-enrôlement (consommée), à l'expiration,
// ou quand un NOUVELLE session démarre pour le même compte — une seule file
// active par marchande : reposer le code invalide l'ancienne tentative, pas
// l'inverse.
// ──────────────────────────────────────────────────────────────────────────

import { randomBytes } from 'crypto';

/** Durée de vie d'une session de récupération (10 minutes d'assistance). */
export const TTL_SESSION_RECUPERATION_MS = 10 * 60 * 1000;

/** Les étapes, dans l'ordre où elles doivent être posées — jamais sautées. */
export type EtapeRecuperation = 'code_valide' | 'consentement';

export interface SessionRecuperation {
  /** Le compte à ré-enrôler — résolu par le code, jamais par le client. */
  userId: string;
  /** Le code qui a ouvert la marche 1 — consommé à l'arrivée. */
  codeId: string;
  etape: EtapeRecuperation;
  /** L'horodatage du geste de la marchande — la trace du consentement. */
  consentementLe: Date | null;
  /**
   * Le challenge WebAuthn posé pour le ré-enrôlement (marche 3). Il vit ICI —
   * pas sur la ligne user — parce que la marchande n'a AUCUNE session : les
   * routes /webauthn/register/* existantes sont fermées derrière JwtAuthGuard,
   * et il n'est pas question de lui en ouvrir une par la fenêtre.
   */
  challengeWebauthn: string | null;
  expire: number;
}

const sessions = new Map<string, SessionRecuperation>();

/** La session existe, n'est pas périmée, et se trouve à l'étape demandée. */
export function sessionVivante(
  jeton: unknown,
  etapeAttendue: EtapeRecuperation,
  maintenant: number = Date.now(),
): SessionRecuperation | null {
  purger(maintenant);
  if (typeof jeton !== 'string' || jeton.length === 0) return null;
  const session = sessions.get(jeton);
  if (!session || session.expire <= maintenant) return null;
  if (session.etape !== etapeAttendue) return null;
  return session;
}

/**
 * Ouvre la marche 1 : le code est vérifié, la session naît à « code_valide ».
 * Toute session antérieure du même compte est écrasée — une seule file active.
 * Rend le jeton (opaque, 32 octets de hasard cryptographique).
 * L'horloge s'injecte — le banc de tests l'a appris au LOT-WA-01 : un Date.now()
 * réel dépasse toujours une horloge fictive de test, et la leçon finit en
 * catastrophe silencieuse (un test qui « passe » pour la mauvaise raison).
 */
export function ouvrirSessionRecuperation(
  userId: string,
  codeId: string,
  maintenant: number = Date.now(),
): string {
  purger(maintenant); // le registre ne grossit pas avec les tentatives
  fermerSessionsDuCompte(userId);
  const jeton = randomBytes(32).toString('hex');
  sessions.set(jeton, {
    userId,
    codeId,
    etape: 'code_valide',
    consentementLe: null,
    challengeWebauthn: null,
    expire: maintenant + TTL_SESSION_RECUPERATION_MS,
  });
  return jeton;
}

/** Pose la marche 2 : le consentement horodaté. Rend null si l'étape 1 manque. */
export function poserConsentement(
  jeton: string,
  maintenant: number = Date.now(),
): SessionRecuperation | null {
  purger(maintenant);
  const session = sessions.get(jeton);
  if (!session || session.expire <= maintenant) return null;
  if (session.etape !== 'code_valide') return null;
  session.etape = 'consentement';
  session.consentementLe = new Date(maintenant);
  return session;
}

/** Consomme la session (ré-enrôlement mené à bout) — usage unique, sans retour. */
export function consommerSessionRecuperation(jeton: string): void {
  sessions.delete(jeton);
}

/**
 * Pose le challenge WebAuthn de la marche 3 sur la session (déjà consentie).
 * Rend null si la session est morte ou pas à l'étape « consentement » — les
 * options d'enrôlement ne se donnent qu'après le geste de la marchande.
 */
export function poserChallengeWebauthn(
  jeton: string,
  challenge: string,
  maintenant: number = Date.now(),
): SessionRecuperation | null {
  purger(maintenant);
  const session = sessions.get(jeton);
  if (!session || session.expire <= maintenant) return null;
  if (session.etape !== 'consentement') return null;
  session.challengeWebauthn = challenge;
  return session;
}

/** Ferme toute session d'un compte (nouvelle tentative, ou code révoqué). */
export function fermerSessionsDuCompte(userId: string): void {
  for (const [jeton, session] of sessions) {
    if (session.userId === userId) sessions.delete(jeton);
  }
}

/** Sessions vivantes (diagnostic/test). */
export function sessionsVivantes(): number {
  return sessions.size;
}

function purger(maintenant: number): void {
  for (const [jeton, session] of sessions) {
    if (session.expire <= maintenant) sessions.delete(jeton);
  }
}
