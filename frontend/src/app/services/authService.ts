/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — SERVICE D'AUTHENTIFICATION (NestJS JWT)
 * ═══════════════════════════════════════════════════════════════════
 */

import { API_URL } from '../utils/api';

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
    const response = await fetch(`${API_URL}/auth/create-acteur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) return { success: false, error: result.error || "Erreur lors de l'inscription" };
    return { success: true, user: result.user, message: result.message };
  } catch (error) {
    return { success: false, error: 'Erreur de connexion au serveur' };
  }
}

export async function login(data: LoginData): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) return { success: false, error: result.error || 'Identifiants incorrects' };

    return {
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  } catch (error) {
    return { success: false, error: 'Erreur de connexion au serveur' };
  }
}

export async function logout(): Promise<AuthResponse> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch(e) {}
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
