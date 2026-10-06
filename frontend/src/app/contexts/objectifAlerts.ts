/**
 * objectifAlerts.ts — logique PURE (testable, sans React) des annonces d'objectif.
 *
 * Règle clé : une annonce ne se déclenche QUE sur un franchissement ASCENDANT d'un
 * seuil PENDANT la session. À l'hydratation initiale (état chargé du serveur), on
 * pose une base SANS annoncer → « zéro voix automatique au chargement de l'accueil »,
 * même si les ventes chargées dépassent déjà un seuil (et même pour le 100 %, qui
 * n'a pas de drapeau serveur : c'est le franchissement, pas la valeur, qui compte).
 */

export type ObjectifAlert = "none" | "p50" | "p80" | "p100";

/**
 * @param prevPct  pourcentage précédent (null = hydratation → jamais d'annonce)
 * @param pct      pourcentage courant
 * @param alerte50 drapeau serveur : l'annonce 50 % a déjà été faite
 * @param alerte80 drapeau serveur : l'annonce 80 % a déjà été faite
 */
export function nextObjectifAlert(
  prevPct: number | null,
  pct: number,
  alerte50: boolean,
  alerte80: boolean
): ObjectifAlert {
  if (prevPct === null) return "none"; // hydratation : aucune voix
  if (prevPct < 100 && pct >= 100) return "p100";
  if (prevPct < 80 && pct >= 80 && !alerte80) return "p80";
  if (prevPct < 50 && pct >= 50 && pct < 80 && !alerte50) return "p50";
  return "none";
}
