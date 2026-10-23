"use client"

import { useEffect, useState } from "react"
import { BellRing } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import { isInstalled, isIos } from "./pwa-utils"

/** "Alerts on this device" on/off, for the top of each portal's notifications page. */
export default function PushToggle() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { status, busy, turnOn, turnOff } = usePushNotifications()
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false)

  useEffect(() => {
    setIosNeedsInstall(isIos() && !isInstalled())
  }, [])

  if (status === "loading" || (status === "unsupported" && !iosNeedsInstall)) return null

  const onChange = async (checked: boolean) => {
    if (!checked) return turnOff()
    if (!(await turnOn()) && Notification.permission !== "denied") {
      toast({ title: t("pwa.pushFailed"), variant: "destructive" })
    }
  }

  const description =
    status === "unsupported" ? t("pwa.pushIosInstall") : status === "blocked" ? t("pwa.pushBlocked") : t("pwa.pushDesc")

  return (
    <Card className="border border-gray-200 shadow-sm bg-white">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50">
          <BellRing className="h-5 w-5 text-green-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{t("pwa.pushToggleTitle")}</p>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
        <Switch
          checked={status === "on"}
          disabled={busy || status === "blocked" || status === "unsupported"}
          onCheckedChange={onChange}
          aria-label={t("pwa.pushToggleTitle")}
        />
      </CardContent>
    </Card>
  )
}
