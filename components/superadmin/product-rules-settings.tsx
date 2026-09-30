"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarClock, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { MAX_SELL_BY_DAYS, MIN_DAYS_ON_SALE } from "@/lib/product-rules"

/**
 * The sell-by cutoff for drugs and feed: how many days before its expiry date a
 * product stops selling. Saved on its own, like the farm location switch above it,
 * rather than through the page's Save Settings button.
 */
export default function ProductRulesSettings() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [saved, setSaved] = useState<number | null>(null)
  const [value, setValue] = useState("")
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setSaved(data.sellByDays)
        setValue(String(data.sellByDays))
      })
      .catch(() => setLoadFailed(true))
  }, [])

  const days = Number(value)
  const valid = value.trim() !== "" && Number.isInteger(days) && days >= 0 && days <= MAX_SELL_BY_DAYS

  const save = async () => {
    if (!valid) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellByDays: days }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: t("common.error"), description: data.error, variant: "destructive" })
        return
      }
      setSaved(data.sellByDays)
      setValue(String(data.sellByDays))
      toast({ title: t("settings.sellBySaved") })
    } catch {
      toast({ title: t("common.error"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card id="product-sell-by">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarClock className="h-5 w-5" />
          <span>{t("settings.sellByTitle")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadFailed ? (
          <p className="text-sm text-red-600">{t("settings.sellByLoadFailed")}</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="sm:w-48">
                <Label htmlFor="sell-by-days">{t("settings.sellByLabel")}</Label>
                <Input
                  id="sell-by-days"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_SELL_BY_DAYS}
                  value={value}
                  disabled={saved === null}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <Button onClick={save} disabled={saving || !valid || days === saved}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("common.save")}
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              {t("settings.sellByDesc")
                .replace("{days}", valid ? String(days) : "…")
                .replace("{min}", valid ? String(days + MIN_DAYS_ON_SALE) : "…")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
