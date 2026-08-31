const VERSION = "1.0.2";
const SHELL_CACHE = `garageflow-shell-v${VERSION}`;
const RUNTIME_CACHE = `garageflow-runtime-v${VERSION}`;
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  `/style.css?v=${VERSION}`,
  `/app.js?v=${VERSION}`,
  `/payroll-reminder.js?v=${VERSION}`,
  "/manifest.webmanifest",
  "/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("garageflow-") && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return (await caches.match(request)) || (fallbackUrl ? await caches.match(fallbackUrl) : Response.error());
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase.co")) return;
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    const fallback = url.pathname.startsWith("/modules/") ? "/offline.html" : "/index.html";
    event.respondWith(networkFirst(event.request, fallback));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    }))
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "GarageFlow", body: "Yeni bildirimin var", url: "/" };
  try { data = event.data.json(); } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title || "GarageFlow", {
    body: data.body || "Yeni bildirimin var",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "garageflow-notification",
    data: { url: data.url || "/" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
    const appWindow = list.find((client) => new URL(client.url).origin === self.location.origin);
    if (appWindow) {
      await appWindow.navigate(targetUrl);
      return appWindow.focus();
    }
    return clients.openWindow(targetUrl);
  }));
});
