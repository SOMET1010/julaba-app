import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ci.julaba.app',
  appName: 'julaba-app',
  // Vite construit dans ../frontend_src/vite.config.ts (build.outDir: "../frontend/dist")
  // → à la racine du dépôt (où vit android/), le web build est donc "frontend/dist",
  // PAS "frontend_src/dist" (qui n'est jamais peuplé). L'ancienne valeur portait de
  // plus une faute de syntaxe ("webDir=..." collé dans la chaîne) qui empêchait tout
  // sync Android de trouver les assets.
  webDir: 'frontend/dist',
};

export default config;
