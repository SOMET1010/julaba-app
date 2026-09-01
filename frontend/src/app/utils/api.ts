/**
 * JULABA — Configuration API centralisée
 * Toutes les URLs doivent utiliser cette constante
 */
function resolveApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;

    // Capacitor (APK) : window.location.hostname = localhost / 127.0.0.1 / etc.
    // Le build Vite injecte une URL HTTPS (VITE_API_URL), mais julaba-dev.ansut.ci
    // n'a de SSL que derrière Imperva WAF qui bloque l'API.  On force HTTP pour
    // que l'APK parle directement au nginx (port 80) sans passer par Imperva.
    const isCapacitor = host === 'localhost' || host === '127.0.0.1' ||
      (typeof (window as any).Capacitor !== 'undefined');
    if (isCapacitor && fromEnv && fromEnv.includes('julaba-dev.ansut.ci')) {
      return fromEnv.replace('https://', 'http://');
    }

    // ANSUT sert le frontend et l'API derrière le même vhost HTTP/HTTPS.
    if (host.endsWith('.ansut.ci')) {
      return '/api/v1';
    }

    if (host === 'julaba-web.onrender.com') {
      return 'https://julaba-api.onrender.com/api/v1';
    }
  }

  // Fallback : valeur injectée au build, ou chemin relatif.
  return fromEnv || '/api/v1';
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
