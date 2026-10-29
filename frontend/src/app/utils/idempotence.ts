/**
 * CLÉ D'IDEMPOTENCE — générée une fois par TENTATIVE d'envoi d'argent, puis
 * réutilisée à l'identique par tout rejeu du même appel (retry réseau,
 * double-tap) : le backend ne peut pas créer un second mouvement pour la
 * même intention — cf. WalletsService.transfererVersUtilisateur, qui la
 * consomme. Régénérée uniquement quand on recommence un NOUVEAU transfert
 * (nouvelle intention = nouvelle clé).
 *
 * Extrait de TransfertPage (REVIEW-001/R1-2, découpage R1-3) : tout POST
 * d'argent qui rejoue peut reprendre ce même contrat.
 */
export function genererCleIdempotence(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `xfer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
