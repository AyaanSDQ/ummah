// This address only redirects to https://ummahnchs.web.app/ now. Phones that installed the old app
// still hold the old service worker; this replacement removes it and its caches so they stop
// showing the old copy.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    const open = await self.clients.matchAll({ type: "window" });
    for (const client of open) client.navigate(client.url);
  })());
});
