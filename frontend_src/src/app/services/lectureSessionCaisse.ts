/**
 * LA JOURNÉE DE CAISSE A-T-ELLE ÉTÉ LUE ? — ACC-03.
 *
 * LE DÉFAUT QU'ON FERME. Terrain du 03/10/2026, APK `614c75e`. À l'ouverture,
 * la voix annonce « Ta caisse aujourd'hui : zéro franc », et six secondes plus
 * tard la même annonce donne 100 F. L'écran, lui, se corrige tout seul. Mais
 * ce qui est DIT est dit : elle a entendu qu'elle n'avait rien.
 *
 * Reproduit hors téléphone, en trois lignes, sur `etatCaisseAccueil` :
 *
 *     { lecture: 'lu', montant: 0, aDesDonnees: false, ventesEnFile: 0 }
 *         → { type: 'connue', montant: 0 }     → DIT À VOIX HAUTE
 *
 * POURQUOI `lu` NE SUFFISAIT PAS, ET C'EST TOUT LE MODULE. `getTodayStats`
 * calcule `(currentSession?.fondInitial || 0) + encaisse − cahier`. Ce total
 * repose donc sur DEUX lectures réseau distinctes : les transactions
 * (`fetchCaisseTransactions`) et la journée de caisse (`fetchSessionDuJour`).
 * Or `noterLectureHistorique('lu')` ne parle QUE des transactions. À l'instant
 * où elle est posée, le fond initial n'est pas encore là : le calcul rend un
 * zéro parfaitement formé, et l'accueil le prend pour une réponse.
 *
 * « lu » voulait donc dire deux choses : « le serveur a répondu sur les
 * ventes » et « le montant est complet ». **Ne jamais donner deux sens à la
 * même donnée** — alors on en fait deux.
 *
 * POURQUOI UN JUMEAU ET PAS UN DRAPEAU DE PLUS DANS `lectureHistorique`.
 * Les deux lectures échouent séparément, réussissent séparément, et portent
 * des faits différents. Les fondre rendrait impossible de dire « j'ai les
 * ventes, pas le fond » — c'est-à-dire exactement l'état qui a fait mentir
 * l'application.
 *
 * POURQUOI PAS DANS `AppContext`. Même raison qu'`HIST-01`, mot pour mot :
 * `contexts/AppContext.tsx` est sous garde-fou d'empreinte (VOICE-01), on n'a
 * le droit d'y ajouter que des lignes de journal de voix, et régénérer la
 * référence pour s'ouvrir le passage serait précisément ce qu'un garde-fou
 * existe pour empêcher. Le fait est donc noté LÀ OÙ IL SE PRODUIT, dans la
 * couche API — qui est de toute façon le seul endroit qui sache si le serveur
 * a répondu. `AppContext:519` avale l'échec par un `.catch(() => null)` : vu
 * d'en haut, « pas de session » et « pas de réponse » sont indiscernables.
 *
 * UNE SESSION ABSENTE EST UNE RÉPONSE. Si le serveur répond `{ session: null }`,
 * la lecture vaut `lu` : elle n'a pas ouvert sa journée, et c'est un fait,
 * pas une ignorance. Ce module ne dit pas s'il Y A une session — il dit si on
 * a pu DEMANDER.
 *
 * CE MODULE NE CALCULE RIEN et ne conserve aucune donnée d'argent : un état,
 * quatre valeurs, des abonnés. Il n'influence AUCUN calcul — seulement ce que
 * l'écran a le droit d'affirmer.
 */
import type { LectureHistorique } from './etatVentesPassees';

/** Les mêmes quatre valeurs que l'historique : `jamais`, `chargement`, `lu`,
 *  `echec`. Même vocabulaire pour deux lectures sœurs — un seul mot à
 *  comprendre, et les deux écrans se relisent pareil. */
export type LectureSession = LectureHistorique;

let etat: LectureSession = 'jamais';
const abonnes = new Set<(e: LectureSession) => void>();

/** Où en est la dernière lecture de la journée de caisse. */
export function lectureSessionCaisse(): LectureSession {
  return etat;
}

/** Noté par la couche API — succès comme échec. Une écriture identique ne
 *  réveille personne : un rendu de plus n'apprend rien à la marchande. */
export function noterLectureSessionCaisse(nouvel: LectureSession): void {
  if (nouvel === etat) return;
  etat = nouvel;
  for (const f of [...abonnes]) {
    try { f(etat); } catch { /* un abonné qui casse ne casse pas les autres */ }
  }
}

/** S'abonner aux changements. Rend la fonction de désabonnement. */
export function surLectureSessionCaisse(f: (e: LectureSession) => void): () => void {
  abonnes.add(f);
  return () => { abonnes.delete(f); };
}

/** Remise à zéro — changement de compte, ou banc de test. « jamais » veut dire
 *  « on ne sait rien », ce qui n'est PAS « il n'y a rien ». */
export function oublierLectureSessionCaisse(): void {
  noterLectureSessionCaisse('jamais');
}
