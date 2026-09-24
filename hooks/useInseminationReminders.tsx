"use client"

import { useEffect } from "react"

// Mirrors useDailySummaryEmail and the ThingSpeak poll (app/(farmer)/farmer/tracking/page.tsx)
// - see lib/actions/insemination-reminders.ts for why a session-triggered check
// exists alongside the Vercel Cron sweep. 30 minutes is plenty: these are 7/14-day-out
// reminders, not time-sensitive to the minute, so this just needs to land at least
// once while a farmer has any page open.
const CHECK_INTERVAL_MS = 30 * 60 * 1000

export function useInseminationReminders() {
  useEffect(() => {
    const check = () => {
      fetch("/api/farmer/insemination-reminders/check", { method: "POST" }).catch(() => {})
    }
    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
}
