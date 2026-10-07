/**
 * Client API Marchés — JÙLABA
 *
 * Le référentiel des marchés tenu par le back-office (`GET /marches`, route
 * publique). Une seule lecture, partagée par la fiche d'identification
 * (`MarcheSelect`) et le profil de la marchande (`ProfilUnifieModal`).
 *
 * `exclude_statut=en_attente` : un marché proposé par un identificateur et pas
 * encore validé n'apparaît dans aucune liste.
 */

import { apiRequest } from './api-client';
import { API_URL } from '../../utils/api';

export interface MarchePublic {
  id: string;
  nom: string;
  /** `COALESCE(m.commune, z.nom)` côté serveur : peut manquer. */
  commune: string | null;
  statut?: string | null;
  actif?: boolean | null;
}

export async function fetchMarchesPublics(signal?: AbortSignal): Promise<MarchePublic[]> {
  const data = await apiRequest<unknown>(API_URL, '/marches?exclude_statut=en_attente', { method: 'GET', signal });
  return Array.isArray(data) ? (data as MarchePublic[]) : [];
}
