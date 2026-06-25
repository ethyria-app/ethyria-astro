// ─────────────────────────────────────────────────────────────
//  Ethyria Service Worker – Cache-First for assets, Network-First for HTML
//  Bump CACHE_VERSION on every deploy to trigger cache refresh.
// ─────────────────────────────────────────────────────────────

const CACHE_VERSION = 'ethyria-astro-v1';
const OFFLINE_URL = '/offline/';

const PRECACHE_ASSETS = [
  '/',
  '/en/',
  '/fr/',
  '/es/',
  '/ru/',
  '/offline/',
  '/style.css',
  '/assets/tailwind.min.css',
  '/assets/consent.js',
  '/assets/hub-tabs.js',
  '/assets/hub-accordion.js',
  '/assets/dream-cards.js',
  '/assets/brief-cards.js',
  '/assets/ui-animations.js',
  '/assets/vision-expand.js',
  '/assets/roadmap-toggle.js',
  '/assets/conversion.js',
  '/assets/download-cta.js',
  '/assets/nav-mobile.js',
  '/assets/slider.js',
  '/assets/web-vitals.js',
  '/assets/sentry-init.js',
  '/assets/analytics.js',
  '/assets/faq-accordion.js',
  '/assets/section-nav.js',
  '/assets/symbol-popup.js',
  '/assets/lang-switcher.js',
  '/assets/api-config.js',
  '/assets/analyse-config.de.js',
  '/assets/analyse-config.en.js',
  '/assets/analyse-config.fr.js',
  '/assets/analyse-config.es.js',
  '/assets/analyse-config.ru.js',
  '/assets/Ethyria_new_app_icon.png',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  '/fonts/poppins_bold.woff2',
  '/fonts/inter_regular.woff2',
  '/symbols/',
];

// ── Install: precache critical assets ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch strategy ────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  // HTML pages: Network-First with offline fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets: Cache-First
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (
          response.ok &&
          (request.url.match(/\.(css|js|woff2|webp|avif|jpg|png|svg|json|ico)$/) ||
            request.url.includes('/assets/') ||
            request.url.includes('/fonts/'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
