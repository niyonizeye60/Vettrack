"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { BellRing, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { usePushNotifications, usePushSync } from "@/hooks/usePushNotifications"
import { isPortalPath } from "@/lib/roles"
import PromptCard from "./prompt-card"
import { isSnoozed, snooze } from "./pwa-utils"

const DISMISSED_KEY = "pushPromptDismissedAt"
// Asking the moment a page opens feels pushy - let the user see their dashboard first.
const DELAY_MS = 4000

/**
 * Offers to turn on alerts for this device, inside the portals. The same switch lives
 * on each portal's notifications page (push-toggle.tsx), for turning them off again.
 */
export default function PushPrompt({ hidden }: { hidden: boolean }) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const pathname = usePathname()
  const inPortal = isPortalPath(pathname)
  usePushSync(inPortal)
  const { status, busy, turnOn } = usePushNotifications()
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(isSnoozed(DISMISSED_KEY))
    const timer = setTimeout(() => setReady(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  if (hidden || !ready || dismissed || !inPortal || status !== "off") return null

  const dismiss = () => {
    snooze(DISMISSED_KEY)
    setDismissed(true)
  }

  const enable = async () => {
    if (await turnOn()) return
    // Said no to the browser's prompt (status is now "blocked"), or it failed.
    if (Notification.permission !== "denied") {
      toast({ title: t("pwa.pushFailed"), variant: "destructive" })
    }
    dismiss()
  }

  return (
    <PromptCard title={t("pwa.pushTitle")} onClose={dismiss}>
      <p className="mt-0.5 text-xs text-gray-500">{t("pwa.pushDesc")}</p>
      <Button size="sm" className="mt-3" onClick={enable} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BellRing className="mr-1.5 h-4 w-4" />}
        {t("pwa.pushTurnOn")}
      </Button>
    </PromptCard>
  )
}
