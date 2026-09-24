/**
 * Vente guidée — DIALOGUES de Tata (module PUR, sans React ni DOM).
 *
 * Transforme une ligne provisoire (+ l'état) en la phrase EXACTE que Tata dit et
 * affiche, d'après docs/SPEC_VENTE_VOCALE.md §6. Séparé de l'UI pour être testé
 * au tsx et réutilisé à l'identique par la voix (clips/synthèse) et le tactile.
 */
import { quantiteAvecUnite } from '../utils/unite.utils';
import type { LigneProvisoire } from './ligneProvisoire.js';
import { t, tParle } from '../i18n/voice/runtime';

// Les phrases viennent du catalogue i18n (clés TATA_*). On arrondit ici comme
// avant ; le formatage « fr-FR » est celui de la locale (runtime). Ce qui
// reste français dans ce fichier, c'est la GRAMMAIRE (pluriels, accords) —
// une langue qui accorde autrement devra fournir sa propre composition.
const r = (n: number) => Math.round(n);

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
    return t('TATA_QUANTITE_UNITE_PRODUIT', { quantite: String(ligne.quantite), unite: u, produit: ligne.nomAffiche }).replace(/\s+/g, ' ').trim();
  }
  const nom = multiple ? plurielNom(ligne.nomAffiche) : ligne.nomAffiche;
  return t('TATA_QUANTITE_PRODUIT', { quantite: String(ligne.quantite), produit: nom }).replace(/\s+/g, ' ').trim();
}

/** Résumé chiffré selon l'interprétation : « … à 500 F » (unitaire) / « … pour 1 500 F » (total). */
export function resumeLigne(ligne: LigneProvisoire): string {
  const base = resumeQuantite(ligne);
  if (ligne.interpretationPrix === 'unitaire' && ligne.prixUnitaire != null) {
    return t('TATA_RESUME_PRIX_UNITAIRE', { resume: base, prix: r(ligne.prixUnitaire) });
  }
  if (ligne.interpretationPrix === 'total' && ligne.total != null) {
    return t('TATA_RESUME_PRIX_TOTAL', { resume: base, total: r(ligne.total) });
  }
  return base; // prix non résolu
}

// Phrases FIXES : des fonctions, pas des constantes — la langue active peut
// changer après le chargement du module.
export const invite = (): string => t('TATA_INVITE');
export const rienCompris = (): string => t('TATA_RIEN_COMPRIS');
export const ajoutPanier = (): string => t('TATA_AJOUT_PANIER');
export const annulationEtape = (): string => t('TATA_ANNULATION_ETAPE');

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
    ? t('TATA_MESURE_DE_PRODUIT', { mesure: quantiteAvecUnite(args.quantite, args.unite), produit: args.nom })
    : t('TATA_QUANTITE_PRODUIT', { quantite: String(args.quantite), produit: nom });
  // DITE UNIQUEMENT (vendreVocalUnifie l'envoie à `speak`) : on prend la forme
  // PARLÉE. `t(...)` rendrait la forme ÉCRAN, avec son espace fine — et la
  // synthèse épellerait « 2 zéro zéro zéro ». Terrain du 24/09.
  return tParle('TATA_COMPRIS', { quantite, montant: r(args.total), suite: ajoutPanier() });
}

/**
 * DEUX FORMES, UN SEUL APPEL — terrain du 24/09.
 *
 * `ConfirmationLigne` AFFICHE la phrase de Tantie autant qu'il la dit, et
 * revendique « impossible de diverger ». C'est juste — mais une seule forme ne
 * peut pas servir les deux : à l'œil « 2 000 F » se lit, à l'oreille il
 * s'épelle « 2 zéro zéro zéro ».
 *
 * La réponse existait déjà dans ce dépôt (`relectureDeuxFormes`) : rendre les
 * DEUX formes du MÊME appel. L'écran prend `texte`, le moteur prend
 * `texteParle`, et elles ne peuvent pas diverger puisqu'elles sortent d'ici.
 */
export interface PhraseDeuxFormes { texte: string; texteParle: string; }

/** La phrase de confirmation, pour l'œil et pour l'oreille. */
export function confirmationDeuxFormes(ligne: LigneProvisoire): PhraseDeuxFormes {
  const base = resumeQuantite(ligne);
  if (ligne.interpretationPrix === 'unitaire' && ligne.prixUnitaire != null && ligne.total != null) {
    const v = { quantite: base, prixUnitaire: r(ligne.prixUnitaire), total: r(ligne.total) };
    return { texte: t('TATA_CONFIRMATION_UNITAIRE', v), texteParle: tParle('TATA_CONFIRMATION_UNITAIRE', v) };
  }
  if (ligne.interpretationPrix === 'total' && ligne.total != null) {
    const v = { quantite: base, total: r(ligne.total) };
    return { texte: t('TATA_CONFIRMATION_TOTAL', v), texteParle: tParle('TATA_CONFIRMATION_TOTAL', v) };
  }
  // Sans prix, il n'y a aucun montant à dire : les deux formes coïncident.
  const p = phrasePrixManquant();
  return { texte: p, texteParle: p };
}

/** La question d'ambiguïté, pour l'œil et pour l'oreille. */
export function ambiguiteDeuxFormes(quantite: number, montant: number): PhraseDeuxFormes {
  const v = { montant: r(montant), quantite: String(quantite) };
  return { texte: t('TATA_AMBIGUITE', v), texteParle: tParle('TATA_AMBIGUITE', v) };
}

/** Une unité mérite-t-elle d'être prononcée ? « unité » n'apprend rien. */
function uniteParlable(u?: string | null): boolean {
  if (!u) return false;
  const n = String(u).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return n !== '' && n !== 'unite' && n !== 'unites';
}
export const erreurMoteur = (): string => t('TATA_ERREUR_MOTEUR');

/** Question quand le prix manque (§6). */
export function phrasePrixManquant(): string { return t('TATA_PRIX_MANQUANT'); }

/** Question quand la quantité manque (§6). */
export function phraseQuantiteManquante(nomProduit: string): string {
  return t('TATA_QUANTITE_MANQUANTE', { produit: nomProduit || t('TATA_CE_PRODUIT') });
}

/** Question d'ambiguïté prix unitaire/total (§5/§6) : « 1 500 francs, c'est le prix d'un seul, ou de tous les 3 ? » */
export function phraseAmbiguite(quantite: number, montant: number): string {
  return t('TATA_AMBIGUITE', { montant: r(montant), quantite: String(quantite) });
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
    return t('TATA_CONFIRMATION_UNITAIRE', { quantite: base, prixUnitaire: r(ligne.prixUnitaire), total: r(ligne.total) });
  }
  if (ligne.interpretationPrix === 'total' && ligne.total != null) {
    return t('TATA_CONFIRMATION_TOTAL', { quantite: base, total: r(ligne.total) });
  }
  return phrasePrixManquant();
}

/** Après une correction (§6) : « D'accord : {résumé}. C'est bon ? » */
export function phraseCorrectionRecue(ligne: LigneProvisoire): string {
  return t('TATA_CORRECTION_RECUE', { resume: resumeLigne(ligne) });
}
