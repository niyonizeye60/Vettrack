"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { homePathForRole, isPortalPath } from "@/lib/roles"

/**
 * Keeps a copy of a signed-in farmer's records on the phone, which public/offline.html
 * shows when there's no connection. The records come from /api/offline/records.
 *
 * The copy lasts as long as the sign-in. Signing out deletes it, and so does anyone
 * else signing in on this phone. The login page only renders for someone signed out
 * (app/login/page.tsx sends everyone else to their portal), so it is the one place
 * every way of signing out passes through.
 *
 * Stored with the Cache API so offline.html can read it with no other file:
 * CACHE / KEY below hold the server's JSON, with ETag and X-Saved-At headers.
 * Keep these names in step with offline.html.
 */
const CACHE = "vettrack-records"
const KEY = "/offline/records.json"
// Page changes check at most this often. Each check is an empty 304 when nothing
// changed, so it costs almost no data.
const MIN_GAP_MS = 15_000

const FARMER_HOME = homePathForRole("farmer")

let lastCheck = 0
let running: Promise<void> | null = null
// Bumped by clear(), so a check that was already under way can't save the copy back.
let generation = 0

function isFarmerPath(pathname: string | null) {
  return !!pathname && (pathname === FARMER_HOME || pathname.startsWith(`${FARMER_HOME}/`))
}

function supported() {
  // The service worker that shows offline.html only runs in production
  // (components/pwa/register-service-worker.tsx).
  return process.env.NODE_ENV === "production" && "caches" in window && "serviceWorker" in navigator
}

function refresh(force = false): Promise<void> {
  if (running) return running
  if (!force && Date.now() - lastCheck < MIN_GAP_MS) return Promise.resolve()
  lastCheck = Date.now()
  const startedIn = generation

  running = (async () => {
    try {
      const cache = await caches.open(CACHE)
      const saved = await cache.match(KEY)
      const savedTag = saved?.headers.get("ETag")
      const res = await fetch("/api/offline/records", {
        cache: "no-store",
        headers: savedTag ? { "If-None-Match": savedTag } : undefined,
      })

      if (res.status === 401 || res.status === 403) {
        await clear()
        return
      }

      let body: string
      if (res.status === 304 && saved) body = await saved.text()
      else if (res.ok) body = await res.text()
      else return

      if (generation !== startedIn) return
      await cache.put(
        KEY,
        new Response(body, {
          headers: {
            "Content-Type": "application/json",
            ETag: res.headers.get("ETag") || savedTag || "",
            // When the server last confirmed this is up to date.
            "X-Saved-At": new Date().toISOString(),
          },
        })
      )
    } catch {
      // No connection, or the phone is out of space: keep the copy it has.
    } finally {
      running = null
    }
  })()
  return running
}

async function clear() {
  generation++
  try {
    await caches.delete(CACHE)
  } catch {
    // Storage blocked - there's nothing saved then either.
  }
}

export default function OfflineRecordsSync() {
  const pathname = usePathname()

  useEffect(() => {
    if (!("caches" in window)) return
    if (isFarmerPath(pathname)) {
      if (supported()) refresh()
    } else if (pathname === "/login" || isPortalPath(pathname)) {
      clear()
    }
  }, [pathname])

  // Also when the app is closed or put in the background, so a record saved just
  // before the signal went is in the copy.
  useEffect(() => {
    if (!supported()) return
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isFarmerPath(window.location.pathname)) refresh(true)
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [])

  return null
}
