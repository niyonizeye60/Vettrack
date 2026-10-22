"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Download, Share, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import { isPortalPath } from "@/lib/roles"

// Chrome and Edge fire this when the site can be installed. It isn't in the DOM types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "installPromptDismissedAt"
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

function recentlyDismissed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISSED_KEY)) < SNOOZE_MS
  } catch {
    return false
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  } catch {
    // Storage blocked (private mode): the banner just comes back next visit.
  }
}

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// iPhones and iPads have no install prompt - apps are only added from the Share menu.
// iPadOS says it's a Mac, so tell it apart by its touch screen.
function isIos() {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/**
 * Offers to install Vettrack as an app. Shown only inside the portals, to the people
 * who come back every day - never over the public site or checkout.
 */
export default function InstallPrompt() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (isInstalled()) return
    setDismissed(recentlyDismissed())
    setShowIosHint(isIos())

    const onBeforeInstallPrompt = (event: Event) => {
      // Keeps Chrome's own install bar from popping up over the public site; this
      // banner offers the same thing, in the portals.
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstallEvent(null)
      setShowIosHint(false)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (dismissed || !isPortalPath(pathname) || (!installEvent && !showIosHint)) return null

  const dismiss = () => {
    rememberDismissed()
    setDismissed(true)
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    // The event works only once; Chrome fires a new one if the site is still installable.
    setInstallEvent(null)
    if (outcome === "dismissed") rememberDismissed()
  }

  const [iosBefore, iosAfter] = t("pwa.iosHint").split("{icon}")

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1100] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] print:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-md items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{t("pwa.installTitle")}</p>
          {installEvent ? (
            <>
              <p className="mt-0.5 text-xs text-gray-500">{t("pwa.installDesc")}</p>
              <Button size="sm" className="mt-3" onClick={install}>
                <Download className="mr-1.5 h-4 w-4" />
                {t("pwa.install")}
              </Button>
            </>
          ) : (
            <p className="mt-0.5 text-xs text-gray-500">
              {iosBefore}
              <Share className="mx-0.5 inline h-3.5 w-3.5 -translate-y-px" />
              {iosAfter}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("common.close")}
          className="-mr-1 -mt-1 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
