/**
 * Banc UI Jùlaba — hors production, JETABLE. Capture l'APPLICATION RÉELLE
 * (index.html de prod, routes et composants de production) avec une session
 * en cache injectée AVANT le chargement — l'état d'un téléphone qui rouvre
 * l'APK hors-ligne : hydratation optimiste (AppContext), splash et onboarding
 * déjà vus. AUCUN serveur : `VITE_API_URL` vaut un port mort, /auth/me échoue
 * réseau et la session en cache est conservée — le même chemin de code que
 * l'APK en mode avion. `VITE_JULABA_MODULES_HORS_PILOTE=true` laisse les
 * routes keiwa ouvertes pour la capture (aucune écriture possible : API morte).
 *
 * Pourquoi ce banc et pas `apercu-accueil-voix` : celui-ci recopie l'accueil
 * (maquette) ; ici le vrai `MarchandAccueilVoice`, le vrai `SubPageLayout`,
 * la vraie sidebar — les captures prouvent le composant LIVRÉ, pas une copie.
 * Le root Vite reste `frontend` pour que Tailwind scanne les vraies sources.
 */
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import base from '../vite.config';

/** Injecte la session en cache dans l'index.html — le script inline de <head>
 *  s'exécute AVANT le module principal (déféré), donc avant le premier rendu. */
const bancUiInject = (): Plugin => ({
  name: 'banc-ui-inject',
  apply: 'serve',
  transformIndexHtml(html) {
    const inject = `<script>
try {
  localStorage.setItem('julaba_auth_user', JSON.stringify({
    id: 'banc-ui-0001',
    phone: '0701020304',
    firstName: 'Awa',
    lastName: 'KONE',
    role: 'marchand',
    sousProfilMarchand: null,
    region: 'Abidjan',
    commune: 'Abobo',
    activity: 'Vente de légumes',
    market: 'Marché d\\'Abobo',
    score: 0,
    createdAt: '2026-01-15T08:00:00.000Z',
    validated: true,
    // Le banc capture les écrans keiwa APRÈS l'enrôlement PIN : sans ça,
    // WalletPage ouvre « Crée ton code PIN » et masque le header à capturer.
    pinSecurityEnabled: true,
    pinCode: '2580'
  }));
  localStorage.setItem('julaba_seen_splash', 'true');
  localStorage.setItem('julaba_completed_onboarding', 'true');
} catch {}
</script>`;
    return html.replace('</head>', `${inject}</head>`);
  },
});

export default defineConfig(async (env) => {
  const config = typeof base === 'function' ? await base(env) : base;
  return mergeConfig(config, {
    plugins: [bancUiInject()],
    server: { host: '127.0.0.1', port: 5215, strictPort: true },
  });
});
