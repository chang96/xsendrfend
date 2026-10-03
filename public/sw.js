/* faax service worker
 * - App shell: network-first for pages (always fresh when online, cached index.html offline),
 *   cache-first for hashed /static/ assets and icons.
 * - Share target: Android's share sheet POSTs files to /share-target. We keep them in
 *   IndexedDB on this device (never uploaded anywhere) and open /share?id=... to send them.
 */
const VERSION = "faax-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const SHELL = ["/", "/index.html", "/manifest.json", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
const MAX_STATIC_ENTRIES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// ------------------------------------------------------------------ share inbox (IndexedDB)
function openInbox() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("faax-share", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("shares", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveShare(record) {
  const db = await openInbox();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("shares", "readwrite");
    tx.objectStore("shares").put(record);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function handleShare(request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((f) => f && typeof f === "object" && "size" in f);
    const id = "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await saveShare({
      id,
      at: Date.now(),
      title: String(form.get("title") || ""),
      text: String(form.get("text") || ""),
      url: String(form.get("url") || ""),
      files: files.map((f) => ({ name: f.name || "shared-file", type: f.type || "", size: f.size, blob: f })),
    });
    return Response.redirect(`/share?id=${id}`, 303);
  } catch (e) {
    return Response.redirect("/share?error=1", 303);
  }
}

// ------------------------------------------------------------------ fetch
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method === "POST" && url.origin === self.location.origin && url.pathname === "/share-target") {
    event.respondWith(handleShare(req));
    return;
  }
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // sockets, APIs, other hosts: untouched

  // Pages: network first, fall back to the cached app shell when offline
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(SHELL_CACHE);
        cache.put("/index.html", fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        return (await caches.match("/index.html")) || (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  // Hashed build assets + icons: cache first
  if (url.pathname.startsWith("/static/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, res.clone()).then(() => trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES)).catch(() => {});
      }
      return res;
    })());
  }
});
