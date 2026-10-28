/**
 * Records a farmer makes with no connection, kept on the phone until they can be sent.
 *
 * public/offline.html adds them when the app can't load at all, and the app's own forms
 * add one when a save can't get through (saveOffline below). public/sw.js sends them to
 * app/api/offline/outbox once there's a connection, oldest first, and tells open pages
 * when it has.
 *
 * Each record is one entry in the OUTBOX cache, at OUTBOX_PREFIX + its id. `body` is
 * exactly what the app's form posts. `status` is "pending" until it's sent, "failed"
 * when the server refused it for a reason the farmer has to see (a wrong location, a
 * cow already milked that session), and "sent" until the copy of the records includes
 * it, so offline.html never loses sight of it. Entries stay on the phone through a
 * sign-out and are sent when the same farmer signs in again.
 *
 * Keep the names in step with sw.js and offline.html.
 */

export type OutboxKind = "milk" | "disease" | "dose" | "vaccination" | "insemination" | "calf" | "calfWeight"

export interface OutboxEntry {
  id: string
  userId: string
  kind: OutboxKind
  body: Record<string, any>
  createdAt: string
  status: "pending" | "failed" | "sent"
  error?: string | null
  code?: string | null
  recordId?: string | null
  sentAt?: string
}

export interface SendResult {
  sent: number
  failed: number
  retry: boolean
}

const OUTBOX = "vettrack-outbox"
const OUTBOX_PREFIX = "/offline/outbox/"
const OUTBOX_SYNC = "vettrack-outbox"
const RECORDS = "vettrack-records"
const RECORDS_KEY = "/offline/records.json"
// A send of many records over a weak signal can take a while.
const SEND_TIMEOUT_MS = 120_000

export function outboxSupported() {
  // The service worker that sends them only runs in production
  // (components/pwa/register-service-worker.tsx).
  return (
    process.env.NODE_ENV === "production" &&
    typeof window !== "undefined" &&
    "caches" in window &&
    "serviceWorker" in navigator
  )
}

type Listener = (message: { sent?: number; failed?: number }) => void
const listeners = new Set<Listener>()
let listening = false

/** Called when records are added, removed or sent, here or by the service worker. */
export function onOutboxChange(listener: Listener) {
  if (!listening && outboxSupported()) {
    listening = true
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "outbox-changed") notify(event.data)
    })
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(message: { sent?: number; failed?: number } = {}) {
  listeners.forEach((listener) => listener(message))
}

/** The farmer signed in on this phone: the one whose copy of the records is here. */
export async function signedInFarmer(): Promise<string | null> {
  try {
    const res = await (await caches.open(RECORDS)).match(RECORDS_KEY)
    const copy = res ? await res.json() : null
    return copy?.userId && Date.parse(copy.expiresAt) > Date.now() ? copy.userId : null
  } catch {
    return null
  }
}

/**
 * Keeps a new record the app couldn't save for lack of a connection, to be sent later.
 * Only for the farmer signed in on this phone, saving on their own farm - a vet working
 * on a farm they were given access to saves online only. Returns whether it was kept.
 */
export async function saveOffline(kind: OutboxKind, body: Record<string, any>): Promise<boolean> {
  if (!outboxSupported()) return false
  try {
    const userId = await signedInFarmer()
    if (!userId || body.farmerId !== userId) return false
    const entry: OutboxEntry = { id: newId(), userId, kind, body, createdAt: new Date().toISOString(), status: "pending" }
    await (await caches.open(OUTBOX)).put(OUTBOX_PREFIX + entry.id, toResponse(entry))
    // Asks the phone not to clear it to make room.
    navigator.storage?.persist?.().catch(() => {})
    requestBackgroundSend()
    notify()
    return true
  } catch {
    return false
  }
}

/** The farmer's records not yet in the copy of their records, oldest first. */
export async function readOutbox(userId: string): Promise<OutboxEntry[]> {
  if (!outboxSupported() || !(await caches.has(OUTBOX))) return []
  const cache = await caches.open(OUTBOX)
  const entries: OutboxEntry[] = []
  for (const request of await cache.keys()) {
    if (!new URL(request.url).pathname.startsWith(OUTBOX_PREFIX)) continue
    const entry = await cache.match(request).then((res) => res?.json()).catch(() => null)
    if (entry?.id && entry.userId === userId) entries.push(entry)
  }
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function removeFromOutbox(ids: string[]) {
  const cache = await caches.open(OUTBOX)
  await Promise.all(ids.map((id) => cache.delete(OUTBOX_PREFIX + id)))
  notify()
}

/** Puts the records the server refused back in line, for another try. */
export async function retryFailed(userId: string) {
  const cache = await caches.open(OUTBOX)
  const failed = (await readOutbox(userId)).filter((entry) => entry.status === "failed")
  await Promise.all(
    failed.map((entry) => cache.put(OUTBOX_PREFIX + entry.id, toResponse({ ...entry, status: "pending", error: null, code: null })))
  )
  notify()
}

/**
 * Removes records already sent that a copy of the records saved since `since` includes.
 * With no `since`, all of them: the farmer signed out, and they are on the server.
 */
export async function dropSent(since = Infinity) {
  if (!(await caches.has(OUTBOX).catch(() => false))) return
  const cache = await caches.open(OUTBOX)
  let dropped = false
  for (const request of await cache.keys()) {
    const entry: OutboxEntry | null = await cache.match(request).then((res) => res?.json()).catch(() => null)
    if (entry?.status === "sent" && !(Date.parse(entry.sentAt || "") >= since)) {
      await cache.delete(request)
      dropped = true
    }
  }
  if (dropped) notify()
}

/** Asks the service worker to send whatever is waiting, now. */
export async function sendOutbox(): Promise<SendResult | null> {
  if (!outboxSupported()) return null
  try {
    const worker = (await navigator.serviceWorker.ready).active
    if (!worker) return null
    return await new Promise<SendResult | null>((resolve) => {
      const channel = new MessageChannel()
      const timer = setTimeout(() => resolve(null), SEND_TIMEOUT_MS)
      channel.port1.onmessage = (event) => {
        clearTimeout(timer)
        resolve(event.data)
      }
      worker.postMessage({ type: "send-outbox" }, [channel.port2])
    })
  } catch {
    return null
  }
}

/** On Android, sends them once the phone is back online, even with the app closed. */
export function requestBackgroundSend() {
  navigator.serviceWorker.ready
    .then((registration) => {
      const sync = (registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync
      return sync?.register(OUTBOX_SYNC)
    })
    .catch(() => {})
}

function toResponse(entry: OutboxEntry) {
  return new Response(JSON.stringify(entry), { headers: { "Content-Type": "application/json" } })
}

function newId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("")
}
