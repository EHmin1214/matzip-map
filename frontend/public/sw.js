// Service Worker — 나의 공간 PWA
const CACHE_NAME = "myspace-v1";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/logo192.png",
];

// 외부 폰트/아이콘 캐싱
const FONT_ORIGINS = [
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // API 요청은 네트워크 우선
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // 폰트/아이콘: 캐시 우선 (stale-while-revalidate)
  if (FONT_ORIGINS.some((o) => e.request.url.startsWith(o))) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 앱 셸: 캐시 우선, 네트워크 폴백
  if (e.request.mode === "navigate") {
    e.respondWith(
      caches.match("/index.html").then((cached) => {
        return cached || fetch(e.request);
      })
    );
    return;
  }

  // 그 외 정적 리소스: stale-while-revalidate
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((res) => {
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
