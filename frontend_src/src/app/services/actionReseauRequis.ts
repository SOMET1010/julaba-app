/**
 * ACTIONS QUI EXIGENT LE RÉSEAU — refus DIT, jamais un échec technique. B4.
 *
 * LE DÉFAUT. Les actions de commande (annuler, confirmer, refuser, marquer
 * livrée, répondre à une contre-offre) partent droit au serveur. Sans réseau,
 * `fetch` lève un `TypeError: Failed to fetch`, et l'écran faisait
 * `speak(e.message)` : la marchande entendait « Failed to fetch ». Elle ne
 * pouvait ni comprendre, ni savoir que son geste n'était pas parti, ni savoir
 * qu'il fallait recommencer plus tard. Elle rappuyait.
 *
 * DEUX MOMENTS, PAS UN — leçon d'OFF-01. `navigator.onLine === true` ne veut
 * pas dire que le réseau marche ; ne poser la question qu'AVANT laisserait
 * entier le cas le plus fréquent au marché : le téléphone se croit connecté et
 * l'envoi tombe quand même. On traite donc les deux :
 *   1. `reseauIndisponible()` — on SAIT déjà qu'il n'y a pas de réseau :
 *      on refuse tout de suite, sans appeler le serveur ;
 *   2. `causeEchec(erreur)` — l'envoi est parti et il est tombé : on classe.
 *
 * CLASSÉ PAR STATUT HTTP, JAMAIS PAR LE TEXTE — même doctrine que
 * `doitEnfiler` dans le contexte de caisse. Un 4xx est une VRAIE réponse du
 * serveur : son message est métier (« Le paiement ne peut être encaissé
 * qu'après livraison confirmée ») et doit rester dit tel quel. Un 5xx, ou une
 * erreur sans statut (réseau coupé, DNS, jeton), est un problème de transport.
 *
 * CE QUE CE MODULE NE FAIT PAS, ET C'EST VOULU : il ne met rien en file. Une
 * action de commande n'est pas une vente — elle se négocie à deux, son sens
 * dépend de l'état du serveur au moment où elle part. La rejouer plus tard
 * sans que la marchande le sache serait pire que de lui dire non maintenant.
 */

/** Pourquoi une action de commande n'a pas abouti. */
export type CauseEchecReseau = 'hors_ligne' | 'envoi_tombe';

/**
 * Sait-on DÉJÀ qu'il n'y a pas de réseau ?
 *
 * FAIL OPEN, délibérément : hors navigateur, ou si `onLine` est inconnu, on
 * répond « non » et on laisse l'action tenter sa chance. Refuser sur un doute
 * bloquerait une marchande parfaitement connectée ; l'échec réel, lui, est
 * rattrapé par `causeEchec`.
 */
export function reseauIndisponible(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Classe un échec d'action de commande.
 * `null` = le serveur a répondu et sa réponse est métier : son message doit
 * être dit tel quel, il porte une information que nous n'avons pas.
 */
export function causeEchec(erreur: unknown): CauseEchecReseau | null {
  if (reseauIndisponible()) return 'hors_ligne';
  const status = (erreur as { status?: unknown } | null)?.status;
  if (typeof status === 'number') return status >= 500 ? 'envoi_tombe' : null;
  return 'envoi_tombe'; // pas de statut HTTP : transport, pas métier
}
