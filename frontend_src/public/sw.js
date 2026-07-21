// __SW_BUILD__ est remplacé au build par « <hash> · <date> » (voir vite.config).
// Chaque déploiement change donc ces octets → le navigateur détecte la nouvelle
// version et l'appli se met à jour toute seule. En dev (placeholder non remplacé)
// on retombe sur une valeur fixe.
const BUILD = '__SW_BUILD__'.indexOf('__SW') === 0 ? 'dev' : '__SW_BUILD__';
const CACHE_NAME = 'julaba-' + BUILD;
const STATIC_ASSETS = ['/', '/index.html'];

// ── INSTALL ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE ───────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ──────────────────────────────────────────────────────
// Stratégie pensée pour le HORS-LIGNE d'une vendeuse au réseau instable :
//  • /assets/* (fichiers de build au nom haché, donc immuables) → CACHE D'ABORD :
//    servis instantanément, même hors-ligne ou en réseau très faible. Une nouvelle
//    version = de nouveaux noms de fichiers, donc aucun risque de servir du périmé.
//  • navigation / le reste (index.html…) → RÉSEAU D'ABORD, repli sur le cache :
//    on récupère les mises à jour en ligne, et l'appli s'ouvre quand même hors-ligne.
//  • /api et /backoffice → jamais mis en cache (données fraîches / sécurité).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api')) return;
  if (url.pathname.startsWith('/backoffice')) return;

  const isHashedAsset = url.pathname.startsWith('/assets/');

  if (isHashedAsset) {
    // CACHE D'ABORD
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // RÉSEAU D'ABORD (navigation, index.html, images publiques…)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        // Hors-ligne : on sert la ressource en cache, sinon l'index (SPA).
        caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});

// ── PUSH NOTIFICATION ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Julaba', body: event.data.text() };
  }

  const title   = data.title   || 'Julaba';
  const options = {
    body:    data.body    || data.message || '',
    icon:    data.icon    || '/images/tantie-sagesse-icon.png',
    badge:   '/images/tantie-sagesse-icon.png',
    vibrate: [200, 100, 200],
    tag:     data.tag     || 'julaba-notif',
    renotify: true,
    data: {
      url: data.url || '/',
      notifId: data.notifId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ─────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          await client.focus();
          if ('navigate' in client && typeof client.navigate === 'function') {
            await client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
