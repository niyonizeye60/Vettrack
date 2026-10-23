"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Download, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import { isPortalPath } from "@/lib/roles"
import PromptCard from "./prompt-card"
import { isInstalled, isIos, isSnoozed, snooze } from "./pwa-utils"

// Chrome and Edge fire this when the site can be installed. It isn't in the DOM types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "installPromptDismissedAt"

/**
 * Offers to install Vettrack as an app. Shown only inside the portals, to the people
 * who come back every day - never over the public site or checkout.
 */
export default function InstallPrompt({ onVisibleChange }: { onVisibleChange?: (visible: boolean) => void }) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (isInstalled()) return
    setDismissed(isSnoozed(DISMISSED_KEY))
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

  const visible = !dismissed && isPortalPath(pathname) && (installEvent !== null || showIosHint)
  useEffect(() => {
    onVisibleChange?.(visible)
  }, [visible, onVisibleChange])

  if (!visible) return null

  const dismiss = () => {
    snooze(DISMISSED_KEY)
    setDismissed(true)
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    // The event works only once; Chrome fires a new one if the site is still installable.
    setInstallEvent(null)
    if (outcome === "dismissed") snooze(DISMISSED_KEY)
  }

  const [iosBefore, iosAfter] = t("pwa.iosHint").split("{icon}")

  return (
    <PromptCard title={t("pwa.installTitle")} onClose={dismiss}>
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
    </PromptCard>
  )
}
