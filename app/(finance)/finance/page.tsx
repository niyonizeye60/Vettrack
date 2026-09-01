"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import PeriodSelector from "@/components/finance/period-selector"
import SourceBreakdown, { type SourceTotal } from "@/components/finance/source-breakdown"
import CommissionSettings from "@/components/finance/commission-settings"
import { formatRwf, resolvePreset, type DateRange, type PeriodPreset } from "@/lib/finance-period"

interface Summary {
  total: number
  grossTotal: number
  previousTotal: number
  growthPercent: number | null
  sources: SourceTotal[]
}

/** Finance overview: what came in over a period, and where it came from. */
export default function FinanceOverviewPage() {
  const { t } = useLanguage()
  const [preset, setPreset] = useState<PeriodPreset>("this_month")
  const [custom, setCustom] = useState<DateRange>(resolvePreset("this_month"))
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const range = resolvePreset(preset, custom)
    try {
      const res = await fetch(`/api/income/summary?from=${range.from}&to=${range.to}`)
      if (res.ok) setSummary(await res.json())
    } catch {
      // Leave the previous figures on screen rather than flashing zeroes.
    } finally {
      setLoading(false)
    }
  }, [preset, custom])

  useEffect(() => { load() }, [load])

  const growth = summary?.growthPercent ?? null
  const GrowthIcon = growth == null ? Minus : growth >= 0 ? TrendingUp : TrendingDown
  const growthTone = growth == null ? "text-gray-500" : growth >= 0 ? "text-green-700" : "text-red-700"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("finance.overview")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("finance.overviewDesc")}</p>
        </div>
        <PeriodSelector
          preset={preset}
          custom={custom}
          onPresetChange={setPreset}
          onCustomChange={setCustom}
        />
      </div>

      {loading && !summary ? (
        <>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-3 w-32 mb-3" />
              <Skeleton className="h-10 w-48 mb-3" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : summary ? (
        <>
          {/* Hero figure: one number answers "how much did we make". */}
          <Card>
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-wide text-gray-500">{t("finance.totalIncome")}</p>
              <p className="text-4xl font-bold text-gray-900 mt-1 tabular-nums">
                {formatRwf(summary.total)}
              </p>
              <div className={`flex items-center gap-1.5 mt-2 text-sm ${growthTone}`}>
                <GrowthIcon className="h-4 w-4" />
                <span className="tabular-nums">
                  {growth == null
                    ? t("finance.noComparison")
                    : `${growth >= 0 ? "+" : ""}${growth}% ${t("finance.vsPrevious")}`}
                </span>
              </div>
              {summary.grossTotal > summary.total && (
                <p className="text-xs text-gray-500 mt-3">
                  {t("finance.grossNote").replace("{gross}", formatRwf(summary.grossTotal))}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("finance.bySource")}</CardTitle>
            </CardHeader>
            <CardContent>
              <SourceBreakdown sources={summary.sources} total={summary.total} />
            </CardContent>
          </Card>
        </>
      ) : null}

      <CommissionSettings />
    </div>
  )
}
