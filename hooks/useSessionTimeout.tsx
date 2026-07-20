"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertModal } from "@/components/ui/AlertModal"

// Auto-logout after 5 minutes with zero interaction (no mouse movement, key
// presses, clicks, scrolling, or touch) - see handleActivity/events below for
// what counts as "interaction". The warning modal appears with 20s left on
// the clock so an idle-but-present user has a chance to stay logged in
// before they're actually signed out.
const SESSION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const WARNING_MS = 20 * 1000 // show the warning with 20s left
const WARNING_SECONDS = WARNING_MS / 1000
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"] as const

export function useSessionTimeout() {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS)

  // Mirrors `showWarning` for synchronous reads inside the activity listener
  // and the countdown interval, both of which are bound once on mount and
  // must never act on a stale render's closure.
  const showWarningRef = useRef(false)
  const loggingOutRef = useRef(false)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval>>()

  const clearAllTimers = useCallback(() => {
    clearTimeout(warningTimerRef.current)
    clearTimeout(logoutTimerRef.current)
    clearInterval(countdownIntervalRef.current)
  }, [])

  const handleTimeout = useCallback(async () => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true

    clearAllTimers()
    showWarningRef.current = false
    setShowWarning(false)

    try {
      await fetch("/api/logout", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    }

    document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
    router.push("/login")
  }, [clearAllTimers, router])

  const startWarning = useCallback(() => {
    if (loggingOutRef.current) return
    showWarningRef.current = true
    setShowWarning(true)
    setSecondsLeft(WARNING_SECONDS)

    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current)
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [handleTimeout])

  // The single source of truth for (re)arming both the warning and the
  // logout timers. Called on mount, on every qualifying activity event, and
  // when the user clicks "Stay Logged In".
  const resetTimer = useCallback(() => {
    if (loggingOutRef.current) return

    clearAllTimers()
    showWarningRef.current = false
    setShowWarning(false)

    warningTimerRef.current = setTimeout(startWarning, SESSION_TIMEOUT_MS - WARNING_MS)
    logoutTimerRef.current = setTimeout(handleTimeout, SESSION_TIMEOUT_MS)
  }, [clearAllTimers, startWarning, handleTimeout])

  const handleStayLoggedIn = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  // Set up exactly once. Every value this effect touches (resetTimer,
  // clearAllTimers) is a stable, ref-backed callback, so nothing here
  // depends on `showWarning`/`secondsLeft`. That matters: the previous
  // implementation depended on `showWarning`, so the moment the warning
  // timer set it to true, this effect tore itself down and re-ran -
  // which called resetTimer() again and hid the modal in the same tick
  // it appeared. Keeping this effect independent of that state is what
  // fixes the "flashes and disappears" bug.
  useEffect(() => {
    const handleActivity = () => {
      // While the warning is up, only an explicit "Stay Logged In" click
      // (handleStayLoggedIn) should reset the timer - ambient mouse/key
      // activity elsewhere on the page must not silently dismiss it.
      if (!showWarningRef.current) {
        resetTimer()
      }
    }

    ACTIVITY_EVENTS.forEach((event) => document.addEventListener(event, handleActivity, true))
    resetTimer()

    return () => {
      clearAllTimers()
      ACTIVITY_EVENTS.forEach((event) => document.removeEventListener(event, handleActivity, true))
    }
  }, [resetTimer, clearAllTimers])

  return (
    <AlertModal
      isOpen={showWarning}
      onClose={handleStayLoggedIn}
      title="Session Expiring"
      message={`You've been inactive for a while. For your security, you'll be logged out in ${secondsLeft} second${secondsLeft === 1 ? "" : "s"} unless you stay logged in.`}
      type="warning"
      confirmLabel="Stay Logged In"
    />
  )
}
