// academy-api.ts — INIT-019 : migration fetch() directs vers client centralisé
//
// Avant : 5 fetch() directs dans BOAcademy.tsx (helper `boApi` + 4 fetch directs)
// Après : ce service passe par `apiRequest` (timeout 30s, mutex refresh 401,
// HttpError typée, credentials include, Authorization auto via cookie ou token).
//
// Le BO Academy utilise le cookie de session BO (SameSite=None ; Secure en prod)
// ou à défaut le jeton BO stocké dans sessionStorage (voir backoffice-api.ts).
// On ajoute donc l'en-tête Authorization manuellement si un jeton BO est présent,
// pour le cas où le cookie cross-domain est bloqué par ITP.

import { apiRequest } from './api-client';
import { API_URL } from '../../utils/api';
import { getBoAccessToken } from '../backoffice-api';

function boHeaders(): Record<string, string> {
  const token = getBoAccessToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export interface AcademyModule {
  id: string;
  titre: string;
  description?: string;
  type?: string;
  niveau?: string;
  profil?: string;
  duree?: number;
  points?: number;
  image?: string;
  statut?: string;
  nbInscrits?: number;
  nb_inscrits?: number;
  tauxCompletion?: number;
  taux_completion?: number;
  dateCreation?: string;
  created_at?: string;
}

export interface AcademyStats {
  [key: string]: unknown;
}

export interface AcademyQuestion {
  id: string;
  role: string;
  chapter: number;
  question: string;
  options: Array<{ text: string; icon?: string } | string>;
  correctIndex: number;
  correct_index?: number;
  active?: boolean;
  actif?: boolean;
  [key: string]: unknown;
}

/** GET /academy/modules — liste des modules pour le tableau de bord */
export async function getAcademyModules(): Promise<any[]> {
  const data = await apiRequest<any>(API_URL, '/academy/modules', {
    method: 'GET',
    headers: boHeaders(),
  });
  const list = Array.isArray(data) ? data : (data?.modules || data?.data || []);
  return list.map((m: any) => ({
    ...m,
    nbInscrits: m.nbInscrits ?? m.nb_inscrits ?? 0,
    tauxCompletion: m.tauxCompletion ?? m.taux_completion ?? 0,
    dateCreation: m.dateCreation ?? m.created_at ?? '',
  }));
}

/** GET /academy/stats — statistiques globales academy */
export async function getAcademyStats(): Promise<any> {
  return apiRequest<any>(API_URL, '/academy/stats', {
    method: 'GET',
    headers: boHeaders(),
  });
}

/** GET /academy/my-progress — progression de l'utilisateur connecté */
export async function getAcademyMyProgress(): Promise<any> {
  return apiRequest<any>(API_URL, '/academy/my-progress', {
    method: 'GET',
    headers: boHeaders(),
  });
}

/** GET /academy/questions?role=X&chapter=Y — questions du jeu pour un rôle/chapitre */
export async function getAcademyQuestions(role: string, chapter: number): Promise<any[]> {
  const data = await apiRequest<any>(API_URL, `/academy/questions?role=${encodeURIComponent(role)}&chapter=${chapter}`, {
    method: 'GET',
    headers: boHeaders(),
  });
  const qs = (data?.questions || []).map((q: any) => ({
    ...q,
    correctIndex: q.correctIndex ?? q.correct_index ?? 0,
    active: q.actif ?? q.active ?? true,
    options: (q.options || []).map((o: any) => (typeof o === 'string' ? { text: o, icon: 'circle' } : o)),
  }));
  return qs;
}

/** POST/PATCH/DELETE générique pour les mutations academy (questions, modules) */
export async function academyMutation<T = any>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: any): Promise<T> {
  return apiRequest<T>(API_URL, path, {
    method,
    headers: boHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
