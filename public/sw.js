'use strict';

// Pisti service worker: installable, offline-capable shell.
// Bump CACHE on every deploy so clients pick up the new version.

const BASE = self.location.pathname.replace(/\/sw\.js$/, ''); // e.g. /pisti
const CACHE = 'pisti-v5';
const SHELL = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/styles.css`,
  `${BASE}/app.js`,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
];

self.addEventListener('install', (event) => {
  // No skipWaiting here: the new version stays 'waiting' so the page can show
  // its update prompt. It activates when the user accepts (SKIP_WAITING
  // message) or naturally on the next launch after the app is closed.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page posts this when the user accepts the update prompt: the waiting
// worker takes over immediately instead of waiting for every tab to close.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  // Never cache the API; go straight to network.
  if (url.pathname.startsWith(`${BASE}/api/`)) return;

  // Stale-while-revalidate: answer instantly from cache, refresh the cached
  // copy in the background — so the next launch always has the latest, even
  // if the user never taps the update prompt.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(event.request);
      const refresh = fetch(event.request)
        .then((resp) => {
          if (resp.ok) cache.put(event.request, resp.clone());
          return resp;
        })
        .catch(() => null);
      event.waitUntil(refresh.then(() => undefined));
      if (cached) return cached;
      const net = await refresh;
      if (net) return net;
      return cache.match(`${BASE}/index.html`);
    })()
  );
});
