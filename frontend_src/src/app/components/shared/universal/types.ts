/**
 * Types partagés pour les composants universels JULABA
 */

import { RoleType } from '../../../config/roleConfig';

export interface UniversalPageProps {
  role: RoleType;
}

export interface UniversalAccueilProps extends UniversalPageProps {
  // Pas de props supplémentaires pour l'instant
}

export interface UniversalMarcheProps extends UniversalPageProps {
  // Pas de props supplémentaires pour l'instant
}

export interface UniversalProduitsProps extends UniversalPageProps {
  // Pas de props supplémentaires pour l'instant
}

export interface UniversalProfilProps extends UniversalPageProps {
  // Pas de props supplémentaires pour l'instant
}
