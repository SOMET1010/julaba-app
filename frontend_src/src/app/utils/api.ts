/**
 * JULABA — Configuration API centralisée
 * Toutes les URLs doivent utiliser cette constante
 */
function resolveApiUrl(): string {
  // 1) Valeur injectée au build (idéal) — ex. Render VITE_API_URL.
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return fromEnv;
  // 2) Filet de sécurité PRODUCTION. Sur la V1, frontend et backend partageaient
  //    le même domaine, donc le chemin relatif "/api/v1" suffisait. Sur la V2, ils
  //    sont sur DEUX domaines : si VITE_API_URL n'a pas été injectée au build, un
  //    "/api/v1" relatif tape sur le site statique (→ HTML au lieu du backend).
  //    On cible donc le backend V2 connu dès qu'on est servi depuis le domaine V2.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'julaba-web.onrender.com') {
      return 'https://julaba-api.onrender.com/api/v1';
    }
  }
  // 3) Défaut historique (même domaine / dev avec proxy Vite).
  return '/api/v1';
}

export const API_URL = resolveApiUrl();
export const BASE_URL = API_URL;
export const API_BASE_URL = API_URL;


export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  details?: string;
  data?: T;
}

/**
 * Récupérer les paramètres système (numéro de support, etc.)
 */
export async function getSystemSettings(): Promise<{ 
  success?: boolean;
  error?: string;
  settings?: {
    supportPhone?: string;
  };
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/system/settings`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        error: data.error || 'Erreur lors de la récupération des paramètres'
      };
    }

    return { success: true, settings: data.settings };
  } catch (error) {
    return { 
      error: 'Erreur réseau'
    };
  }
}
