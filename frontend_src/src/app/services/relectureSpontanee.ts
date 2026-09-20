/**
 * RELECTURE SPONTANÉE — Tata dit le total, le reçu et la monnaie D'ELLE-MÊME
 * (VOIX-01, lot D). Module PUR : aucune dépendance React, testable sans écran.
 *
 * LE DÉFAUT QU'ON FERME (registre VOIX-01, révision 13). Dans la caisse, le
 * total, « Compte juste » et la monnaie à rendre ne parlaient QUE si on les
 * touchait (`onClick={() => dire(...)}`). L'ajout tactile d'un produit disait
 * « Tomate ajouté » — jamais le total. Pour une marchande qui ne lit pas, une
 * information qui n'existe que derrière un appui sur un chiffre n'existe pas :
 * elle ne sait pas qu'il y a quelque chose à toucher, puisqu'elle ne lit pas
 * le chiffre qui l'y invite. « La voix est une propriété du PARCOURS, pas de
 * l'écran » (doctrine du propriétaire) : ce que l'écran recalcule, Tata le
 * redit, sans qu'on le lui demande.
 *
 * POURQUOI UN MODULE PUR ET PAS UN useEffect DANS POSCaisse. La caisse est le
 * chemin d'argent, gelé pour le lot C pendant cette phase. Ici on ne décide
 * QUE de la phrase : ce module reçoit l'état, renvoie ce qu'il faut dire (ou
 * null), et le câblage dans la caisse tient en un effet de quatre lignes. La
 * règle « ne pas répéter » est ici, testée, plutôt que dans un composant où
 * personne ne la relirait.
 *
 * LA RÈGLE DE NON-RÉPÉTITION, ET SON PIÈGE. On compare l'état à l'état
 * PRÉCÉDEMMENT OBSERVÉ, pas au dernier état DIT. L'appelant mémorise donc
 * chaque état qu'il soumet, même quand rien n'a été dit. Sinon : vente A
 * (total 1 000, reçu 2 000) → dite ; panier vidé → silence ; vente B
 * strictement identique → « déjà dite », donc muette. Deux ventes d'affilée
 * au même prix sont banales au marché — la seconde ne doit pas être muette.
 *
 * LES CHIFFRES SE DISENT EN « FRANCS », JAMAIS EN « F » : prononcé par la
 * synthèse, « F » se dit comme une lettre (voir phraseCompris dans
 * dialoguesTata). Le formatage des nombres est celui de l'écran (fr-FR), pour
 * que ce qu'elle entend et ce qu'une lectrice verrait soient le même montant.
 */
import { quantiteAvecUnite } from '../utils/unite.utils';
import { plurielNom } from './dialoguesTata';
import { t } from '../i18n/voice/runtime';

/** Ce que la caisse sait au moment où elle recalcule. Tous en FCFA. */
export interface EtatEncaissement {
  /** Total du panier. */
  total: number;
  /** Montant reçu de la cliente (0 tant qu'elle n'a rien posé). */
  recu: number;
  /** Nombre de lignes du panier — 0 = rien à dire, quoi qu'il arrive. */
  nbLignes: number;
}

// Les phrases viennent du catalogue i18n (clés TATA_*) ; on arrondit comme
// avant, le formatage des nombres est celui de la locale (fr-FR en fr-ci).
const r = (n: number) => Math.round(n);

/** Deux états identiques ne méritent qu'une seule phrase. */
export function memeEtat(a: EtatEncaissement | null, b: EtatEncaissement | null): boolean {
  if (!a || !b) return false;
  return a.total === b.total && a.recu === b.recu && a.nbLignes === b.nbLignes;
}

/**
 * La phrase que Tata dit D'ELLE-MÊME quand l'encaissement change — ou null.
 *
 * - Panier vide : rien. Il n'y a pas d'argent en jeu.
 * - Rien reçu encore : rien. Le total a déjà été dit à l'ajout de la ligne
 *   (voir phraseLigneAjoutee) ; le redire à chaque recalcul serait du bruit.
 * - Reçu suffisant : « Elle t'a donné X francs. Tu rends Y francs. » — ou
 *   « Compte juste. » quand il n'y a rien à rendre.
 * - Reçu insuffisant : « Il manque Z francs. » — ce qu'elle doit encore
 *   demander, pas un constat d'échec.
 * - Même état que le précédent : rien, jamais deux fois la même phrase.
 *
 * `precedent` est le DERNIER ÉTAT SOUMIS par l'appelant (pas le dernier
 * dit) — voir l'en-tête. La monnaie est recalculée ici à partir du reçu et du
 * total : on ne fait pas confiance à une monnaie passée à part, qui pourrait
 * dater du rendu d'avant.
 */
export function phraseRelecture(etat: EtatEncaissement, precedent: EtatEncaissement | null): string | null {
  if (etat.nbLignes <= 0) return null;
  if (!(etat.recu > 0)) return null;
  if (memeEtat(etat, precedent)) return null;

  const manque = etat.total - etat.recu;
  if (manque > 0) return t('TATA_MANQUE', { montant: r(manque) });
  if (manque === 0) return t('TATA_COMPTE_JUSTE');
  return t('TATA_DONNE_RENDS', { recu: r(etat.recu), monnaie: r(-manque) });
}

/** Une ligne qui vient d'entrer au panier, et le panier après elle. */
export interface LigneAjoutee {
  nom: string;
  quantite: number;
  /** Unité de la ligne (« tas », « kg »…). Absente ou « unité » : on ne la dit pas. */
  unite?: string | null;
  /** Ce que vaut CETTE ligne au panier après l'ajout (quantité × prix, ou total exact). */
  totalLigne: number;
  /** Total du panier APRÈS l'ajout. */
  totalPanier: number;
}

/** Une unité mérite-t-elle d'être prononcée ? « unité » n'apprend rien (même règle que quantiteAvecUnite). */
function uniteParlable(u?: string | null): boolean {
  if (!u) return false;
  const n = String(u).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return n !== '' && n !== 'unite' && n !== 'unites';
}

/**
 * Ce que Tata dit quand une ligne est ajoutée AU DOIGT :
 * « 3 tas de tomate, 1 500 francs. Total : 4 000 francs. »
 *
 * Même forme que phraseCompris (la vente DICTÉE) pour la quantité : l'unité se
 * dit quand elle apprend quelque chose (« 3 tas de tomate ») et le produit se
 * pluralise sinon (« 2 tomates »). Une marchande qui alterne voix et doigt
 * doit entendre la même langue des deux côtés. Ce qui change : pas de
 * « J'ai compris » (elle vient de toucher, il n'y a rien à interpréter) et le
 * TOTAL DU PANIER à la fin — c'est lui qui manquait, et c'est lui qu'elle va
 * annoncer à la cliente.
 */
export function phraseLigneAjoutee(l: LigneAjoutee): string {
  const q = Number.isFinite(l.quantite) && l.quantite >= 1 ? l.quantite : 1;
  const nom = q > 1 ? plurielNom(l.nom) : l.nom;
  const quantite = uniteParlable(l.unite)
    ? t('TATA_MESURE_DE_PRODUIT', { mesure: quantiteAvecUnite(q, l.unite), produit: l.nom })
    : t('TATA_QUANTITE_PRODUIT', { quantite: quantiteAvecUnite(q, null), produit: nom });
  return t('TATA_LIGNE_AJOUTEE', { quantite, montantLigne: r(l.totalLigne), totalPanier: r(l.totalPanier) });
}
