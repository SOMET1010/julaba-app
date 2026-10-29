/**
 * LA DERNIÈRE LECTURE DE L'HISTORIQUE A-T-ELLE ABOUTI ? — HIST-01.
 *
 * POURQUOI CE MODULE EXISTE. `AppContext.reloadTransactions` avale l'échec
 * réseau (`catch { console.warn(…) }`) : la liste reste vide, et l'écran
 * « Mes ventes » écrivait « Pas encore de ventes enregistrées » avec quatre
 * zéros. Patrick avait vendu. Un tableau vide ne dit pas POURQUOI il est vide ;
 * cette information-là existait et se perdait.
 *
 * POURQUOI PAS DANS AppContext. Ce fichier est sous garde-fou d'empreinte
 * (`scripts/test-voix-trace-source.mjs`, VOICE-01) : on n'a le droit d'y
 * ajouter que des lignes de journal de voix, et régénérer la référence pour
 * s'ouvrir le passage serait exactement ce qu'un garde-fou existe pour
 * empêcher. On note donc le fait LÀ OÙ IL SE PRODUIT : dans la couche API,
 * qui est le seul endroit qui sache si le serveur a répondu — et c'est de
 * toute façon la bonne place, tous les appelants en profitent.
 *
 * CE QUE CE MODULE NE FAIT PAS. Il ne lit rien, n'appelle rien, ne conserve
 * aucune donnée d'argent : un état, quatre valeurs, et des abonnés. Il
 * n'influence AUCUN calcul — seulement ce que l'écran a le droit d'affirmer.
 */
import type { LectureHistorique } from './etatVentesPassees';

let etat: LectureHistorique = 'jamais';
const abonnes = new Set<(e: LectureHistorique) => void>();

/** Où en est la dernière lecture de l'historique des transactions. */
export function lectureHistorique(): LectureHistorique {
  return etat;
}

/** Noté par la couche API — succès comme échec. Une écriture identique ne
 *  réveille personne : un rendu de plus n'apprend rien à la marchande. */
export function noterLectureHistorique(nouvel: LectureHistorique): void {
  if (nouvel === etat) return;
  etat = nouvel;
  for (const f of [...abonnes]) {
    try { f(etat); } catch { /* un abonné qui casse ne casse pas les autres */ }
  }
}

/** S'abonner aux changements. Rend la fonction de désabonnement. */
export function surLectureHistorique(f: (e: LectureHistorique) => void): () => void {
  abonnes.add(f);
  return () => { abonnes.delete(f); };
}

/** Remise à zéro — changement de compte, ou banc de test. « jamais » veut dire
 *  « on ne sait rien », ce qui n'est PAS « il n'y a rien ». */
export function oublierLectureHistorique(): void {
  noterLectureHistorique('jamais');
}
