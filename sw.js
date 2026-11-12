// SmartDocs service worker — network-first so deploys take effect immediately.
const CACHE = 'smartdocs-v6';
const ASSETS = ['./', './index.html', './css/style.css', './js/app.js', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isFreshTarget(url) {
  return url.origin === self.location.origin &&
    (url.pathname.endsWith('/') ||
     /\.(html|js|css|json)$/i.test(url.pathname));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let the network handle CDN/fonts

  // API calls: always live, never cached.
  if (url.pathname.startsWith('/api/')) return;

  if (isFreshTarget(url) || req.mode === 'navigate') {
    // Network-first: always try to get the latest HTML/JS/CSS.
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(resp => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() =>
          caches.match(req).then(hit => hit || caches.match('./index.html'))
        )
    );
    return;
  }

  // Other static files (icons, images): cache-first with background refresh.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(resp => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
