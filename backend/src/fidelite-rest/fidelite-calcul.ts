// ── Calcul pur du programme de fidélité (écart CDC 8.1.2) ────────────────────
// Extrait du contrôleur pour être testable sans base de données (test/unit).
// Aucune I/O ici : uniquement l'arithmétique du barème.

export interface BaremeFidelite {
  points_par_cent: number;
  seuil_points: number;
  recompense_fcfa: number;
}

/**
 * Points gagnés pour un achat de `montant` FCFA, au barème `pointsParCent`
 * (points par tranche de 100 FCFA). Arrondi au point inférieur — jamais de
 * points fractionnaires offerts par erreur d'arrondi.
 */
export function calculerPointsGagnes(montant: number, pointsParCent: number): number {
  const m = Number.isFinite(montant) ? Math.max(0, montant) : 0;
  const ppc = Number.isFinite(pointsParCent) ? Math.max(0, pointsParCent) : 0;
  return Math.floor((m / 100) * ppc);
}

/** Un solde de points donne-t-il droit à la récompense du barème ? */
export function estEligibleRecompense(points: number, bareme: BaremeFidelite): boolean {
  return Number(points) >= Number(bareme.seuil_points) && Number(bareme.recompense_fcfa) > 0;
}

/**
 * Normalise un barème brut (venant du corps de requête) : bornes de sûreté
 * cohérentes avec le contrôleur (jamais de seuil nul, jamais de valeur négative).
 */
export function normaliserBareme(body: any): BaremeFidelite {
  return {
    points_par_cent: Math.max(0, Number(body?.points_par_cent) || 0),
    seuil_points: Math.max(1, Number(body?.seuil_points) || 1),
    recompense_fcfa: Math.max(0, Number(body?.recompense_fcfa) || 0),
  };
}

/** Normalise un numéro de téléphone pour servir de clé de recherche stable. */
export function normaliserTel(tel: string): string {
  return String(tel || '').replace(/\s+/g, '').replace(/[^0-9+]/g, '');
}
