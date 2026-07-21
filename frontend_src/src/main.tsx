import { initSentry } from "./sentry";
initSentry();
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import 'leaflet/dist/leaflet.css';
import './styles/fonts.css';
import './styles/theme.css';
import './styles/tailwind.css';
import './styles/index.css';

// ── Auth mobile : jeton en en-tête Authorization ──────────────────────────────
// Les cookies cross-domaine (julaba-web ↔ julaba-api) sont BLOQUÉS par les
// navigateurs mobiles (surtout en navigation privée) → la connexion « réussissait »
// puis l'appli te croyait déconnectée (« retour au début »). On envoie donc le
// jeton stocké (localStorage) en en-tête sur chaque appel à NOTRE API. Le backend
// accepte déjà « Authorization: Bearer … » en plus du cookie → connexion fiable
// partout, sans dépendre du cookie.
(() => {
  const origFetch = window.fetch.bind(window);
  window.fetch = (input: any, init: any = {}) => {
    try {
      const url = typeof input === 'string' ? input : (input?.url || '');
      if (url && url.includes('/api/v1')) {
        const token = localStorage.getItem('julaba_access_token');
        if (token) {
          const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          init = { ...init, headers };
        }
      }
    } catch { /* ignore */ }
    return origFetch(input, init);
  };
})();

// Ré-échauffe le modèle vocal hors-ligne s'il a déjà été installé sur cet appareil.
// (Le drapeau d'installation est persistant ; le modèle en mémoire, lui, est perdu
// à chaque rechargement — sans ça la voix retombait sur le cloud mort.)
// Différé et non-bloquant pour ne pas gêner le premier affichage.
import('./app/voice-offline/offlineStt')
  .then(({ warmOfflineModelIfInstalled }) => {
    const warm = () => warmOfflineModelIfInstalled();
    if ('requestIdleCallback' in window) (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(warm);
    else setTimeout(warm, 2000);
  })
  .catch(() => { /* ignore */ });

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(

  <App />

);

// Numéro de version accessible partout (affiché à l'écran de connexion, et
// consultable via la console pour le support).
try { (window as unknown as { __JULABA_VERSION__?: string }).__JULABA_VERSION__ = __BUILD_ID__; } catch { /* ignore */ }

// Service worker enregistré DÈS LE DÉMARRAGE (et plus seulement après connexion) :
// il met l'appli en cache dès la première visite en ligne, pour qu'elle puisse
// s'ouvrir HORS-LIGNE ensuite. La souscription aux notifications push reste, elle,
// gérée après connexion (elle réutilise ce même service worker).
if ('serviceWorker' in navigator) {
  // MISE À JOUR AUTOMATIQUE : quand un nouveau service worker prend la main
  // (nouveau déploiement détecté), on recharge une seule fois pour afficher la
  // dernière version — fini le « je ne sais jamais quelle version j'utilise ».
  // On ne recharge PAS à la toute première visite (aucun contrôleur précédent).
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        // Vérifie tout de suite s'il existe une version plus récente…
        reg.update?.().catch(() => { /* ignore */ });
        // …et à chaque retour au premier plan (réveil du téléphone).
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update?.().catch(() => { /* ignore */ });
        });
      })
      .catch((e) => {
        console.warn('[SW] enregistrement échoué:', e?.message);
      });
  });
}