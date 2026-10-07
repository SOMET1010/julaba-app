/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __BUILD_HASH__: string
declare const __BUILD_DATE__: string
declare const __BUILD_ID__: string
// Drapeaux de construction du dioula (vite.config.ts). Éteints par défaut, et
// ABSENTS de tout processus Node : voir src/app/i18n/voice/drapeauxDeTest.ts.
declare const __JULABA_VOIX_DYU__: boolean
declare const __JULABA_DYU_ARGENT__: boolean

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  // Modules hors pilote qui portent de l'argent : `true` = visibles (build de
  // démonstration), tout le reste = masqués. Voir src/app/config/modulesPilote.ts.
  readonly VITE_JULABA_MODULES_HORS_PILOTE?: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
