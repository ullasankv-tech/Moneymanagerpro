// Money Manager Pro — Service Worker
// GitHub Pages: https://ullasankv-tech.github.io/money-manager-pro

const CACHE_NAME = 'money-manager-pro-v12';
const BASE = '/money-manager-pro/';
const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing v12...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(e => console.log('[SW] Cache warning:', e));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        fetch(event.request).then(r => {
          if(r && r.status===200) caches.open(CACHE_NAME).then(c=>c.put(event.request,r.clone()));
        }).catch(()=>{});
        return cached;
      }
      return fetch(event.request).then(r => {
        if(!r || r.status!==200) return r;
        caches.open(CACHE_NAME).then(c=>c.put(event.request,r.clone()));
        return r;
      }).catch(()=> caches.match(BASE+'index.html'));
    })
  );
});
