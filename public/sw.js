// FlowDock: service worker do PWA do motorista.
// RNF06: o app abre e mostra a última situação conhecida mesmo sem conexão.
const CACHE = "flowdock-v1";
const SHELL = ["/", "/motorista/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return; // API: sempre rede

  if (req.mode === "navigate") {
    // páginas: rede primeiro, cache se estiver sem sinal
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return r;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/motorista/"))),
    );
    return;
  }

  // arquivos estáticos (JS, CSS, ícones): cache primeiro
  e.respondWith(
    caches.match(req).then(
      (r) =>
        r ||
        fetch(req).then((resp) => {
          if (resp.ok && (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icons/"))) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return resp;
        }),
    ),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const alvo = (e.notification.data && e.notification.data.url) || "/motorista/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) if (c.url.includes(alvo) && "focus" in c) return c.focus();
      return self.clients.openWindow(alvo);
    }),
  );
});
