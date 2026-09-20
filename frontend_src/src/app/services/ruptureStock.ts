// ──────────────────────────────────────────────────────────────────────────
// Rupture de stock à la vente — avertissement parlé (décision métier n°6).
//
// Quand une vente dépasse le stock, le serveur borne le stock à 0 et JOURNALISE
// le manquant (invariant I3, jamais de clamp silencieux). Côté client, le
// décrément optimiste faisait aussi Math.max(0, …) mais SANS rien dire : la
// vendeuse ne savait pas qu'il manquait de la marchandise.
//
// Ici : calcul pur du manquant (miroir de la règle serveur) + phrase parlée,
// pensée pour une non-lectrice. On n'introduit AUCUN stock négatif : on plancher
// à 0 et on AVERTIT. La vente passe toujours (jamais bloquée).
// ──────────────────────────────────────────────────────────────────────────

import { t } from '../i18n/voice/runtime';

export interface Rupture {
  nom: string;
  manquant: number;
}

/** Manquant d'une ligne : ce qui est demandé au-delà du stock disponible (≥ 0). */
export function manquantLigne(demandee: number, stockAvant: number): number {
  const d = Number(demandee) || 0;
  const s = Math.max(0, Number(stockAvant) || 0);
  return Math.max(0, d - s);
}

/** Collecte les lignes réellement en rupture (manquant > 0). */
export function collecterRuptures(
  lignes: { nom: string; quantite: number; stockAvant: number }[],
): Rupture[] {
  return lignes
    .map((l) => ({ nom: (l.nom || t('TATA_CE_PRODUIT')).trim() || t('TATA_CE_PRODUIT'), manquant: manquantLigne(l.quantite, l.stockAvant) }))
    .filter((r) => r.manquant > 0);
}

/** Phrase d'avertissement parlée, ou null s'il n'y a aucune rupture. */
export function messageRupture(ruptures: Rupture[]): string | null {
  if (!ruptures.length) return null;
  // Phrase et séparateurs d'énumération viennent du catalogue i18n : une
  // langue peut lier autrement (« , » / « et »).
  const bouts = ruptures.map((r) => t('TATA_RUPTURE_LIGNE', { manquant: String(r.manquant), produit: r.nom }));
  const liste =
    bouts.length === 1
      ? bouts[0]
      : bouts.slice(0, -1).join(t('TATA_LISTE_VIRGULE')) + t('TATA_LISTE_ET') + bouts[bouts.length - 1];
  return t('TATA_RUPTURE', { liste });
}

/** Raccourci : à partir des lignes, renvoie la phrase parlée (ou null). */
export function avertissementRupture(
  lignes: { nom: string; quantite: number; stockAvant: number }[],
): string | null {
  return messageRupture(collecterRuptures(lignes));
}
