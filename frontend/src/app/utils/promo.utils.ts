// ── Prix promotionnel / remise (écart CDC 8.1.2 « prix et promotions dynamiques ») ──
// La marchande peut fixer un prix promo (et une date de fin facultative) sur un
// produit. La caisse applique automatiquement le prix promo tant qu'il est actif,
// et affiche le prix normal barré.

export interface AvecPromo {
  prix: number;
  prix_promo?: number | null;
  promo_fin?: string | null; // AAAA-MM-JJ ; null = pas de date de fin
}

/** Une promo est active si un prix_promo valide (> 0 et < prix) existe et n'est pas expiré. */
export function promoActive(p: AvecPromo): boolean {
  const pp = p.prix_promo;
  if (pp == null || !(pp > 0) || pp >= (Number(p.prix) || 0)) return false;
  if (!p.promo_fin) return true;
  const fin = new Date(p.promo_fin);
  if (isNaN(fin.getTime())) return true; // date illisible → on garde la promo
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  fin.setHours(23, 59, 59, 999);
  return fin.getTime() >= auj.getTime();
}

/** Prix réellement appliqué à la vente (promo si active, sinon prix normal). */
export function prixEffectif(p: AvecPromo): number {
  return promoActive(p) ? Number(p.prix_promo) : (Number(p.prix) || 0);
}

/** Pourcentage de remise (0 si pas de promo active). */
export function remisePct(p: AvecPromo): number {
  if (!promoActive(p)) return 0;
  const prix = Number(p.prix) || 0;
  if (prix <= 0) return 0;
  return Math.round((1 - Number(p.prix_promo) / prix) * 100);
}
