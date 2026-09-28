/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — SERVICE D'AUTHENTIFICATION (NestJS JWT)
 * ═══════════════════════════════════════════════════════════════════
 */

import { API_URL } from '../utils/api';
import { apiRequest, HttpError } from './api/api-client';

export interface SignupData {
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur' | 'consommateur';
  region?: string;
  commune?: string;
  activity?: string;
  market?: string;
  cooperativeName?: string;
  institutionName?: string;
}

export interface LoginData {
  phone: string;
  password: string;
}

export interface JulabaUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  region?: string;
  commune?: string;
  activity?: string;
  market?: string;
  cooperativeName?: string;
  institutionName?: string;
  score: number;
  validated: boolean;
  photoUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: JulabaUser;
  error?: string;
  message?: string;
}

export async function signup(data: SignupData): Promise<AuthResponse> {
  try {
    const result = await apiRequest<any>(API_URL, '/auth/create-acteur', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { success: true, user: result.user, message: result.message };
  } catch (error) {
    if (error instanceof HttpError) return { success: false, error: error.message || "Erreur lors de l'inscription" };
    return { success: false, error: 'Erreur de connexion au serveur' };
  }
}

export async function login(data: LoginData): Promise<AuthResponse> {
  try {
    const result = await apiRequest<any>(API_URL, '/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return {
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  } catch (error) {
    if (error instanceof HttpError) return { success: false, error: error.message || 'Identifiants incorrects' };
    return { success: false, error: 'Erreur de connexion au serveur' };
  }
}

/**
 * Activation P0.0 (ADR-002) : la marchande consomme le code d'activation reçu à
 * l'enrôlement et POSE SON secret. Après succès, elle peut se connecter avec ce PIN.
 */
export async function activerCompte(code: string, nouveauSecret: string): Promise<AuthResponse> {
  try {
    await apiRequest<unknown>(API_URL, '/auth/activer', {
      method: 'POST',
      body: JSON.stringify({ code, nouveauSecret }),
    });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpError) return { success: false, error: error.message || "Code d'activation invalide ou expiré" };
    return { success: false, error: 'Erreur de connexion au serveur' };
  }
}

export async function logout(): Promise<AuthResponse> {
  try {
    // INIT-019 — passe par le client centralisé.
    await apiRequest<unknown>(API_URL, '/auth/logout', { method: 'POST' });
  } catch { /* silencieux */ }
  return { success: true, message: 'Déconnexion réussie' };
}

export async function getValidToken(): Promise<string | null> {
  // Token géré via cookie HttpOnly — retourne null pour compatibilité
  // Les requêtes utilisent credentials: 'include' directement
  return null; // Token géré via cookie httpOnly
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getValidToken();
  return !!token;
}

// Export vide pour compatibilité avec les imports existants
export function getCurrentUser() { return null; }
