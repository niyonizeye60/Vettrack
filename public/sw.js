// Vettrack's service worker. It lets the site be installed as an app, and shows
// /offline.html instead of the browser's error page when a page can't load because
// there's no connection.
//
// It never caches pages or data: those always come from the network, so nobody is
// shown out-of-date records, or what the last person signed in on this phone saw.
// Bump CACHE_NAME whenever offline.html changes, so phones fetch the new copy.

const CACHE_PREFIX = "vettrack-offline-"
const CACHE_NAME = `${CACHE_PREFIX}v1`
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name))
      )
      // Starts loading the page while this worker boots, so pages open no slower than
      // they did without it.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
      await self.clients.claim()
    })()
  )
})

self.addEventListener("fetch", (event) => {
  // Only page loads. Scripts, images and API calls go straight to the network as usual.
  if (event.request.mode !== "navigate") return

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse
        if (preloaded) return preloaded
        return await fetch(event.request)
      } catch {
        const offline = await caches.match(OFFLINE_URL)
        return offline || Response.error()
      }
    })()
  )
})
