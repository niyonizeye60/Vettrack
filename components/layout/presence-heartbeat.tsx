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
    return () => clearInterval(interval)
  }, [])

  return null
}
