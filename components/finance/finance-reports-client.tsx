"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, FileText, Sheet } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import PeriodSelector from "@/components/finance/period-selector"
import SourceBreakdown, { type SourceTotal } from "@/components/finance/source-breakdown"
import { formatRwf, resolvePreset, type DateRange, type PeriodPreset } from "@/lib/finance-period"
import { INCOME_SOURCE_LABEL_KEYS } from "@/lib/income-sources"

interface Summary {
  total: number
  grossTotal: number
  sources: SourceTotal[]
}

/** A period report covering all six income sources, exportable as PDF or a spreadsheet. */
export default function FinanceReportsClient({ canExport }: { canExport: boolean }) {
  const { t } = useLanguage()
  const [preset, setPreset] = useState<PeriodPreset>("this_month")
  const [custom, setCustom] = useState<DateRange>(resolvePreset("this_month"))
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null)

  const range = resolvePreset(preset, custom)

  const load = useCallback(async () => {
    setLoading(true)
    const r = resolvePreset(preset, custom)
    try {
      const res = await fetch(`/api/income/summary?from=${r.from}&to=${r.to}`)
      if (res.ok) setSummary(await res.json())
    } catch {
      // Keep the previous report on screen.
    } finally {
      setLoading(false)
    }
  }, [preset, custom])

  useEffect(() => { load() }, [load])

  /** Rows shared by both exports, so the PDF and the spreadsheet can never disagree. */
  const buildRows = () => {
    if (!summary) return []
    return summary.sources.map((row) => [
      t(INCOME_SOURCE_LABEL_KEYS[row.sourceType]),
      String(row.count),
      String(row.grossAmount),
      String(row.platformRevenue),
    ])
  }

  const headers = [t("finance.source"), t("finance.transactions"), t("finance.grossValue"), t("finance.revenue")]
  const fileStem = `vettrack-income-${range.from}-to-${range.to}`

  const exportPDF = async () => {
    if (!summary || !canExport) return
    setExporting("pdf")
    try {
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF()

      doc.setFontSize(16)
      doc.text("Vettrack — Income report", 14, 20)
      doc.setFontSize(10)
      doc.text(`${range.from}  to  ${range.to}`, 14, 27)
      doc.text(`All amounts in RWF`, 14, 33)

      let y = 45
      doc.setFontSize(11)
      doc.text(headers[0], 14, y)
      doc.text(headers[1], 96, y, { align: "right" })
      doc.text(headers[2], 140, y, { align: "right" })
      doc.text(headers[3], 190, y, { align: "right" })
      y += 3
      doc.line(14, y, 190, y)
      y += 7

      doc.setFontSize(10)
      for (const row of buildRows()) {
        doc.text(row[0], 14, y)
        doc.text(row[1], 96, y, { align: "right" })
        doc.text(Number(row[2]).toLocaleString(), 140, y, { align: "right" })
        doc.text(Number(row[3]).toLocaleString(), 190, y, { align: "right" })
        y += 7
      }

      y += 2
      doc.line(14, y, 190, y)
      y += 7
      doc.setFontSize(11)
      doc.text(t("finance.total"), 14, y)
      doc.text(summary.total.toLocaleString(), 190, y, { align: "right" })

      y += 12
      doc.setFontSize(8)
      // Without this line a reader could mistake gross merchandise value for revenue.
      doc.text(
        "Revenue is what Vettrack keeps. For brokered animal sales the gross value is",
        14,
        y
      )
      doc.text("settled directly between buyer and seller and never reaches Vettrack.", 14, y + 4)

      doc.save(`${fileStem}.pdf`)
    } finally {
      setExporting(null)
    }
  }

  const exportExcel = async () => {
    if (!summary || !canExport) return
    setExporting("xlsx")
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.utils.book_new()
      const sheet = XLSX.utils.aoa_to_sheet([
        ["Vettrack — Income report"],
        [`${range.from} to ${range.to}`],
        ["All amounts in RWF"],
        [],
        headers,
        ...buildRows(),
        [],
        [t("finance.total"), "", "", String(summary.total)],
      ])
      XLSX.utils.book_append_sheet(wb, sheet, "Income")
      XLSX.writeFile(wb, `${fileStem}.xlsx`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("finance.reports")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("finance.reportsDesc")}</p>
        </div>
        <PeriodSelector preset={preset} custom={custom} onPresetChange={setPreset} onCustomChange={setCustom} />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {loading && !summary ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 mb-4 border-b border-gray-200">
                <div>
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div>
                  <Skeleton className="h-3 w-24 mb-2 ml-auto" />
                  <Skeleton className="h-7 w-32" />
                </div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </>
          ) : summary ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 mb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t("finance.period")}</p>
                  <p className="text-sm text-gray-900">{range.from} — {range.to}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t("finance.totalIncome")}</p>
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatRwf(summary.total)}</p>
                </div>
              </div>

              <SourceBreakdown sources={summary.sources} total={summary.total} showChart={false} />

              {canExport && (
                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200">
                  <Button onClick={exportPDF} disabled={!!exporting} variant="outline">
                    {exporting === "pdf" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    {t("finance.exportPdf")}
                  </Button>
                  <Button onClick={exportExcel} disabled={!!exporting} variant="outline">
                    {exporting === "xlsx" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sheet className="h-4 w-4 mr-2" />
                    )}
                    {t("finance.exportExcel")}
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
