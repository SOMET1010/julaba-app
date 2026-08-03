/// <reference types="@capacitor/cli" />
// ──────────────────────────────────────────────────────────────────────────
// Route B — coquille NATIVE de Julaba (Capacitor).
//
// Julaba reste un site React/Vite. Capacitor l'emballe dans une appli Android
// pour accéder au moteur vocal Sherpa NATIF (bien meilleur que la version
// navigateur). Ce fichier ne change RIEN au site web : il ne sert qu'au build
// de l'APK, réalisé dans un atelier Android (voir docs/ROUTE-B-BUILD-ANDROID.md).
//
// `webDir` pointe vers la sortie réelle de `vite build` : ../frontend/dist
// (défini dans vite.config.ts → build.outDir).
// ──────────────────────────────────────────────────────────────────────────
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ci.julaba.app',
  appName: 'Julaba',
  webDir: '../frontend/dist',
  android: {
    // La marchande est souvent hors-ligne : on ne veut aucun appel réseau
    // silencieux du WebView. Le contenu est servi depuis l'APK.
    allowMixedContent: false,
  },
};

export default config;
