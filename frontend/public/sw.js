// 서비스워커 — 푸시 알림 처리
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "나의 공간", body: "새로운 알림이 있어요" };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data?.text() || data.body;
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "나의 공간", {
      body: data.body,
      icon: "/logo192.png",
      badge: "/logo192.png",
      data: data.url || "/",
      tag: data.tag || "default",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        if (url !== "/") existing.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});
