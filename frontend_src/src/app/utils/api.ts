/**
 * JULABA — Configuration API centralisée
 * Toutes les URLs doivent utiliser cette constante
 */

export type PlateformeJulaba = 'web' | 'android' | 'ios';

export interface ContexteApi {
  /** `VITE_API_URL`, injectée au build. */
  viteApiUrl?: string;
  /** Web, ou application native empaquetée (Capacitor). */
  plateforme: PlateformeJulaba;
  /** `window.location.hostname`. */
  hostname: string;
}

/**
 * Valeur rendue quand l'APK a été construit SANS `VITE_API_URL`.
 *
 * Volontairement inutilisable et reconnaissable : le domaine `.invalid` est
 * reserve par la RFC 2606 et ne resoudra jamais. Chaque appel echouera donc
 * en NOMMANT le probleme, au lieu de reussir en silence sur les fichiers
 * embarques dans le telephone.
 */
export const URL_API_NON_CONFIGUREE = 'http://api-non-configuree.julaba.invalid/api/v1';

/**
 * Où l'application doit-elle parler ?
 *
 * LE CAS QUI MOTIVE CETTE FONCTION : dans un APK, la page est servie par
 * Capacitor depuis `localhost`. Un chemin RELATIF comme `/api/v1` y designe
 * donc les fichiers embarques dans le telephone — pas un backend. Sans
 * `VITE_API_URL` injectee au build, l'ancienne version retombait sur ce
 * chemin relatif et l'APK etait une coquille : aucune requete n'atteignait
 * jamais un serveur, sans le moindre message.
 *
 * On refuse desormais ce silence. En natif sans configuration, on renvoie une
 * URL impossible et on le signale : une panne bruyante vaut mieux qu'une
 * application qui fait semblant de fonctionner.
 *
 * Fonction PURE (aucune lecture de `window` ni de `import.meta`) pour etre
 * testable — voir api.test.mts.
 */
export function resoudreUrlApi(ctx: ContexteApi): { url: string; natifSansConfiguration: boolean } {
  // 1) Valeur injectee au build (ideal) — ex. Render VITE_API_URL.
  const injectee = (ctx.viteApiUrl ?? '').trim();
  if (injectee) return { url: injectee, natifSansConfiguration: false };

  // 2) Application NATIVE sans configuration : aucun repli relatif possible.
  if (ctx.plateforme !== 'web') {
    return { url: URL_API_NON_CONFIGUREE, natifSansConfiguration: true };
  }

  // 3) Filet de securite PRODUCTION WEB. Sur la V1, frontend et backend
  //    partageaient le meme domaine, donc "/api/v1" suffisait. Sur la V2 ils
  //    sont sur DEUX domaines : un "/api/v1" relatif taperait sur le site
  //    statique (→ HTML au lieu du backend).
  if (ctx.hostname === 'julaba-web.onrender.com') {
    return { url: 'https://julaba-api.onrender.com/api/v1', natifSansConfiguration: false };
  }

  // 4) Defaut historique (meme domaine / dev avec proxy Vite).
  return { url: '/api/v1', natifSansConfiguration: false };
}

/** Plateforme reelle, via le pont global de Capacitor (meme mecanisme que
 *  voice-offline/nativeStt.ts). `web` des que le pont est absent. */
function plateformeCourante(): PlateformeJulaba {
  try {
    const pont = (globalThis as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    const p = pont?.getPlatform?.();
    return p === 'android' || p === 'ios' ? p : 'web';
  } catch {
    return 'web';
  }
}

function resolveApiUrl(): string {
  const { url, natifSansConfiguration } = resoudreUrlApi({
    // `?.` volontaire : hors Vite (tsx, test unitaire) `import.meta.env`
    // n'existe pas, et ce module ne doit pas exploser a l'import.
    viteApiUrl: import.meta.env?.VITE_API_URL,
    plateforme: plateformeCourante(),
    hostname: typeof window !== 'undefined' ? window.location.hostname : '',
  });
  if (natifSansConfiguration) {
    // Un seul message, mais qui dit quoi faire — c'est une erreur de BUILD,
    // pas une panne reseau, et personne ne la devinera au telephone.
    // eslint-disable-next-line no-console
    console.error(
      "[JULABA] Application native construite sans VITE_API_URL : aucune requete n'atteindra " +
        'de backend. Reconstruire avec VITE_API_URL=https://<backend>/api/v1 avant `npx cap sync`.',
    );
  }
  return url;
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
 *
 * API-08 — POURQUOI CET APPEL NE PASSE PAS PAR `apiRequest` (décision du
 * 20/09/2026). Son seul consommateur est `UnregisteredPhone` — l'écran
 * « numéro inconnu » de la connexion, AVANT toute session. Or, côté serveur,
 * `GET /system/settings` vit dans `misc-rest.controller.ts` sous
 * `@UseGuards(JwtAuthGuard, RolesGuard)`, sans `@Public()` : sans session il
 * répond 401, et l'écran garde son numéro de secours (c'est déjà ce qui se
 * passe aujourd'hui, en silence). Le faire passer par la couche ne serait PAS
 * neutre : sur ce 401, `apiRequest` tenterait un rafraîchissement sans jeton
 * puis lèverait `julaba:session-expired` — purge du stockage local et
 * POST /auth/logout — sur un écran qui n'a pas de session. Le vrai défaut est
 * côté serveur (une route consultée avant connexion, gardée par un JWT) : hors
 * périmètre de ce chantier, signalé au registre.
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
