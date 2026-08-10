import { MarchandAccueilVoice } from './MarchandAccueilVoice';

/**
 * Accueil marchand — UN SEUL accueil simple (Phase 2).
 *
 * Avant, la marchande avait deux accueils (« vue simple » voix-d'abord et « vue
 * avancée » tableau de bord « Kassa »), avec une bascule. On unifie sur l'accueil
 * simple : plus de bascule, plus de jargon « Kassa ».
 *
 * La vue avancée (RoleDashboard) N'EST PAS supprimée — elle reste utilisée par les
 * autres rôles (producteur, coopérative, institution). Seul le marchand ne s'en
 * sert plus. Les fonctions utiles (résumé du jour, clôture de journée) sont
 * relogées dans l'accueil simple ; l'ouverture de journée est automatique.
 */
export function MarchandHome() {
  return <MarchandAccueilVoice />;
}
