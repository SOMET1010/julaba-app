/**
 * NIVEAU DE VOIX — combien Tantie parle, sans jamais taire l'argent. Lot B5.
 *
 * LE RÉGLAGE EST LÉGITIME : au marché, dans le bruit et devant une cliente qui
 * attend, une marchande peut vouloir entendre moins. Ce que nous refusons,
 * c'est la manière dont il avait été livré ailleurs.
 *
 * CE QUE NOUS NE REPRENONS PAS, ET POURQUOI.
 *
 *  1. `importancePourTexte(texte)` devinait l'importance par une EXPRESSION
 *     RÉGULIÈRE FRANÇAISE (« franc », « montant », « vente »…). Deux défauts,
 *     tous deux graves ici : la même donnée y prend deux sens (le catalogue
 *     déclare déjà ce qui est critique pour l'argent, et le texte le redevine
 *     autrement), et la règle devient INOPÉRANTE dès la première langue
 *     locale — en dioula, « il manque 500 francs » ne contient aucun de ces
 *     mots, donc une relecture de montant retomberait en « accompagnement »,
 *     donc en silence. L'importance vient d'ICI, du catalogue, par clé.
 *
 *  2. Un niveau 0 « silencieux » qui coupait TOUT, y compris une relecture de
 *     monnaie. Sur le chemin de l'argent, un réglage ne doit pas pouvoir faire
 *     taire une phrase que la marchande doit entendre pour compter juste. Il
 *     n'y a donc que DEUX niveaux ici, et aucun ne touche à l'argent.
 *
 *  3. « Essentiel » par défaut après connexion. Le défaut est « Complet » :
 *     on ne retire la parole à personne sans qu'elle l'ait demandé.
 *
 * LA RÈGLE DU DOUTE : une clé absente du catalogue, ou dont l'importance n'est
 * pas déclarée, retombe sur le comportement le PLUS BAVARD — jamais sur le
 * silence. Se taire est une décision ; elle exige une raison écrite.
 *
 * TOUT SILENCE EST JOURNALISÉ (limite L4 de GARDE-02) : voir l'appelant, qui
 * écrit `TTS_IGNOREE` avec la raison `niveau-voix`. Un silence qu'on ne peut
 * pas relire dans le « Rapport de test » est un silence qu'on ne peut pas
 * expliquer au terrain.
 */
import { entreeTts } from './catalog';
import type { MessageId } from './types';

/** Combien Tantie parle. Deux valeurs : il n'existe pas de niveau muet ici. */
export type NiveauVoix = 'complet' | 'essentiel';

/** On ne retire la parole à personne sans qu'elle l'ait demandé. */
export const NIVEAU_VOIX_PAR_DEFAUT: NiveauVoix = 'complet';

export const NIVEAUX_VOIX: readonly NiveauVoix[] = ['complet', 'essentiel'];

/**
 * Ce que vaut une phrase pour la décision de parler.
 * `non_declaree` n'est pas un défaut de ce module : c'est l'aveu qu'une clé
 * ne nous dit rien, et l'aveu suffit à la faire parler.
 */
export type ImportanceVoix = 'argent' | 'accompagnement' | 'non_declaree';

/**
 * L'importance d'une phrase, LUE AU CATALOGUE et nulle part ailleurs.
 *
 * Elle est DÉRIVÉE de `critiqueArgent`, une propriété qui existe déjà, qui est
 * déclarée clé par clé et qui est gardée par `test:i18n-argent`. Aucune
 * importance n'a été inventée pour les 475 clés : ce que le catalogue ne dit
 * pas, ce module ne le devine pas.
 *
 * CE QUI RESTE À DÉFINIR, et qui appartient à Patrick et Manus : le catalogue
 * ne distingue pas aujourd'hui une ALERTE NON FINANCIÈRE (« Je n'ai pas bien
 * entendu », « Ma voix ne marche pas ici ») d'un accompagnement pur
 * (« Touche-moi et dis ce que tu as vendu »). Tant qu'aucune propriété ne le
 * dit, « Essentiel » tait les deux. C'est assumé parce que ce niveau n'est
 * jamais imposé : il faut l'avoir choisi.
 */
export function importanceDeLaCle(id: MessageId): ImportanceVoix {
  const entree = entreeTts(id);
  if (!entree) return 'non_declaree';
  return entree.critiqueArgent ? 'argent' : 'accompagnement';
}

/**
 * Faut-il taire cette phrase à ce niveau ?
 *
 * L'ARGENT NE SE TAIT JAMAIS, quel que soit le niveau — c'est l'invariant de
 * ce module, et il est prouvé sur le catalogue entier par
 * `test:niveau-voix`. Une clé non déclarée ne se tait jamais non plus.
 */
export function doitTaire(niveau: NiveauVoix, importance: ImportanceVoix): boolean {
  if (importance === 'argent' || importance === 'non_declaree') return false;
  return niveau === 'essentiel';
}

/** Lit un niveau mémorisé sans transformer une absence de choix en silence. */
export function normaliserNiveau(valeur: unknown): NiveauVoix {
  return valeur === 'essentiel' ? 'essentiel' : NIVEAU_VOIX_PAR_DEFAUT;
}
