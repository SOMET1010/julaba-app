/**
 * Vente guidée — DIALOGUES de Tata (module PUR, sans React ni DOM).
 *
 * Transforme une ligne provisoire (+ l'état) en la phrase EXACTE que Tata dit et
 * affiche, d'après docs/SPEC_VENTE_VOCALE.md §6. Séparé de l'UI pour être testé
 * au tsx et réutilisé à l'identique par la voix (clips/synthèse) et le tactile.
 */
import { quantiteAvecUnite } from '../utils/unite.utils';
import type { LigneProvisoire } from './ligneProvisoire.js';

function fr(n: number): string {
  return Math.round(n).toLocaleString('fr-FR');
}

/** Pluriel français simple : +s sauf si le mot finit déjà par s, x ou z. */
function pluriel(mot: string): string {
  return /[sxz]$/i.test(mot) ? mot : `${mot}s`;
}
/** Abréviations d'unité invariables (« 2 kg », pas « 2 kgs »). */
const UNITES_INVARIABLES = new Set(['kg', 'g', 'mg', 'l', 'cl', 'ml', 'dl', 'm', 'cm', 'mm', 'km']);
function plurielUnite(u: string): string {
  return UNITES_INVARIABLES.has(u.toLowerCase()) ? u : pluriel(u);
}
/** Pluralise le DERNIER mot d'un libellé (« banane plantain » → « banane plantains »).
 *  Exporté : la confirmation de vente d'intentLocal (« Vente de 2 tomates ») l'utilise aussi. */
export function plurielNom(nom: string): string {
  const mots = nom.trim().split(' ');
  if (mots.length === 0) return nom;
  mots[mots.length - 1] = pluriel(mots[mots.length - 1]);
  return mots.join(' ');
}

/**
 * « 3 tas de tomate » / « 2 tomates » (unité omise si « unité » générique).
 * Accord : AVEC unité, on pluralise l'unité et le produit reste au singulier
 * (« 3 sacs de riz ») ; SANS unité, on pluralise le produit (« 2 tomates »).
 */
export function resumeQuantite(ligne: LigneProvisoire): string {
  const multiple = ligne.quantite > 1;
  const uniteVisible = ligne.unite && ligne.unite !== 'unité' && ligne.unite !== 'unite';
  if (uniteVisible) {
    const u = multiple ? plurielUnite(ligne.unite) : ligne.unite;
    return `${ligne.quantite} ${u} de ${ligne.nomAffiche}`.replace(/\s+/g, ' ').trim();
  }
  const nom = multiple ? plurielNom(ligne.nomAffiche) : ligne.nomAffiche;
  return `${ligne.quantite} ${nom}`.replace(/\s+/g, ' ').trim();
}

/** Résumé chiffré selon l'interprétation : « … à 500 F » (unitaire) / « … pour 1 500 F » (total). */
export function resumeLigne(ligne: LigneProvisoire): string {
  const base = resumeQuantite(ligne);
  if (ligne.interpretationPrix === 'unitaire' && ligne.prixUnitaire != null) {
    return `${base} à ${fr(ligne.prixUnitaire)} F`;
  }
  if (ligne.interpretationPrix === 'total' && ligne.total != null) {
    return `${base} pour ${fr(ligne.total)} F`;
  }
  return base; // prix non résolu
}

export const INVITE = 'Touche-moi et dis ce que tu as vendu.';
export const RIEN_COMPRIS = "Je n'ai pas bien entendu. Rapproche le téléphone et redis lentement.";
export const AJOUT_PANIER = "C'est dans le panier. Tu ajoutes autre chose, ou tu encaisses ?";
export const ANNULATION_ETAPE = "D'accord, on oublie ça. Le panier n'a pas bougé.";

/**
 * Relecture de ce qui a été COMPRIS, dite AVANT de confirmer.
 *
 * Pourquoi cette phrase existe : l'écran affichait « TU AS DIT … » en toutes
 * lettres. Pour une marchande qui ne lit pas, c'est du vide — et c'est
 * précisément l'étape où elle doit pouvoir corriger. Elle entendait seulement
 * « c'est dans le panier » : la confirmation qu'il s'est passé QUELQUE CHOSE,
 * jamais QUOI. Rien ne lui permettait d'entendre l'écart entre « cinq
 * tomates » et « quinze tomates » — sur un chemin d'argent, une vente fausse
 * qu'on ne peut pas rattraper.
 *
 * La quantité et le montant sont variables : aucun clip enregistré ne peut les
 * couvrir. Cette phrase n'est donc prononçable que depuis l'arrivée de la
 * synthèse hors-ligne.
 *
 * POURQUOI PAS `resumeLigne` TELLE QUELLE : elle est écrite pour l'ÉCRAN et
 * finit par « … pour 1 500 F ». Prononcé par la synthèse, ce « F » se dit
 * comme une lettre. Une phrase entendue n'est pas une phrase lue : on écrit
 * « francs » en toutes lettres. Le pluriel et le formatage des nombres, eux,
 * sont bien repris de l'existant (`plurielNom`, `fr`) — on ne réécrit que ce
 * qui doit différer.
 */
export function phraseCompris(args: {
  nom: string;
  quantite: number;
  total: number;
  /** Unité de la ligne — « tas », « sac », « kg »… Facultative : une vente
   *  d'avant le 19/09/2026, ou un article libre, n'en a pas. */
  unite?: string | null;
}): string {
  // L'UNITÉ SE DIT — arbitrage de Patrick, 19/09/2026. « J'ai compris : 3
  // tomates » et « J'ai compris : 3 tas de tomate » ne décrivent pas la même
  // vente, et l'écart peut valoir plusieurs milliers de francs. C'est ici, au
  // moment où elle peut encore corriger, que l'unité doit s'entendre — pas sur
  // un reçu qu'elle ne lira jamais.
  const nom = args.quantite > 1 ? plurielNom(args.nom) : args.nom;
  const quantite = uniteParlable(args.unite)
    ? `${quantiteAvecUnite(args.quantite, args.unite)} de ${args.nom}`
    : `${args.quantite} ${nom}`;
  return `J'ai compris : ${quantite} pour ${fr(args.total)} francs. ${AJOUT_PANIER}`;
}

/** Une unité mérite-t-elle d'être prononcée ? « unité » n'apprend rien. */
function uniteParlable(u?: string | null): boolean {
  if (!u) return false;
  const n = String(u).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return n !== '' && n !== 'unite' && n !== 'unites';
}
export const ERREUR_MOTEUR = "Ma voix ne marche pas ici. Tape ta vente, je t'accompagne.";

/** Question quand le prix manque (§6). */
export function phrasePrixManquant(): string { return 'Et c\'est à combien ?'; }

/** Question quand la quantité manque (§6). */
export function phraseQuantiteManquante(nomProduit: string): string {
  return `Combien de ${nomProduit || 'ce produit'} ?`;
}

/** Question d'ambiguïté prix unitaire/total (§5/§6) : « 1 500 francs, c'est le prix d'un seul, ou de tous les 3 ? » */
export function phraseAmbiguite(quantite: number, montant: number): string {
  return `${fr(montant)} francs, c'est le prix d'un seul, ou de tous les ${quantite} ?`;
}

/**
 * Phrase de RÉPÉTITION / confirmation (§6), selon l'état de la ligne :
 * - unitaire : « J'ai compris : {q} {produit} à {prix} francs. Total : {total} francs. C'est bon ? »
 * - total    : « J'ai compris : {q} {produit} pour {total} francs. C'est bon ? »
 * - a_confirmer sans prix : demande le prix (« Et c'est à combien ? »).
 */
export function phraseConfirmation(ligne: LigneProvisoire): string {
  const base = resumeQuantite(ligne);
  if (ligne.interpretationPrix === 'unitaire' && ligne.prixUnitaire != null && ligne.total != null) {
    return `J'ai compris : ${base} à ${fr(ligne.prixUnitaire)} francs. Total : ${fr(ligne.total)} francs. C'est bon ?`;
  }
  if (ligne.interpretationPrix === 'total' && ligne.total != null) {
    return `J'ai compris : ${base} pour ${fr(ligne.total)} francs. C'est bon ?`;
  }
  return phrasePrixManquant();
}

/** Après une correction (§6) : « D'accord : {résumé}. C'est bon ? » */
export function phraseCorrectionRecue(ligne: LigneProvisoire): string {
  return `D'accord : ${resumeLigne(ligne)}. C'est bon ?`;
}
