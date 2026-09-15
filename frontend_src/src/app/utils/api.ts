/**
 * JULABA — Configuration API centralisée
 * Toutes les URLs doivent utiliser cette constante
 */

/** URL du backend V2 — même valeur que VITE_API_URL dans render.yaml. */
export const BACKEND_V2_URL = 'https://julaba-api.onrender.com/api/v1';

/**
 * Cœur PUR de la résolution — testable sans DOM ni `import.meta` (voir
 * api.test.mts). `resolveApiUrl()` ci-dessous se contente de lire les
 * globales réelles et de les lui passer.
 */
export function resolveApiUrlPure(params: {
  envVar?: string;
  hostname?: string;
  /** `Capacitor.getPlatform()` — 'web' sur un navigateur, 'android'/'ios' dans l'APK. */
  platformeCapacitor?: string;
}): string {
  // 1) Valeur injectée au build (idéal) — ex. Render VITE_API_URL.
  if (params.envVar) return params.envVar;
  // 2) Filet de sécurité PRODUCTION WEB. Sur la V1, frontend et backend
  //    partageaient le même domaine, donc le chemin relatif "/api/v1"
  //    suffisait. Sur la V2, ils sont sur DEUX domaines : si VITE_API_URL n'a
  //    pas été injectée au build, un "/api/v1" relatif tape sur le site
  //    statique (→ HTML au lieu du backend). On cible donc le backend V2
  //    connu dès qu'on est servi depuis le domaine V2.
  if (params.hostname === 'julaba-web.onrender.com') return BACKEND_V2_URL;
  // 3) Filet de sécurité APK (Android/iOS, via Capacitor). VITE_API_URL n'est
  //    OBLIGATOIRE que pour le build web (Render l'injecte automatiquement) ;
  //    rien ne garantit qu'un build APK local (`npm run build` puis
  //    `npx cap sync android` puis `./gradlew assembleDebug`, voir
  //    docs/SHERPA_ONNX_APK.md) pense à l'exporter. Sans ce filet, le "/api/v1"
  //    du point 4 se serait résolu contre l'origine INTERNE du WebView
  //    (localhost/file://, jamais le vrai backend) : chaque appel réseau
  //    aurait échoué en silence dès l'installation, sur un terminal qu'on ne
  //    peut pas déboguer à distance.
  if (params.platformeCapacitor && params.platformeCapacitor !== 'web') return BACKEND_V2_URL;
  // 4) Défaut historique (même domaine / dev avec proxy Vite).
  return '/api/v1';
}

function resolveApiUrl(): string {
  // `?.` : hors Vite (tests lancés via tsx, voir api.test.mts), `import.meta.env`
  // n'existe pas du tout — Vite, lui, le fournit toujours, en dev comme au build.
  const envVar = import.meta.env?.VITE_API_URL;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
  // Même mécanisme officiel que voice-offline/nativeStt.ts : le pont natif
  // injecte `window.Capacitor` avant tout script de page, donc disponible
  // dès l'exécution de ce module (pas de course).
  const cap = typeof window !== 'undefined' ? (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor : undefined;
  const platformeCapacitor = typeof cap?.getPlatform === 'function' ? cap.getPlatform() : undefined;
  return resolveApiUrlPure({ envVar, hostname, platformeCapacitor });
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
