/**
 * CE QUE L'ACCUEIL A LE DROIT D'AFFIRMER SUR LA CAISSE — ACC-01.
 *
 * LE DÉFAUT QU'ON FERME. Banc terrain, écran 4 : « ZÉRO QUI MENT — l'écran a
 * demandé au serveur, n'a rien obtenu, et affirme quand même "0 F" ». C'est
 * l'écran que toute marchande voit à chaque ouverture, et le premier chiffre
 * qu'elle y lit est celui de son argent.
 *
 * D'OÙ VENAIT LE ZÉRO. `MarchandAccueilVoice` lisait `stats?.caisse || 0`, et
 * `getTodayStats` calcule `(currentSession?.fondInitial || 0) + encaisse −
 * cahier`. Sans réseau, `transactions` reste `[]` et `currentSession` `null` :
 * les trois termes valent zéro, et la soustraction rend un zéro parfaitement
 * formé. Rien n'est cassé, rien n'est signalé — c'est pire qu'une erreur.
 *
 * LA RÈGLE, MOT POUR MOT : inconnu / non chargé / erreur ≠ 0.
 * Et la règle d'architecture dont elle découle : « toute information qui a une
 * incidence sur l'argent doit être soit conservée, soit explicitement marquée
 * comme perdue ; jamais reconstruite implicitement en aval. »
 *
 * CE MODULE NE CALCULE AUCUN MONTANT — il reçoit celui que `getTodayStats`
 * produit déjà, intact, et se contente de dire si l'écran a le DROIT de
 * l'afficher. Le calcul métier n'est pas touché ; c'est ce qu'on en affirme
 * qui change.
 *
 * LA FORME DU TYPE EST LA GARANTIE. Sur les branches non résolues, le champ
 * `montant` N'EXISTE PAS : aucun écran ne peut l'afficher par mégarde, et le
 * compilateur le refuse avant le banc. C'est le même dessin que
 * `voice-offline/perteSemantique.ts` — une valeur absente ne se lit pas.
 *
 * Jumeau de `etatVentesPassees.ts` (HIST-01), volontairement : deux écrans,
 * une seule façon de dire « je ne sais pas ».
 */
import type { LectureHistorique } from './etatVentesPassees';

/** Ce que l'accueil a le droit d'affirmer sur « Ma caisse aujourd'hui ». */
export type EtatCaisseAccueil =
  /** On n'a pas encore de réponse. Ni chiffre, ni zéro. */
  | { readonly type: 'attente'; readonly ventesEnFile: number }
  /** On a demandé, on n'a rien obtenu, et rien en mémoire. « — ». */
  | { readonly type: 'illisible'; readonly ventesEnFile: number }
  /** Un chiffre existe mais il est INCOMPLET : lu avant une panne, ou bien des
   *  ventes dorment encore sur le téléphone. C'est un PLANCHER, pas un total. */
  | { readonly type: 'partielle'; readonly montant: number; readonly ventesEnFile: number }
  /** Le serveur a répondu et le téléphone n'a rien en retard : le chiffre est
   *  le chiffre. Y compris quand il vaut zéro — ce zéro-là est une réponse. */
  | { readonly type: 'connue'; readonly montant: number; readonly ventesEnFile: number };

export interface FaitsCaisseAccueil {
  /** Où en est la dernière lecture du serveur (services/lectureHistorique.ts). */
  readonly lecture: LectureHistorique;
  /** Le montant que `getTodayStats().caisse` vient de produire. NON RECALCULÉ. */
  readonly montant: number;
  /** Le calcul repose-t-il sur quelque chose de réellement lu ? (transactions
   *  reçues, ou session du jour connue). Faux = les termes valaient zéro parce
   *  qu'ils étaient vides, pas parce que la caisse est vide. */
  readonly aDesDonnees: boolean;
  /** Combien de VENTES attendent d'être envoyées depuis ce téléphone. */
  readonly ventesEnFile: number;
}

export function etatCaisseAccueil(faits: FaitsCaisseAccueil): EtatCaisseAccueil {
  const ventesEnFile = Math.max(0, Math.trunc(faits.ventesEnFile) || 0);

  // Un montant qui n'est pas un nombre fini n'est pas un montant. Le laisser
  // passer le ferait afficher « NaN F », ou pire, arrondir à zéro plus bas.
  if (!Number.isFinite(faits.montant)) return { type: 'illisible', ventesEnFile };

  // L'ÉCHEC. S'il existe un chiffre lu AVANT la panne, on ne l'efface pas —
  // cet argent a existé. Mais on ne le présente plus comme le total.
  if (faits.lecture === 'echec') {
    return faits.aDesDonnees
      ? { type: 'partielle', montant: faits.montant, ventesEnFile }
      : { type: 'illisible', ventesEnFile };
  }

  // AVANT LA PREMIÈRE RÉPONSE. Ne rien savoir n'est pas savoir qu'il n'y a rien.
  if (faits.lecture === 'jamais' || faits.lecture === 'chargement') {
    return faits.aDesDonnees
      ? { type: 'partielle', montant: faits.montant, ventesEnFile }
      : { type: 'attente', ventesEnFile };
  }

  // LE SERVEUR A RÉPONDU — mais s'il reste des ventes non envoyées sur ce
  // téléphone, le serveur ne les connaît pas : son total est un plancher.
  return ventesEnFile > 0
    ? { type: 'partielle', montant: faits.montant, ventesEnFile }
    : { type: 'connue', montant: faits.montant, ventesEnFile };
}
