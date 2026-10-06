import { UniversalParametres } from '../shared/UniversalParametres';

/**
 * Paramètres identificateur : UI générique dans UniversalParametres.
 * Section « Sécurité » (changement PIN) : IdentificateurPinChangeSection (importée dans UniversalParametres).
 */
export function IdentificateurParametres() {
  return <UniversalParametres role="identificateur" />;
}

export { IdentificateurPinChangeSection } from './IdentificateurPinChangeSection';
