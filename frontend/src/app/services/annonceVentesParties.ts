/**
 * CE QU'ON DIT QUAND DES VENTES GARDÉES VIENNENT DE PARTIR — OFF-02.
 *
 * Module PUR : il ne parle pas, il ne vibre pas, il n'affiche rien. Il répond
 * à une seule question — « au vu de ce qui vient de passer, qu'est-ce qu'on
 * annonce, et avec quels nombres ? » — et il y répond par une CLÉ DU
 * CATALOGUE vocal, jamais par une phrase.
 *
 * POURQUOI SÉPARÉ DE L'EFFET DE SYNCHRONISATION. Le choix de la clé est la
 * partie qui a des cas : une vente ou plusieurs, une file vidée ou non. La
 * garder ici la rend lisible et exécutable sans monter une application ; et
 * l'effet, lui, reste une suite de gestes sans condition cachée.
 *
 * LES DEUX RÈGLES QU'IL TIENT, ET QUI SONT LE CŒUR D'OFF-02 :
 *
 *  1. ON NE PARLE QUE DE VENTES. L'entrée n'est pas « des opérations » : une
 *     dépense ou un ajustement de stock rejoué n'arrive jamais jusqu'ici avec
 *     un compte non nul. Zéro vente partie = `null` = SILENCE TOTAL. Annoncer
 *     une vente sur le rejeu d'une dépense serait exactement le mensonge de
 *     confirmation qu'OFF-01 vient de fermer.
 *
 *  2. ON NE DIT JAMAIS « TOUT EST PARTI ». Tant qu'il reste des ventes en
 *     file, la phrase le dit. Un compteur qui ment sur ce qui reste vaut
 *     moins qu'un silence.
 *
 * UNE SALVE = UNE ANNONCE. Trois ventes rejouées d'un coup se disent une
 * fois, avec le nombre — jamais trois fois la même phrase.
 */

import type { MessageId } from '../i18n/voice/types';

/** Les quatre clés possibles. Ce sont des identifiants du CATALOGUE vocal :
 *  elles sont écrites ici, en toutes lettres, parce que c'est ici qu'on
 *  choisit laquelle est dite — et parce qu'une clé qui n'apparaît nulle part
 *  en clair dans le code est une clé que les gardes du catalogue ne peuvent
 *  plus rattacher à son lecteur. */
export type CleAnnonceVentesParties =
  | 'TATA_VENTE_PARTIE'
  | 'TATA_VENTES_PARTIES'
  | 'TATA_VENTE_PARTIE_RESTE'
  | 'TATA_VENTES_PARTIES_RESTE';

export interface AnnonceVentesParties {
  /** L'identifiant de catalogue de la phrase à dire — jamais la phrase. */
  cle: MessageId & CleAnnonceVentesParties;
  /** Les nombres de la phrase. `reste` vaut 0 quand la file est vidée. */
  variables: { nombre: number; reste: number };
}

/**
 * @param parties   ventes réellement acceptées par le serveur dans ce tour.
 * @param restantes ventes encore en file après ce tour (succès partiel).
 * @returns `null` quand il n'y a RIEN d'honnête à annoncer.
 */
export function annonceVentesParties(parties: number, restantes: number): AnnonceVentesParties | null {
  const nombre = Math.max(0, Math.trunc(parties));
  if (nombre === 0) return null;
  const reste = Math.max(0, Math.trunc(restantes));
  const plusieurs = nombre > 1;
  const cle: CleAnnonceVentesParties = reste > 0
    ? (plusieurs ? 'TATA_VENTES_PARTIES_RESTE' : 'TATA_VENTE_PARTIE_RESTE')
    : (plusieurs ? 'TATA_VENTES_PARTIES' : 'TATA_VENTE_PARTIE');
  return { cle, variables: { nombre, reste } };
}
