// Vettrack's service worker. It lets the site be installed as an app, shows
// /offline.html instead of the browser's error page when a page can't load because
// there's no connection, shows the alerts lib/push.ts sends, and sends the records a
// farmer made with no connection once there is one.
//
// It never caches pages: those always come from the network, so nobody is shown an
// out-of-date page, or what the last person signed in on this phone saw. The one
// exception is a signed-in farmer's own records, which offline.html shows while
// there's no connection; components/pwa/offline-records-sync.tsx keeps that copy,
// in its own cache, and deletes it when they sign out.
// Bump CACHE_NAME whenever offline.html changes, so phones fetch the new copy.

const CACHE_PREFIX = "vettrack-offline-"
const CACHE_NAME = `${CACHE_PREFIX}v3`
const OFFLINE_URL = "/offline.html"

// Records made with no connection, in offline.html or by the app's own forms, wait in
// OUTBOX, one entry per record (components/pwa/offline-outbox.ts describes them).
// Keep these names in step with that file and offline.html.
const OUTBOX = "vettrack-outbox"
const OUTBOX_PREFIX = "/offline/outbox/"
const OUTBOX_SYNC = "vettrack-outbox"
const RECORDS = "vettrack-records"
const RECORDS_KEY = "/offline/records.json"
const REF_PREFIX = "offline:"

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

// ---- Sending records made with no connection ----

// Android fires this once the phone is back online, even with the app closed.
// Throwing asks it to try again later.
self.addEventListener("sync", (event) => {
  if (event.tag !== OUTBOX_SYNC) return
  event.waitUntil(
    sendOutbox().then((result) => {
      if (result.retry) throw new Error("Some records are still waiting to be sent")
    })
  )
})

// Pages ask for a send when they open or come back online - the only trigger on
// phones without background sync, iPhones included. The reply goes to the port sent.
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "send-outbox") return
  const reply = event.ports && event.ports[0]
  event.waitUntil(
    sendOutbox().then(
      (result) => reply && reply.postMessage(result),
      () => reply && reply.postMessage(null)
    )
  )
})

let sending = null
let sendAgain = null
function sendOutbox() {
  if (!sending) {
    sending = sendAll().finally(() => {
      sending = null
    })
    return sending
  }
  // Asked while a send is under way: one more after it, for records added meanwhile.
  if (!sendAgain) {
    sendAgain = sending.then(() => {
      sendAgain = null
      return sendOutbox()
    })
  }
  return sendAgain
}

// Sends the signed-in farmer's records one at a time, oldest first, so a record made
// for another one made offline (a dose for a new disease case) goes after it. Records
// made by someone else who was signed in on this phone wait for them.
// See app/api/offline/outbox/route.ts for the answers.
async function sendAll() {
  const result = { sent: 0, failed: 0, retry: false }
  const userId = await signedInFarmer()
  if (!userId) return result

  const cache = await caches.open(OUTBOX)
  const entries = await readOutbox(cache)
  const failed = new Set()
  const waiting = new Set()
  try {
    for (const entry of entries) {
      if (entry.userId !== userId) continue
      if (entry.status === "failed") failed.add(entry.id)
      if (entry.status !== "pending") continue

      const needs = refsOf(entry)
      if (needs.some((id) => failed.has(id))) {
        await updateEntry(cache, entry.id, { status: "failed", code: "PARENT_FAILED", error: null })
        failed.add(entry.id)
        result.failed++
        continue
      }
      if (needs.some((id) => waiting.has(id))) {
        waiting.add(entry.id)
        continue
      }

      let res
      try {
        res = await fetch("/api/offline/outbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: entry.id, userId: entry.userId, kind: entry.kind, body: entry.body, createdAt: entry.createdAt }),
          cache: "no-store",
        })
      } catch {
        // No connection after all.
        result.retry = true
        break
      }
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        // Kept, now shown as saved, until the copy of the records includes it
        // (components/pwa/offline-records-sync.tsx removes it then).
        await updateEntry(cache, entry.id, { status: "sent", recordId: data.id || null, sentAt: new Date().toISOString() })
        result.sent++
      } else if (res.status === 422) {
        await updateEntry(cache, entry.id, { status: "failed", error: data.error || null, code: data.code || null })
        failed.add(entry.id)
        result.failed++
      } else if (res.status === 409 && data.code === "WRONG_USER") {
        continue
      } else if (res.status === 401 || res.status === 403) {
        // Signed out or not allowed: kept until the farmer signs in again.
        break
      } else {
        // Being sent already, waiting for a record it needs, or a problem on our side:
        // tried again later. The others still go, so one stuck record can't hold up
        // the rest - only those made for it wait.
        waiting.add(entry.id)
        result.retry = true
      }
    }
  } finally {
    await tellPages({ type: "outbox-changed", sent: result.sent, failed: result.failed })
  }
  return result
}

// The farmer whose copy of the records is on this phone is the one signed in
// (offline-records-sync.tsx deletes it on sign-out).
async function signedInFarmer() {
  try {
    const res = await (await caches.open(RECORDS)).match(RECORDS_KEY)
    const copy = res ? await res.json() : null
    return copy && copy.userId && Date.parse(copy.expiresAt) > Date.now() ? copy.userId : null
  } catch {
    return null
  }
}

async function readOutbox(cache) {
  const entries = []
  for (const request of await cache.keys()) {
    if (new URL(request.url).pathname.indexOf(OUTBOX_PREFIX) !== 0) continue
    const res = await cache.match(request)
    const entry = res ? await res.json().catch(() => null) : null
    if (entry && entry.id) entries.push(entry)
  }
  return entries.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
}

// The ids of records made offline that this one points at.
function refsOf(entry) {
  return Object.keys(entry.body || {})
    .map((key) => entry.body[key])
    .filter((value) => typeof value === "string" && value.indexOf(REF_PREFIX) === 0)
    .map((value) => value.slice(REF_PREFIX.length))
}

// Only while the entry is still there: the farmer may have removed it meanwhile.
async function updateEntry(cache, id, changes) {
  const key = OUTBOX_PREFIX + id
  const res = await cache.match(key)
  const entry = res ? await res.json().catch(() => null) : null
  if (!entry) return
  await cache.put(key, new Response(JSON.stringify(Object.assign(entry, changes)), { headers: { "Content-Type": "application/json" } }))
}

async function tellPages(message) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  windows.forEach((client) => client.postMessage(message))
}
