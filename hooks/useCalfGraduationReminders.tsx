"use client"

import { useEffect } from "react"

// Mirrors useInseminationReminders - see lib/calf-graduation-reminders.ts for why a
// session-triggered check exists alongside the Vercel Cron sweep. A calf reaching the
// graduation age isn't urgent, so this just needs to land at least once while a farmer
// has any page open.
const CHECK_INTERVAL_MS = 30 * 60 * 1000

export function useCalfGraduationReminders() {
  useEffect(() => {
    const check = () => {
      fetch("/api/farmer/calf-graduation-reminders/check", { method: "POST" }).catch(() => {})
    }
    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
}
