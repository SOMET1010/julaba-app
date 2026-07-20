import { useInstitution } from '../contexts/InstitutionContext';
import { InstitutionPermissions, DEFAULT_INSTITUTION_PERMISSIONS } from '../contexts/BackOfficeContext';

/**
 * Hook pour accéder aux permissions de l'institution courante
 * Retourne les permissions configurées ou le preset par défaut
 */
export function useInstitutionPermissions(): InstitutionPermissions {
  const { institution } = useInstitution();
  
  // Si l'institution a des permissions configurées, les utiliser
  // Sinon, utiliser le preset par défaut
  return institution?.permissions || DEFAULT_INSTITUTION_PERMISSIONS;
}
