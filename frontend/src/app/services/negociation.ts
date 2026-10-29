/**
 * Négociation marché (module PUR, sans React ni DOM).
 *
 * Règles partagées du parcours « offre → contre-offre » (marchand ↔ vendeur),
 * alignées sur l'enum backend `NegociationStatut`
 * (backend/src/commandes/entities/negociation.entity.ts) :
 *   en_attente · accepte · refuse · contre_offre
 *
 * Pourquoi ce module existe : le front disait `contre_propose` là où le backend
 * n'accepte que `contre_offre` → toute contre-offre partait en 400
 * (« statut négociation invalide ») et la négociation était cassée pour la
 * coopérative comme pour le producteur. On normalise ICI, au seul endroit par
 * lequel la réponse passe (commandes-api), pour que tous les appelants soient
 * corrigés d'un coup et qu'aucun alias ne reparte vers l'API.
 */

/** Statuts ACCEPTÉS par le backend pour une réponse de négociation. */
export type StatutReponseNegociation = 'accepte' | 'refuse' | 'contre_offre';

/** Alias historiques côté front, tolérés en entrée mais jamais envoyés. */
export type StatutReponseFront = StatutReponseNegociation | 'contre_propose';

/**
 * Normalise un statut de réponse vers l'enum backend.
 * `contre_propose` (alias front historique) → `contre_offre`.
 * Tout statut inconnu est retourné tel quel : le backend le refusera avec un
 * message clair — on ne masque pas une vraie erreur d'appel.
 */
export function normaliserStatutNegociation(statut: StatutReponseFront | string): string {
  return statut === 'contre_propose' ? 'contre_offre' : statut;
}

/** Limite backend : au plus 3 contre-offres par négociation. */
export const MAX_CONTRE_OFFRES = 3;

/** Peut-on encore contre-proposer ? (miroir de la règle backend) */
export function peutContreOffrir(nbContreOffres: number): boolean {
  return Number.isFinite(nbContreOffres) && nbContreOffres < MAX_CONTRE_OFFRES;
}

/** Une négociation est « active » (en attente d'une réponse de quelqu'un) ? */
export function estNegociationActive(statut: string): boolean {
  return statut === 'en_attente' || statut === 'contre_offre';
}

/**
 * Prix final d'une négociation : contre-offre si elle existe, sinon prix proposé,
 * sinon prix original. (Champs tels qu'exposés par l'API, tolérant snake/camel.)
 */
export function prixFinalNegociation(neg: {
  prixContreOffre?: number | null; prix_contre_offre?: number | null;
  prixPropose?: number | null; prix_propose?: number | null;
  prixOriginal?: number | null; prix_original?: number | null;
}): number {
  const contre = neg.prixContreOffre ?? neg.prix_contre_offre;
  if (contre != null && contre > 0) return contre;
  const propose = neg.prixPropose ?? neg.prix_propose;
  if (propose != null && propose > 0) return propose;
  return neg.prixOriginal ?? neg.prix_original ?? 0;
}
