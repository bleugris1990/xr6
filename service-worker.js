// service-worker.js — cache l'appli pour un fonctionnement 100% hors-ligne.
//
// Quand tu modifies le code plus tard, change CACHE_NAME (ex: fitlog-v2)
// pour forcer la mise à jour du cache sur le téléphone.

const CACHE_NAME = "fitlog-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/router.js",
  "./js/db.js",
  "./js/util.js",
  "./js/charts.js",
  "./js/export.js",
  "./js/screens/home.js",
  "./js/screens/archived.js",
  "./js/screens/newRoutine.js",
  "./js/screens/session.js",
  "./js/screens/recap.js",
  "./js/screens/stats.js",
  "./js/screens/perso.js",
  "./vendor/xlsx.core.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
