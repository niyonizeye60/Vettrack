"use client"

import { useEffect } from "react"

/**
 * Registers public/sw.js, which makes the site installable and shows a "You're
 * offline" page in place of the browser's error. Production only, so it never gets
 * in the way of the dev server's hot reload.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error)
    })
  }, [])

  return null
}
