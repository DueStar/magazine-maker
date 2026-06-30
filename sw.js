const CACHE_NAME = 'card-maker-v2';
const FONT_CACHE = 'card-maker-fonts-v1';

const APP_SHELL = [
  './index.html',
  './app.js',
  './styles.css',
  './manifest.json',
];

const FONT_URLS = [
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css',
];

self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)),
      caches.open(FONT_CACHE).then(c => c.addAll(FONT_URLS).catch(() => {})),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 폰트 CDN: stale-while-revalidate
  if (
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com')
  ) {
    e.respondWith(
      caches.open(FONT_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        const fetchPromise = fetch(e.request)
          .then(res => { cache.put(e.request, res.clone()); return res; })
          .catch(() => null);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 앱 셸: cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
