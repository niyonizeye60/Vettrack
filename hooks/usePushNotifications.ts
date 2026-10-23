"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

/**
 * Whether this device gets alerts (web push) for the signed-in user, and the switches
 * to change it. The server side is lib/push.ts.
 *
 * - unsupported: no service worker or push here (dev server, old browser, or an iPhone
 *   where the app isn't installed - iOS only allows push from the home-screen app)
 * - blocked: the user said no to the browser's permission prompt
 * - on / off: whether this device is linked to the signed-in user
 */
export type PushStatus = "loading" | "unsupported" | "blocked" | "on" | "off"

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

// Shared by every component using the hook (the banner and the switch on the
// notifications page), so turning alerts on in one updates the other.
let status: PushStatus = "loading"
const listeners = new Set<() => void>()
function setStatus(next: PushStatus) {
  status = next
  listeners.forEach((listener) => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
let syncQueue: Promise<unknown> = Promise.resolve()

function keyBytes() {
  const base64 = (PUBLIC_KEY + "=".repeat((4 - (PUBLIC_KEY!.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

/** A subscription made with other keys (they were changed) can't receive our alerts. */
function hasOurKey(subscription: PushSubscription): boolean {
  const key = subscription.options?.applicationServerKey
  if (!key) return true
  const a = new Uint8Array(key)
  const b = keyBytes()
  return a.length === b.length && a.every((byte, i) => byte === b[i])
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return null
  }
  // Registered on page load (components/pwa/register-service-worker.tsx), so it may not
  // be ready yet on a first visit. Never registered on the dev server.
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000))
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

async function saveOnServer(subscription: PushSubscription, language: string, claim: boolean): Promise<boolean> {
  const res = await fetch("/api/push/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON(), language, claim }),
  })
  if (!res.ok) return false
  const data = await res.json()
  return data.linked === true
}

async function sync(language: string): Promise<PushStatus> {
  try {
    const reg = await registration()
    if (!reg) return "unsupported"
    if (Notification.permission === "denied") return "blocked"
    if (Notification.permission !== "granted") return "off"
    const subscription = await reg.pushManager.getSubscription()
    if (!subscription || !hasOurKey(subscription)) return "off"
    return (await saveOnServer(subscription, language, false)) ? "on" : "off"
  } catch {
    return "off"
  }
}

/**
 * Keeps the status in step with whoever is signed in. Used once, at the root
 * (components/pwa/push-prompt.tsx): each time someone enters a portal - a new login
 * included - and each time they change language, so alerts arrive in that language.
 */
export function usePushSync(signedIn: boolean) {
  const { language } = useLanguage()
  useEffect(() => {
    if (!signedIn) {
      setStatus("loading")
      return
    }
    let cancelled = false
    // The saved language is only read after the first render, so wait a moment rather
    // than send "en" and then the real one.
    const timer = setTimeout(() => {
      // One at a time, so an older language can't reach the server last.
      syncQueue = syncQueue
        .then(() => sync(language))
        .then((next) => {
          if (!cancelled) setStatus(next)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [signedIn, language])
}

export function usePushNotifications() {
  const { language } = useLanguage()
  const current = useSyncExternalStore(subscribe, () => status, () => "loading" as PushStatus)
  const [busy, setBusy] = useState(false)

  /** Must run straight from a tap - browsers only show the permission prompt then. */
  const turnOn = useCallback(async (): Promise<boolean> => {
    setBusy(true)
    try {
      const reg = await registration()
      if (!reg) {
        setStatus("unsupported")
        return false
      }
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off")
        return false
      }
      let subscription = await reg.pushManager.getSubscription()
      if (subscription && !hasOurKey(subscription)) {
        await subscription.unsubscribe()
        subscription = null
      }
      subscription ??= await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(),
      })
      const linked = await saveOnServer(subscription, language, true)
      setStatus(linked ? "on" : "off")
      return linked
    } catch (error) {
      console.error("Failed to turn on push notifications:", error)
      setStatus("off")
      return false
    } finally {
      setBusy(false)
    }
  }, [language])

  const turnOff = useCallback(async () => {
    setBusy(true)
    try {
      const reg = await registration()
      const subscription = await reg?.pushManager.getSubscription()
      if (subscription) {
        await fetch("/api/push/subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setStatus("off")
    } catch (error) {
      console.error("Failed to turn off push notifications:", error)
    } finally {
      setBusy(false)
    }
  }, [])

  return { status: current, busy, turnOn, turnOff }
}
