// Small browser checks shared by the install and alerts prompts.

const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

/** Whether the user closed the prompt stored under `key` in the last 30 days. */
export function isSnoozed(key: string): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(key)) < SNOOZE_MS
  } catch {
    return false
  }
}

export function snooze(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()))
  } catch {
    // Storage blocked (private mode): the prompt just comes back next visit.
  }
}

/** Running as the installed app rather than in a browser tab. */
export function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// iPhones and iPads have no install prompt - apps are only added from the Share menu.
// iPadOS says it's a Mac, so tell it apart by its touch screen.
export function isIos(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}
