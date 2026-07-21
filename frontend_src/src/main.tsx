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

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(

  <App />

);

// Service worker enregistré DÈS LE DÉMARRAGE (et plus seulement après connexion) :
// il met l'appli en cache dès la première visite en ligne, pour qu'elle puisse
// s'ouvrir HORS-LIGNE ensuite. La souscription aux notifications push reste, elle,
// gérée après connexion (elle réutilise ce même service worker).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => {
      console.warn('[SW] enregistrement échoué:', e?.message);
    });
  });
}