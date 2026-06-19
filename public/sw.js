// Service Worker de SELLO — maneja notificaciones push recibidas del servidor.
// Este archivo debe vivir en /public/sw.js para que el scope sea la raíz del sitio.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "SELLO", {
      body:  data.body  || "",
      icon:  data.icon  || "/logo-wallet.png",
      badge: data.badge || "/logo-wallet.png",
      data:  { url: data.url || "/" },
      vibrate: [200, 100, 200],
    })
  );
});

// Al tocar la notificación, abre la URL que venía en el payload.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
