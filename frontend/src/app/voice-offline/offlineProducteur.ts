// ──────────────────────────────────────────────────────────────────────────
// offlineProducteur.ts — LA FILE HORS-LIGNE DU PRODUCTEUR (BUG-008).
//
// CE QU'ON RÉPARE. Les créations de récolte et de publication appelaient
// l'API en direct, sans outbox ni idempotence : une coupure réseau après la
// saisie = la récolte DISPARAISSAIT — le travail d'un producteur au champ,
// perdu parce que le réseau a clignoté. La caisse ne perd plus ses ventes
// depuis longtemps (offlineCaisse, ARG-03) : le producteur mérite la même
// discipline, pas une copie approximative.
//
// CE QUE CE MODULE N'INVENTE PAS. Rien. La machine à rejouer — rejeu ordonné,
// clés d'idempotence, cloisonnement strict par propriétaire (P0-1), 4xx
// lettre morte + on continue, transitoire = essais comptés puis lettre morte
// au CAP, rejeu ATOMIQUE IndexedDB — vit DÉJÀ dans `offlineCaisse`, testée
// sur l'argent. Ce module en est l'EMPRUNT : il ouvre ses PROPRES magasins
// dans la même base (`producteur_outbox`, `producteur_dead` — migration
// additive v3), il pointe ses deux endpoints (`/recoltes`,
// `/publications`), et toute la sémantique vient du même code. Deux files
// qui ne se voient jamais, une seule vérité sur ce qu'est un rejeu.
// ──────────────────────────────────────────────────────────────────────────

import {
  enfilerOperation,
  synchroniser,
  surMiseEnFile,
  lettresMortes,
  nbEnAttente,
  nbEchecs,
  purgerLettreMorte,
  idbOutboxStore,
  memoryOutboxStore,
  type OutboxStore,
  type OperationCaisse,
  type LettreMorte,
  type BilanSynchronisation,
  type OfflineMethod,
} from './offlineCaisse';

// Les magasins du producteur — MÊME base IndexedDB, magasins à lui.
// Les constantes naissent dans offlineCaisse (l'openDb crée les quatre stores).
import { STORE_PRODUCTEUR, DEAD_PRODUCTEUR } from './offlineCaisse';

let _storeProducteur: OutboxStore | null = null;

/** La file du producteur en production (IndexedDB). Un singleton — la file
 *  est UNIQUE par navigateur, comme la caisse. */
export function storeProducteur(): OutboxStore {
  if (!_storeProducteur) _storeProducteur = idbOutboxStore(STORE_PRODUCTEUR, DEAD_PRODUCTEUR);
  return _storeProducteur;
}

/** File en mémoire — tests purs uniquement, JAMAIS en production. */
export function storeProducteurMemoire(): OutboxStore {
  return memoryOutboxStore();
}

/** Une récolte dictée ou tapée au champ, mise en file avec SON propriétaire
 *  (estUnUtilisateurReel est la même garde que la caisse — jamais d'« anon »).
 *  La clé d'idempotence vit dans le payload : rejeu = même clé = un seul
 *  enregistrement côté serveur. */
export async function enfilerRecolte(
  payload: unknown,
  userId: string | undefined | null,
  store: OutboxStore = storeProducteur(),
): Promise<string> {
  return enfilerOperation('/recoltes', payload, userId, store, 'POST');
}

/** Une publication mise en file — même discipline, même garde. */
export async function enfilerPublication(
  payload: unknown,
  userId: string | undefined | null,
  store: OutboxStore = storeProducteur(),
): Promise<string> {
  return enfilerOperation('/publications', payload, userId, store, 'POST');
}

/** Un tour de rejeu des écritures producteur — LA sémantique de la caisse
 *  (4xx lettre morte et on continue, transitoire = essais comptés, ordre
 *  préservé, cloisonnement strict par propriétaire). Le poster est fourni
 *  par le contexte : c'est lui qui sait parler aux vraies routes. */
export function synchroniserProducteur(
  poster: (endpoint: '/recoltes' | '/publications', payload: unknown, method: OfflineMethod) => Promise<void>,
  currentUserId: string,
  store: OutboxStore = storeProducteur(),
): Promise<BilanSynchronisation> {
  return synchroniser(poster, currentUserId, store);
}

export async function nbEnAttenteProducteur(userId: string, store: OutboxStore = storeProducteur()): Promise<number> {
  return nbEnAttente(userId, store);
}

export async function nbEchecsProducteur(userId: string, store: OutboxStore = storeProducteur()): Promise<number> {
  return nbEchecs(userId, store);
}

export async function lettresMortesProducteur(userId: string, store: OutboxStore = storeProducteur()): Promise<LettreMorte[]> {
  return lettresMortes(userId, store);
}

/** Retire une lettre morte DU PRODUCTEUR — la vérification de propriété est
 *  celle d'offlineCaisse (P0-1), on ne purge jamais l'opération d'un autre. */
export async function purgerLettreMorteProducteur(id: string, userId: string, store: OutboxStore = storeProducteur()): Promise<void> {
  return purgerLettreMorte(id, userId, store);
}

/** S'abonner aux mises en file du producteur (arme la relance du contexte). */
export { surMiseEnFile };

export type { OutboxStore, OperationCaisse, LettreMorte, BilanSynchronisation };
