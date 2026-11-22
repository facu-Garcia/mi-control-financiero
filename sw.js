const VERSION = 'mcf-v7-2-20261121';
const ASSETS = ['./','./index.html','./styles.css','./logic.js?v=0.7.0','./app.js?v=0.7.2','./csv.js?v=0.3.0','./storage.js?v=0.7.0','./card-designs.css?v=0.3.1','./cards/banks/inbursa.css?v=0.3.1','./cards/banks/mercado-pago.css?v=0.3.2','./cards/banks/nu.css?v=0.3.2','./cards/banks/bbva.css?v=0.3.2','./cards/banks/revolut.css?v=0.3.1','./card-designs.js?v=0.3.2','./card-images.js?v=0.3.0','./drive-sync.js?v=0.2.4','./cards-preview.html?v=0.3.2','./features/finance/insights.js?v=0.7.0','./features/finance/recurring.js?v=0.4.0','./features/finance/forms.js?v=0.4.1','./features/dashboard/dashboard.js?v=0.7.0','./features/dashboard/dashboard.css?v=0.6.0','./features/payroll/payroll.js?v=0.5.0','./features/payroll/payroll-view.js?v=0.5.0','./features/payroll/payroll.css?v=0.5.0','./features/cards/billing.js?v=0.7.0','./features/cards/billing-view.js?v=0.7.0','./features/cards/billing.css?v=0.6.0','./features/accounts/account-page.css?v=0.7.0','./features/accounts/account-page.js?v=0.7.0','./features/savings/pockets.js?v=0.7.1','./features/savings/pockets-view.js?v=0.7.0','./features/cards/credit-row.js?v=0.7.0','./features/ui/account-picker.css?v=0.4.2','./features/ui/account-picker.js?v=0.4.2','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];
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
