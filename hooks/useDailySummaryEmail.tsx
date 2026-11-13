"use client"

import { useEffect } from "react"

// A session-authenticated action is hit on an interval while the farmer has the app
// open, and the server itself decides whether the cutoff is met and an email needs
// to go out. Used here so the daily activity digest doesn't depend on
// Vercel Cron actually firing - see lib/actions/daily-summary.ts.
//
// 15 minutes is plenty: the server-side cutoff only opens at 7 PM Kigali, and the
// send is idempotent per day, so this just needs to land at least once after that
// while a farmer has any page open - it doesn't need a near-real-time cadence.
const CHECK_INTERVAL_MS = 15 * 60 * 1000

export function useDailySummaryEmail() {
  useEffect(() => {
    const check = () => {
      fetch("/api/farmer/daily-summary/send", { method: "POST" }).catch(() => {})
    }
    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
}
