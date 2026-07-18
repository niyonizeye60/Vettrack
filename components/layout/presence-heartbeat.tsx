"use client"

import { useEffect } from "react"

const HEARTBEAT_INTERVAL_MS = 20000

export function PresenceHeartbeat() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/presence", { method: "POST" }).catch(() => {})
    }
    ping()
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS)

    // Best-effort offline signal for tab close/refresh/navigation away from the
    // app. sendBeacon fires reliably during unload where a normal fetch would
    // get cancelled by the browser; pagehide covers mobile browsers that don't
    // fire beforeunload consistently.
    const markOffline = () => {
      navigator.sendBeacon?.("/api/presence/offline")
    }
    window.addEventListener("pagehide", markOffline)
    window.addEventListener("beforeunload", markOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener("pagehide", markOffline)
      window.removeEventListener("beforeunload", markOffline)
    }
  }, [])

  return null
}
