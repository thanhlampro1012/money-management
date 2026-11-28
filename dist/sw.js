/* Only the public application shell belongs in this cache. Financial data stays
 * in the storage/backup layers; other projects on the same origin are untouched.
 * Bump VERSION for every release that changes a precached file. */
const VERSION = '1.6.0-google-pages';
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `money-management:${SCOPE.href}:`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const APP_FILES = [
  'index.html', 'app.js', 'finance.js', 'storage.js', 'backup.js', 'input.js',
  'theme.js', 'export.js', 'export-template.js', 'styles.css', 'mobile.css',
  'pwa.js', 'vault.js', 'cloud.js', 'firebase-sync.js', 'firebase-transport.js', 'manifest.webmanifest', 'icon.svg', 'icons/apple-touch-icon.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png',
];
const APP_URLS = APP_FILES.map(file => new URL(file, SCOPE).href);
const ASSET_URLS = new Set(APP_URLS);
const INDEX_URL = new URL('index.html', SCOPE).href;

self.addEventListener('install', event => {
  // addAll commits as one batch. A missing file rejects the install, leaving the
  // current version active. Never activate an update without a user gesture.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_URLS.map(url => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin || url.search) return;
  const appNavigation = request.mode === 'navigate' && (url.href === SCOPE.href || url.href === INDEX_URL);
  if (!appNavigation && !ASSET_URLS.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(appNavigation ? INDEX_URL : url.href);
    // Cache first keeps modules and HTML on the same release until the user
    // explicitly accepts the ready update. No dynamic or user data is cached.
    if (cached) return cached;
    return fetch(request);
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'ACTIVATE_UPDATE' || !event.source?.url) return;
  const client = new URL(event.source.url);
  if (client.origin !== SCOPE.origin || !client.pathname.startsWith(SCOPE.pathname)) return;
  event.waitUntil(self.skipWaiting());
});
