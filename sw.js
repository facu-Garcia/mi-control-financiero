const VERSION = 'mcf-v2-1-20261121';
const ASSETS = ['./','./index.html','./styles.css','./logic.js','./app.js','./csv.js','./drive-sync.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mcf-')&&k!==VERSION).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(res=>{
    if(res.ok && url.pathname.startsWith(new URL(self.registration.scope).pathname)) {
      caches.open(VERSION).then(c=>c.put(event.request,res.clone())).catch(()=>{});
    }
    return res;
  }).catch(()=>caches.match('./index.html'))));
});
