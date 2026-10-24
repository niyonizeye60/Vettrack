// Vettrack's service worker. It lets the site be installed as an app, shows
// /offline.html instead of the browser's error page when a page can't load because
// there's no connection, and shows the alerts lib/push.ts sends.
//
// It never caches pages: those always come from the network, so nobody is shown an
// out-of-date page, or what the last person signed in on this phone saw. The one
// exception is a signed-in farmer's own records, which offline.html shows while
// there's no connection; components/pwa/offline-records-sync.tsx keeps that copy,
// in its own cache, and deletes it when they sign out.
// Bump CACHE_NAME whenever offline.html changes, so phones fetch the new copy.

const CACHE_PREFIX = "vettrack-offline-"
const CACHE_NAME = `${CACHE_PREFIX}v2`
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

// An alert for an in-app notification. Always shown: Safari stops delivering to a
// site whose pushes don't show anything.
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "VetTrack", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      renotify: Boolean(data.tag && data.renotify),
      data: { id: data.id, url: data.url },
    })
  )
})

// Tapping an alert opens what it's about, in the app window if one is open, and marks
// the notification read. With no link, /login lands the user on their own dashboard.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const { id, url } = event.notification.data || {}
  const target = new URL(url || "/login", self.location.origin)
  const href = target.origin === self.location.origin ? target.href : `${self.location.origin}/login`

  event.waitUntil(
    (async () => {
      const markRead = id
        ? fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }).catch(() => {})
        : Promise.resolve()

      const windows = await self.clients.matchAll({ type: "window" })
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      let opened = false
      if (open) {
        try {
          await open.focus()
          await open.navigate(href)
          opened = true
        } catch {
          // Not controlled by this worker yet - open a fresh window below.
        }
      }
      if (!opened) await self.clients.openWindow(href)
      await markRead
    })()
  )
})
