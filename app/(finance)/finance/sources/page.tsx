"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import PeriodSelector from "@/components/finance/period-selector"
import { formatRwf, resolvePreset, type DateRange, type PeriodPreset } from "@/lib/finance-period"
import {
  INCOME_SOURCES,
  INCOME_SOURCE_COLORS,
  INCOME_SOURCE_LABEL_KEYS,
  isBrokered,
  type IncomeSource,
} from "@/lib/income-sources"

interface Entry {
  id: string
  sourceType: IncomeSource
  grossAmount: number
  platformRevenue: number
  feeRate: number | null
  buyerName: string | null
  buyerPhone: string | null
  reference: string
  occurredAt: string
}

/** Every transaction under one income source, for a period. */
export default function FinanceSourcesPage() {
  const { t } = useLanguage()
  const [preset, setPreset] = useState<PeriodPreset>("this_month")
  const [custom, setCustom] = useState<DateRange>(resolvePreset("this_month"))
  const [source, setSource] = useState<IncomeSource>("marketplace_animal")
  const [entries, setEntries] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const range = resolvePreset(preset, custom)
    try {
      const res = await fetch(`/api/income?source=${source}&from=${range.from}&to=${range.to}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries)
        setTotal(data.total)
      }
    } catch {
      // Keep what is on screen.
    } finally {
      setLoading(false)
    }
  }, [preset, custom, source])

  useEffect(() => { load() }, [load])

  const brokered = isBrokered(source)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t("finance.bySource")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("finance.bySourceDesc")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <Select value={source} onValueChange={(v) => setSource(v as IncomeSource)}>
            <SelectTrigger aria-label={t("finance.source")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {INCOME_SOURCES.map((value) => (
                <SelectItem key={value} value={value}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: INCOME_SOURCE_COLORS[value] }}
                    />
                    {t(INCOME_SOURCE_LABEL_KEYS[value])}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <PeriodSelector preset={preset} custom={custom} onPresetChange={setPreset} onCustomChange={setCustom} />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-gray-200">
            <span className="text-sm text-gray-600">{t("finance.totalForSource")}</span>
            <span className="text-2xl font-bold text-gray-900 tabular-nums">{formatRwf(total)}</span>
          </div>

          {loading ? (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm min-w-[42rem]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4 font-medium">{t("finance.date")}</th>
                    <th className="py-2 pr-4 font-medium">{t("finance.customer")}</th>
                    <th className="py-2 pr-4 font-medium">{t("finance.reference")}</th>
                    {brokered && (
                      <th className="py-2 pr-4 font-medium text-right">{t("finance.animalPrice")}</th>
                    )}
                    <th className="py-2 font-medium text-right">{t("finance.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-2 pr-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="py-2 pr-4"><Skeleton className="h-4 w-24" /></td>
                      {brokered && (
                        <td className="py-2 pr-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      )}
                      <td className="py-2 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">{t("finance.noTransactions")}</p>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm min-w-[42rem]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4 font-medium">{t("finance.date")}</th>
                    <th className="py-2 pr-4 font-medium">{t("finance.customer")}</th>
                    <th className="py-2 pr-4 font-medium">{t("finance.reference")}</th>
                    {brokered && (
                      <th className="py-2 pr-4 font-medium text-right">{t("finance.animalPrice")}</th>
                    )}
                    <th className="py-2 font-medium text-right">{t("finance.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                        {new Date(entry.occurredAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4 text-gray-900">
                        {entry.buyerName || "—"}
                        {entry.buyerPhone && (
                          <span className="block text-xs text-gray-500">{entry.buyerPhone}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-500">{entry.reference}</td>
                      {brokered && (
                        <td className="py-2 pr-4 text-right tabular-nums text-gray-500">
                          {formatRwf(entry.grossAmount)}
                        </td>
                      )}
                      <td className="py-2 text-right tabular-nums font-medium text-gray-900">
                        {formatRwf(entry.platformRevenue)}
                        {entry.feeRate != null && (
                          <span className="block text-xs text-gray-400">{entry.feeRate}%</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
