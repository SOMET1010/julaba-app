/**
 * Calcul du bénéfice/marge d'une vente à partir de ses lignes (`details`).
 *
 * Règle de VÉRITÉ (écart recette caisse) : « coût inconnu » ≠ « coût nul ».
 * On ne compte QUE les lignes dont le prix d'achat est connu (> 0) ; une ligne
 * sans coût est ignorée (on n'invente pas de marge, surtout pas le prix de vente
 * entier — même faute que #134 côté stock, ici sur les ventes). Le bénéfice est
 * la somme des (total − prix_achat × quantité) des seules lignes coûtées, SANS
 * plancher : une ligne vendue à perte retranche ce qu'elle coûte (arbitrage du
 * 19/09/2026 — ne jamais masquer une réalité économique).
 * Conséquence : une vente sans aucun coût connu renvoie 0 (affiché « marge — »),
 * une vente mixte n'est jamais surévaluée par ses lignes sans coût, et une vente
 * à perte affiche sa perte.
 */
import type { LigneDeVente } from '../types/vente';

export function beneficeDepuisDetails(details: unknown): number {
  if (!Array.isArray(details)) return 0;
  return (details as LigneDeVente[]).reduce((s: number, it) => {
    const coutUnitaire = Number(it?.prix_achat ?? it?.prixAchat) || 0;
    // Coût inconnu (≤ 0) → ligne NON comptée : on n'invente pas de marge (on ne
    // renvoie surtout pas le prix de vente entier). Ne surévalue jamais, même sur
    // une vente mixte (une ligne coûtée + une ligne sans coût).
    if (coutUnitaire <= 0) return s;
    const q = Number(it?.quantite) || 1;
    const total = Number(it?.total) || (Number(it?.prix) || 0) * q;
    // PAS DE PLANCHER PAR LIGNE — arbitrage du 19/09/2026. Il produisait un
    // résultat DIFFÉRENT de celui du serveur : sur une vente à deux lignes dont
    // l'une part à perte, le serveur plafonnait sur le TOTAL (0) et ce calcul
    // plafonnait ligne par ligne (300). Deux vérités pour une même vente.
    // Une ligne vendue à perte retranche désormais ce qu'elle coûte, ici comme
    // là-bas. Seule une ligne au coût INCONNU reste ignorée (ci-dessus).
    return s + (total - coutUnitaire * q);
  }, 0);
}

// ════════════════════════════════════════════════════════════════════════════
// L'ÉTAT DE LA MARGE — ARGENT-1, arbitrage de Patrick du 19/09/2026.
//
// L'application n'avait que TROIS états : gain, perte, marge inconnue. Il en
// manquait un, et c'est celui du panier le plus courant sur ce marché : « je
// sais pour une partie, pas pour le reste ».
//
// LA RÈGLE : une ligne sans prix d'achat ne vaut ni zéro coût ni zéro
// information. On calcule ce qu'on SAIT réellement, et on ne présente JAMAIS ce
// chiffre comme la marge complète de la vente. Le chiffre ET sa limite, jamais
// l'un sans l'autre.
//
// Le libellé et la phrase vivent ici, avec le calcul. Séparer les trois, c'est
// exactement comme ça qu'un écran finit par dire autre chose que la donnée.
// ════════════════════════════════════════════════════════════════════════════

import { montantAffiche } from '../config/devise';

export type EtatMarge =
  /** Toutes les lignes ont un coût connu : le chiffre couvre toute la vente. */
  | { type: 'connue'; montant: number }
  /** Certaines lignes seulement : le chiffre est vrai mais INCOMPLET. */
  | { type: 'partielle'; montant: number }
  /** Aucune ligne coûtée : on ne sait rien, et on le dit en se taisant. */
  | { type: 'inconnue' };

export function etatMarge(details: unknown, beneficeServeur?: number | null): EtatMarge {
  if (Array.isArray(details) && details.length > 0) {
    let coutees = 0;
    let sansCout = 0;
    for (const it of details as Array<Record<string, unknown>>) {
      const cout = Number(it?.prix_achat ?? it?.prixAchat) || 0;
      if (cout > 0) coutees++; else sansCout++;
    }
    if (coutees === 0) return { type: 'inconnue' };
    const montant = beneficeDepuisDetails(details);
    return sansCout > 0 ? { type: 'partielle', montant } : { type: 'connue', montant };
  }
  // Ventes anciennes, sans lignes exploitables : on ne peut rien affirmer sur
  // la complétude. On retombe sur ce que le serveur a calculé, sans prétendre
  // savoir s'il couvrait tout.
  if (beneficeServeur != null && beneficeServeur !== 0) return { type: 'connue', montant: beneficeServeur };
  return { type: 'inconnue' };
}

/** Ce que l'ÉCRAN affiche. « Marge connue » dit le chiffre ET sa limite. */
export function libelleMarge(etat: EtatMarge): string {
  if (etat.type === 'inconnue') return 'marge —';
  const m = etat.montant;
  if (etat.type === 'partielle') {
    // Le mot « connue » est le seul qui distingue ce chiffre d'un chiffre
    // complet. L'écran de stock emploie déjà ce vocabulaire (« marge réelle »,
    // « produits sans prix d'achat ») : la marchande ne découvre pas un mot.
    return m < 0 ? `Perte connue : ${montantAffiche(Math.abs(m))}` : `Marge connue : ${montantAffiche(m)}`;
  }
  if (m < 0) return `Perte : ${montantAffiche(Math.abs(m))}`;
  if (m === 0) return 'marge —';
  return `+${montantAffiche(m)} marge`;
}

/** Ce que TATA DIT. Le texte est un fragment, inséré dans la phrase de la vente. */
export function phraseMarge(etat: EtatMarge): string {
  if (etat.type === 'inconnue') return '';
  const m = etat.montant;
  const nombre = Math.abs(m).toLocaleString('fr-FR');
  if (etat.type === 'partielle') {
    // Phrase COMPLÈTE et autonome : elle nomme sa propre limite. Une marchande
    // qui ne lit pas n'a que cette phrase pour savoir que le chiffre est
    // partiel — l'écran ne le lui dira jamais.
    return m < 0
      ? `Sur les articles dont tu connais le prix d’achat, tu as perdu ${nombre} francs.`
      : `Sur les articles dont tu connais le prix d’achat, tu as gagné ${nombre} francs.`;
  }
  if (m < 0) return `mais tu as perdu ${nombre} francs dessus`;
  if (m === 0) return '';
  return `marge ${nombre} francs`;
}
