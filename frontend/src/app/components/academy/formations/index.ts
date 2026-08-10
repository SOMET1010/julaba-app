/**
 * INDEX DES FORMATIONS - Export centralisé et dynamique
 * 
 * Toutes les formations par profil sont ici
 */

import { marchandFormations } from './marchand';
import { producteurFormations } from './producteur';
import { cooperativeFormations } from './cooperative';
import { institutionFormations } from './institution';
import { identificateurFormations } from './identificateur';
import { UserRole } from '../types';

// Map des formations par profil
export const FORMATIONS_BY_ROLE: Record<UserRole, any[]> = {
  marchand: marchandFormations,
  producteur: producteurFormations,
  cooperative: cooperativeFormations,
  institution: institutionFormations,
  identificateur: identificateurFormations,
};

/**
 * Obtenir les formations pour un profil donné
 */
export function getFormationsForRole(role: UserRole) {
  return FORMATIONS_BY_ROLE[role] || [];
}

/**
 * Obtenir une formation spécifique par ID
 */
export function getFormationById(formationId: string, role: UserRole) {
  const formations = getFormationsForRole(role);
  return formations.find((f) => f.id === formationId);
}

/**
 * Obtenir le nombre total de formations par profil
 */
export function getTotalFormationsCount(role: UserRole): number {
  return getFormationsForRole(role).length;
}

// Export individuel pour compatibilité
export { marchandFormations } from './marchand';
export { producteurFormations } from './producteur';
export { cooperativeFormations } from './cooperative';
export { institutionFormations } from './institution';
export { identificateurFormations } from './identificateur';
