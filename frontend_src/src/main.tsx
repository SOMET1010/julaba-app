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