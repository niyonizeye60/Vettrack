"use client"

import { useEffect } from "react"

// Mirrors useCalfGraduationReminders - see lib/feeding-plans.ts for why a
// session-triggered run exists alongside the Vercel Cron sweep. Records are written a
// day at a time, so once an hour is enough to pick up a new day while the app is open.
const CHECK_INTERVAL_MS = 60 * 60 * 1000

export function useFeedingPlans() {
  useEffect(() => {
    const check = () => {
      fetch("/api/farmer/feeding-plans/check", { method: "POST" }).catch(() => {})
    }
    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
}
