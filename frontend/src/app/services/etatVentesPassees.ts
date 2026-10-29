/**
 * CE QUE « MES VENTES » A LE DROIT D'AFFIRMER — HIST-01.
 *
 * LE DÉFAUT QU'ON FERME. `reloadTransactions` (contexts/AppContext.tsx) avalait
 * l'échec réseau : `catch { console.warn(…) }`. La liste restait vide et
 * l'écran écrivait « Pas encore de ventes enregistrées » et quatre zéros.
 * Patrick a fait des ventes ; son téléphone lui répondait qu'il n'en avait
 * aucune. La vérité était « je n'ai pas pu demander ». Un zéro est une
 * RÉPONSE, pas une absence de réponse — la règle est déjà écrite dans
 * AppContext à propos du bénéfice (`??` et non `||`) ; elle vaut ici aussi.
 *
 * LE SECOND TROU. L'historique est entièrement serveur. Une vente encore dans
 * la file hors ligne (voir `voice-offline/`) n'apparaît nulle part : la
 * marchande vend, regarde ses ventes, ne voit rien, et conclut que
 * l'application a perdu son argent.
 *
 * CE MODULE NE CALCULE AUCUN MONTANT. Il ne fait qu'une chose : dire lequel
 * des TROIS états l'écran a le droit d'affirmer, à partir de trois faits
 * observés ailleurs. Il est pur, sans DOM et sans réseau, pour que la règle
 * soit prouvable seule (etatVentesPassees.test.mts) — et pour qu'elle ne soit
 * pas éparpillée dans du JSX, là où personne ne la relit.
 *
 * Les phrases sont des CLÉS de catalogue (i18n/voice/catalog.ts), jamais du
 * texte : elles portent sur l'argent, elles doivent pouvoir être dites, et
 * traduites.
 */
import type { MessageId } from '../i18n/voice/types';

/** Où en est la DERNIÈRE tentative de lecture de l'historique serveur.
 *  `jamais` : rien n'a encore été demandé (premier rendu).
 *  `chargement` : une requête est en vol.
 *  `lu` : le serveur a répondu — sa réponse fait foi, y compris « rien ».
 *  `echec` : la requête a échoué. On ne sait pas. On ne dit pas zéro. */
export type LectureHistorique = 'jamais' | 'chargement' | 'lu' | 'echec';

/** Ce que l'écran a le droit d'affirmer. Les trois états de la mission, plus
 *  l'attente — jamais confondus, jamais repliés l'un sur l'autre. */
export type EtatVentesPassees =
  /** On n'a pas encore de réponse : ni liste, ni zéro, ni « rien vendu ». */
  | { readonly type: 'attente'; readonly ventesEnFile: number }
  /** « Je n'ai pas pu demander. » La seule chose vraie quand la requête casse. */
  | { readonly type: 'illisible'; readonly ventesEnFile: number }
  /** Le serveur a répondu, et il n'a rien : là SEULEMENT « pas encore de vente ». */
  | { readonly type: 'vide'; readonly ventesEnFile: number }
  /** Le serveur a répondu et il y a des ventes à montrer. */
  | { readonly type: 'liste'; readonly nbVentes: number; readonly ventesEnFile: number };

export interface FaitsVentesPassees {
  /** Résultat de la dernière lecture de l'historique (AppContext). */
  readonly lecture: LectureHistorique;
  /** Combien de ventes la liste affichée porte, une fois les filtres passés. */
  readonly nbVentes: number;
  /** Combien de VENTES dorment dans la file hors ligne (jamais les dépenses). */
  readonly ventesEnFile: number;
}

/** L'état affichable, et lui seul. Aucun montant n'entre ni ne sort d'ici. */
export function etatVentesPassees(faits: FaitsVentesPassees): EtatVentesPassees {
  const ventesEnFile = Math.max(0, Math.trunc(faits.ventesEnFile) || 0);
  // L'ÉCHEC PRIME SUR TOUT, même sur une liste déjà à l'écran : une liste
  // périmée présentée comme à jour est le mensonge qu'on ferme. Mais il ne
  // prime pas sur une liste NON VIDE lue avant lui — voir ci-dessous.
  if (faits.lecture === 'echec') {
    // Nuance mesurée : si une lecture précédente a rempli la liste, ces ventes
    // ONT existé, on ne les efface pas. On les montre, et l'écran dira par
    // ailleurs qu'il n'a pas pu rafraîchir. Ce qu'on interdit, c'est le ZÉRO.
    return faits.nbVentes > 0
      ? { type: 'liste', nbVentes: faits.nbVentes, ventesEnFile }
      : { type: 'illisible', ventesEnFile };
  }
  if (faits.lecture === 'jamais' || faits.lecture === 'chargement') {
    return faits.nbVentes > 0
      ? { type: 'liste', nbVentes: faits.nbVentes, ventesEnFile }
      : { type: 'attente', ventesEnFile };
  }
  return faits.nbVentes > 0
    ? { type: 'liste', nbVentes: faits.nbVentes, ventesEnFile }
    : { type: 'vide', ventesEnFile };
}

/**
 * LES QUATRE COMPTEURS ONT-ILS LE DROIT D'AFFICHER UN CHIFFRE ?
 *
 * Non tant que le serveur n'a pas répondu. `0` se lit « tu n'as rien gagné » ;
 * c'est une affirmation sur l'argent déjà gagné, et on ne l'a pas.
 */
export function chiffresLisibles(lecture: LectureHistorique): boolean {
  return lecture === 'lu';
}

/** Ce qu'un compteur montre quand on n'a pas la réponse : un tiret, pas un zéro. */
export const CHIFFRE_INCONNU = '—';

export interface AnnonceVentesPassees {
  readonly cle: MessageId;
  readonly variables: Readonly<Record<string, string | number>>;
}

/** La phrase de L'ÉTAT — celle qui remplace « Pas encore de ventes
 *  enregistrées » quand ce n'est pas vrai. `null` quand il y a une liste :
 *  la liste se suffit. */
export function annonceEtat(etat: EtatVentesPassees): AnnonceVentesPassees | null {
  if (etat.type === 'illisible') return { cle: 'TATA_VENTES_PAS_LUES', variables: {} };
  if (etat.type === 'attente') return { cle: 'TATA_VENTES_LECTURE_EN_COURS', variables: {} };
  if (etat.type === 'vide') return { cle: 'TATA_VENTES_AUCUNE', variables: {} };
  return null;
}

/** La phrase de LA FILE — dite en plus de l'état, jamais à sa place : une
 *  vente en attente d'envoi n'est ni une absence de vente ni un échec de
 *  lecture. `null` quand la file ne porte aucune vente. */
export function annonceFile(etat: EtatVentesPassees): AnnonceVentesPassees | null {
  if (etat.ventesEnFile <= 0) return null;
  return etat.ventesEnFile === 1
    ? { cle: 'TATA_VENTE_EN_ATTENTE_ENVOI', variables: {} }
    : { cle: 'TATA_VENTES_EN_ATTENTE_ENVOI', variables: { nombre: etat.ventesEnFile } };
}

/**
 * CE QUE LE BOUTON « ÉCOUTER LE TOTAL » A LE DROIT DE DIRE.
 *
 * Il disait « Tu as vendu 0 francs, sur 0 vente » quand la requête avait
 * échoué — le même mensonge, à l'oreille cette fois, et pour une marchande qui
 * ne lit pas c'est le SEUL canal. Quand on ne sait pas, on le dit.
 */
export function annonceTotal(
  etat: EtatVentesPassees,
  montants: { readonly total: number; readonly nombre: number },
): AnnonceVentesPassees {
  if (etat.type === 'illisible') return { cle: 'TATA_VENTES_PAS_LUES', variables: {} };
  if (etat.type === 'attente') return { cle: 'TATA_VENTES_LECTURE_EN_COURS', variables: {} };
  if (etat.type === 'vide') return { cle: 'TATA_VENTES_AUCUNE', variables: {} };
  return montants.nombre > 1
    ? { cle: 'TATA_TOTAL_VENTES', variables: { total: montants.total, nombre: montants.nombre } }
    : { cle: 'TATA_TOTAL_VENTE', variables: { total: montants.total } };
}
