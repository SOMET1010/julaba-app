/**
 * Lecture/validation des variables d'environnement du Gateway Odoo — toutes
 * BACKEND UNIQUEMENT, jamais exposées au frontend JULABA. Isolé dans son
 * propre fichier pour rester testable sans dépendre de `process.env` global
 * dans les tests (chaque fonction accepte un `env` explicite, par défaut
 * `process.env`).
 */
export type OdooClientMode = 'mock' | 'real';

export interface OdooRealClientConfig {
  baseUrl: string;
  apiKey: string;
  database?: string;
  /** Verrou d'écriture — voir odoo-real.client.ts. Par défaut false : ce lot
   *  est volontairement lecture seule contre une vraie instance Odoo. */
  writeEnabled: boolean;
  timeoutMs: number;
}

const TIMEOUT_MS_DEFAUT = 8000;

export function lireModeClientOdoo(env: NodeJS.ProcessEnv = process.env): OdooClientMode {
  return env.ODOO_CLIENT_MODE === 'real' ? 'real' : 'mock';
}

/**
 * Échec explicite au démarrage plutôt qu'un repli silencieux vers le mock :
 * si `ODOO_CLIENT_MODE=real` est demandé sans secrets, on veut un crash au
 * boot (visible immédiatement), pas une app qui tourne en pensant parler à
 * Odoo alors qu'elle exécute en réalité le mock.
 */
export function lireConfigOdooReel(env: NodeJS.ProcessEnv = process.env): OdooRealClientConfig {
  const baseUrl = env.ODOO_BASE_URL;
  const apiKey = env.ODOO_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      'ODOO_CLIENT_MODE=real nécessite ODOO_BASE_URL et ODOO_API_KEY (voir ' +
        'docs/ETUDE_ARCHITECTURE_JULABA_ODOO.md) — démarrage refusé plutôt qu’un repli silencieux vers le mock.',
    );
  }
  return {
    baseUrl,
    apiKey,
    database: env.ODOO_DB || undefined,
    writeEnabled: env.ODOO_REAL_WRITE_ENABLED === 'true',
    timeoutMs: Number(env.ODOO_REAL_TIMEOUT_MS) || TIMEOUT_MS_DEFAUT,
  };
}
