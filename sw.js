// ATLAS service worker — app-shell caching so the app still loads (and the
// existing IndexedDB-backed offline data layer still works) with no
// network connection. Bump CACHE_VERSION whenever index.html/script.js/
// style.css change so clients pick up the new files instead of serving a
// stale cached copy forever.
const CACHE_VERSION = "atlas-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
// Third-party assets the app needs to actually run offline once installed.
// Cached opportunistically (see fetch handler) rather than pre-cached here,
// since a slow/broken CDN shouldn't block installation of the app shell.
const RUNTIME_CACHEABLE_HOSTS = [
  "cdnjs.cloudflare.com",
  "www.gstatic.com"
];

self.addEventListener("install", (event)=>{
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)).then(()=> self.skipWaiting())
  );
});

self.addEventListener("activate", (event)=>{
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

self.addEventListener("fetch", (event)=>{
  const req = event.request;
  if(req.method !== "GET") return; // never intercept writes

  const url = new URL(req.url);
  const isAppShell = url.origin === self.location.origin;
  const isRuntimeCacheable = RUNTIME_CACHEABLE_HOSTS.includes(url.hostname);
  if(!isAppShell && !isRuntimeCacheable) return; // let everything else (e.g. Firebase/Firestore calls) hit the network normally

  // Network-first for the app shell so a logged-in admin editing the app
  // (or redeploying an update) is picked up quickly, falling back to the
  // cache when offline. Cache-first for third-party libraries, since
  // their versioned CDN URLs never change content once fetched.
  if(isAppShell){
    event.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(cache=> cache.put(req, copy));
        return res;
      }).catch(()=> caches.match(req).then(cached => cached || caches.match("./index.html")))
    );
  } else {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(cache=> cache.put(req, copy));
        return res;
      }))
    );
  }
});
