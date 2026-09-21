// Sentry (+ intégrations tracing/replay) pèse ~350 Ko à lui seul dans le
// bundle initial une fois importé statiquement — hors budget (chunkSizeWarning
// à 600 Ko, budget de bundle initial à 800 Ko). Import dynamique : Vite le met
// dans son propre chunk, chargé en parallèle sans bloquer/alourdir l'entrée.
// Démarré tout de suite (pas différé comme les blocs plus bas) pour garder la
// capture d'erreurs quasi aussi précoce qu'avant.
import('./sentry').then(({ initSentry }) => initSentry()).catch(() => { /* ignore */ });
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import 'leaflet/dist/leaflet.css';
import './styles/fonts.css';
import './styles/icons-tabler.css';
import './styles/theme.css';
import './styles/tailwind.css';
import './styles/index.css';
import './styles/tokens.css';
import './styles/soleil.css';
import './styles/commerce.css';
import './styles/login.css';
// Mode SOLEIL (confort visuel) : ré-applique le choix mémorisé dès le démarrage.
import { appliquerConfortAuDemarrage } from './app/utils/confortVisuel';
appliquerConfortAuDemarrage();

// ── Auth mobile : jeton en en-tête Authorization — FILET TEMPORAIRE ──────────
// Les cookies cross-domaine (julaba-web ↔ julaba-api) sont BLOQUÉS par les
// navigateurs mobiles (surtout en navigation privée) → la connexion « réussissait »
// puis l'appli te croyait déconnectée (« retour au début »). On envoie donc le
// jeton stocké (localStorage) en en-tête sur chaque appel à NOTRE API. Le backend
// accepte déjà « Authorization: Bearer … » en plus du cookie → connexion fiable
// partout, sans dépendre du cookie.
//
// STATUT (API-04, 20/09/2026) : ce patch n'est PLUS ce qui porte la couche API.
// `services/api/api-client.ts` pose l'en-tête lui-même, à chaque essai, jeton
// relu au moment de l'appel (rejeu après rafraîchissement et file hors-ligne
// compris — tenu par `test:api-authorization`, qui tourne SANS ce patch).
//
// Il reste un FILET pour ce qui n'est pas encore passé par la couche : les
// `fetch()` directs vers notre API hors `services/api/` (dette API-10 —
// 164 appels dans 50 fichiers à la date ci-dessus : AppContext, authService,
// les écrans identificateur, le back-office…). Ce compte est RE-MESURÉ à
// chaque exécution de `test:api-authorization` ; le jour où il tombe à zéro,
// ce test rougit pour exiger le retrait de ce bloc. Ne pas le retirer avant.
//
// Typé (TYPE-03) : `fetch` reçoit une chaîne, une `URL` ou une `Request`.
(() => {
  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.href;
      if (url.includes('/api/v1')) {
        const token = localStorage.getItem('julaba_access_token');
        if (token) {
          const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          init = { ...init, headers };
        }
      }
    } catch { /* ignore */ }
    return origFetch(input, init);
  };
})();

// ── Routage audio Bluetooth ─────────────────────────────────────────────────
// Une marchande au marché a les mains pleines et le téléphone au fond du pagne :
// il faut que la voix de Tantie arrive dans son oreillette et, si elle en porte
// une, que ce soit SON micro qui écoute. Le routage s'installe ICI, en un seul
// point, parce qu'il enveloppe `getUserMedia` — exactement comme le filet
// `window.fetch` juste au-dessus. Tous les micros de l'application en héritent
// sans qu'aucun écran ne change, et surtout sans rouvrir `useVoiceCore.ts`,
// `audioManager.ts` ni `offlineStt.ts`, qui sont gelés au caractère près.
//
// Non-opération complète hors APK Android (le plugin natif n'existe pas sur le
// web), et toute erreur est avalée : le routage ne peut pas faire perdre une
// vente — au pire, la marchande entend Tantie comme aujourd'hui.
import('./app/services/routageAudio')
  .then(({ installerRoutageAudio }) => installerRoutageAudio())
  .catch(() => { /* ignore */ });

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

// NB : le moteur vocal (sherpa-onnx) est EMBARQUÉ dans l'application Android —
// plus aucun téléchargement de modèle (l'ancien moteur Vosk et ses ~40 Mo sont
// retirés, voir docs/INCLUSION.md). Les CLIPS de la voix (~7 Mo) restent, eux,
// embarqués d'office (ci-dessous) : c'est la voix propre de l'appli, pas de coût
// de données à surprise.

// Précharge les clips de la voix « Tata Nanti Lou » (lecture instantanée + cache
// hors-ligne). Différé pour ne pas ralentir le premier affichage.
import('./app/services/tataVoice')
  .then(({ preloadTataClips }) => {
    const go = () => preloadTataClips();
    if ('requestIdleCallback' in window) (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(go);
    else setTimeout(go, 2500);
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
