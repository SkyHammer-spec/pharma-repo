const CACHE_NAME = "alzouhor-mobile-shell-v24"; // bumped from v23 to force all clients to discard the old stale cache
const SHELL_FILES = ["./index.html", "./app.js", "./styles.css", "./manifest.json", "./logo.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

// NETWORK-FIRST for the app shell (app.js, index.html, etc.):
// Always try the network first so a fresh deploy is picked up immediately,
// without needing to manually bump CACHE_NAME or clear caches by hand.
// Only fall back to the cached copy if the network request fails
// (offline / no connection) - preserving the original offline-support intent.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.hostname.includes("drive.google.com")) return; // never intercept Drive data calls

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Keep the cache updated with the latest version for offline fallback.
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener("push", (e) => {
  let t = { title: "Al Zouhor Pharmacy", body: "New alert", tag: "general" };
  try {
    t = e.data.json();
  } catch (e) {}
  e.waitUntil(
    self.registration.showNotification(t.title, {
      body: t.body,
      tag: t.tag,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) if ("focus" in client) return client.focus();
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
