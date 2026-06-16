/* Dengue Prohori service worker — offline app shell + cached libraries + notifications */
const CACHE = "prohori-v3";
const SHELL = [
  "./", "./index.html", "./prohori-model.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/icon-maskable.png"
];
const RUNTIME_HOSTS = ["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = e.request.url;
  if (url.includes("api.open-meteo.com") || url.includes("tile.openstreetmap.org") ||
      url.includes("server.arcgisonline.com") || url.includes("basemaps.cartocdn.com")) return;
  const isShell = url.startsWith(self.location.origin);
  const isLib = RUNTIME_HOSTS.some(h => url.includes(h));
  if (isShell || isLib) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (e.request.method === "GET" && res && (res.ok || res.type === "opaque")) {
          const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => isShell ? caches.match("./index.html") : undefined))
    );
  }
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then(list => {
    for (const c of list) if ("focus" in c) return c.focus();
    return clients.openWindow("./index.html");
  }));
});
