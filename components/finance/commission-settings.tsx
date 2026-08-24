"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Percent, Info } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { computeFee } from "@/lib/commission"

interface ActiveRule {
  mode: "percent" | "flat"
  value: number
  minFee: number | null
  maxFee: number | null
  configured: boolean
}

interface HistoryRule extends Omit<ActiveRule, "configured"> {
  id: string
  effectiveFrom: string
}

const SAMPLE_PRICES = [150_000, 500_000, 1_500_000]

export default function CommissionSettings() {
  const { t } = useLanguage()
  const [active, setActive] = useState<ActiveRule | null>(null)
  const [history, setHistory] = useState<HistoryRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<"percent" | "flat">("percent")
  const [value, setValue] = useState("")
  const [minFee, setMinFee] = useState("")
  const [maxFee, setMaxFee] = useState("")

  const load = async () => {
    try {
      const res = await fetch("/api/commission-rules")
      if (!res.ok) return
      const data = await res.json()
      setActive(data.active)
      setHistory(data.history)
      setMode(data.active.mode)
      setValue(String(data.active.value))
      setMinFee(data.active.minFee == null ? "" : String(data.active.minFee))
      setMaxFee(data.active.maxFee == null ? "" : String(data.active.maxFee))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/commission-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          value: Number(value),
          minFee: mode === "percent" && minFee !== "" ? Number(minFee) : null,
          maxFee: mode === "percent" && maxFee !== "" ? Number(maxFee) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t("finance.commissionSaveFailed"))
        return
      }
      await load()
    } catch {
      setError(t("finance.commissionSaveFailed"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-5">
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-9 w-28" />
        </CardContent>
      </Card>
    )
  }

  const draft = {
    mode,
    value: Number(value) || 0,
    minFee: minFee === "" ? null : Number(minFee),
    maxFee: maxFee === "" ? null : Number(maxFee),
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4 text-gray-500" />
          {t("finance.commissionTitle")}
          {active && !active.configured && (
            <Badge variant="secondary" className="ml-1">{t("finance.usingDefault")}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-gray-600">{t("finance.commissionDesc")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>{t("finance.feeMode")}</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "percent" | "flat")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">{t("finance.modePercent")}</SelectItem>
                <SelectItem value="flat">{t("finance.modeFlat")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="fee-value">
              {mode === "percent" ? t("finance.percentOfPrice") : t("finance.flatAmount")}
            </Label>
            <Input
              id="fee-value"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>

        {mode === "percent" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="min-fee">{t("finance.minFee")}</Label>
              <Input id="min-fee" type="number" inputMode="numeric" value={minFee} onChange={(e) => setMinFee(e.target.value)} placeholder="—" />
            </div>
            <div>
              <Label htmlFor="max-fee">{t("finance.maxFee")}</Label>
              <Input id="max-fee" type="number" inputMode="numeric" value={maxFee} onChange={(e) => setMaxFee(e.target.value)} placeholder="—" />
            </div>
          </div>
        )}

        {/* What a buyer actually pays at a few realistic animal prices. */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {t("finance.feePreview")}
          </p>
          <div className="space-y-1">
            {SAMPLE_PRICES.map((price) => (
              <div key={price} className="flex justify-between text-sm tabular-nums">
                <span className="text-gray-600">RWF {price.toLocaleString()}</span>
                <span className="font-medium text-gray-900">
                  RWF {computeFee(draft, price).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <Info className="h-4 w-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900">{t("finance.commissionAppendOnly")}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button onClick={save} disabled={saving || !value}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("finance.saveFee")}
        </Button>

        {history.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {t("finance.feeHistory")}
            </p>
            <div className="space-y-1">
              {history.map((rule) => (
                <div key={rule.id} className="flex justify-between text-sm text-gray-600">
                  <span>
                    {rule.mode === "percent" ? `${rule.value}%` : `RWF ${rule.value.toLocaleString()}`}
                  </span>
                  <span>{new Date(rule.effectiveFrom).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
