"use client"
import { useEffect } from "react"
import { Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/contexts/LanguageContext"
import type { TrackingDashboardData } from "@/lib/tracking/types"
import { exportTrackingCsv, exportTrackingExcel, exportTrackingPdf, type TrackingExportMeta } from "./tracking-export"

/** Last-updated time, export menu and refresh button for the page header. */
export function TrackingActions({
  data,
  meta,
  lastUpdated,
  refreshing,
  onRefresh,
}: {
  data: TrackingDashboardData | null
  meta: TrackingExportMeta
  lastUpdated: string
  refreshing: boolean
  onRefresh: () => void
}) {
  const { t } = useLanguage()
  const run = (fn: () => unknown) => async () => {
    if (!data) return
    try {
      await fn()
    } catch (error) {
      console.error("Tracking export failed:", error)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {lastUpdated && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">{t("farmer.lastUpdated")}:</span> {lastUpdated}
        </div>
      )}
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={!data || data.readings.length === 0}
            >
              <Download className="w-4 h-4" />
              <span className="font-medium">{t("farmer.exportReport")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={run(() => data && exportTrackingPdf(data, meta, t))}>
              <FileText className="mr-2 h-4 w-4" />
              {t("farmer.exportAsPDF")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={run(() => data && exportTrackingCsv(data, meta, t))}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t("farmer.exportAsCSV")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={run(() => data && exportTrackingExcel(data, meta, t))}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t("farmer.exportAsExcel")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 print:hidden disabled:opacity-50"
          onClick={onRefresh}
          disabled={refreshing || !data}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="font-medium">{t("farmer.refresh")}</span>
        </button>
      </div>
    </div>
  )
}

export function TrackingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-gray-200 shadow-sm rounded-lg p-6 space-y-4">
            <div className="h-10 w-10 bg-gray-200 rounded-xl" />
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-7 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-72 bg-gray-200 rounded-lg" />
        <div className="h-72 bg-gray-200 rounded-lg" />
      </div>
    </div>
  )
}

/** Leaflet's stylesheet, which RwandaMap relies on the page to provide. */
export function useLeafletCss() {
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
    link.integrity = "sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
    link.crossOrigin = ""
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])
}
