const VERSION = 'mcf-v10-2-20261122';
const ASSETS = ['./','./index.html','./styles.css?v=0.10.2','./logic.js?v=0.8.0','./app.js?v=0.10.2','./csv.js?v=0.8.0','./storage.js?v=0.9.2','./card-designs.css?v=0.3.1','./cards/banks/inbursa.css?v=0.3.1','./cards/banks/mercado-pago.css?v=0.3.2','./cards/banks/nu.css?v=0.3.2','./cards/banks/bbva.css?v=0.3.2','./cards/banks/revolut.css?v=0.3.1','./card-designs.js?v=0.3.2','./card-images.js?v=0.3.0','./drive-sync.js?v=0.9.0','./features/backup/backup-model.js?v=0.9.0','./cards-preview.html?v=0.3.2','./features/finance/insights.js?v=0.7.0','./features/finance/recurring.js?v=0.4.0','./features/finance/forms.js?v=0.9.2','./features/finance/transaction-forms.js?v=0.9.1','./features/planning/planning.js?v=0.10.2','./features/planning/planning-view.js?v=0.10.2','./features/planning/planning.css?v=0.10.2','./features/dashboard/dashboard.js?v=0.7.3','./features/dashboard/dashboard.css?v=0.6.0','./features/payroll/payroll.js?v=0.5.0','./features/payroll/payroll-view.js?v=0.5.0','./features/payroll/payroll.css?v=0.5.0','./features/cards/billing.js?v=0.8.1','./features/cards/billing-view.js?v=0.7.3','./features/cards/billing.css?v=0.7.3','./features/accounts/account-page.css?v=0.7.0','./features/accounts/account-page.js?v=0.8.1','./features/savings/pockets.js?v=0.7.1','./features/savings/pockets-view.js?v=0.7.0','./features/cards/credit-row.js?v=0.7.0','./features/ui/account-picker.css?v=0.4.2','./features/ui/account-picker.js?v=0.4.2','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];
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
  }).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
