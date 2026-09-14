"use client"

import { useEffect, useMemo, useState } from "react"
import EpidemicMap from "@/components/epidemics/epidemic-map"
import { Activity, MapPin, ShieldCheck, RefreshCw, Clock } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface PublicCase {
  _id: string
  diseaseName: string
  animalType?: string | null
  animalName?: string | null
  affectedCount: number
  severity: string
  latitude: number
  longitude: number
  locationLabel?: string | null
  district?: string | null
  sector?: string | null
  status: string
  reportedAt: string
}

export default function EpidemicMapSection() {
  const { t } = useLanguage()
  const [cases, setCases] = useState<PublicCase[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/epidemics/public", { cache: "no-store" })
      const data = await res.json()
      if (data && Array.isArray(data.cases)) {
        setCases(data.cases)
        setLastUpdated(new Date())
      }
    } catch {
      setCases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
    const interval = setInterval(fetchCases, 60_000)
    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => {
    const confirmed = cases.filter((c) => c.status === "confirmed")
    const resolved = cases.filter((c) => c.status === "resolved")
    const critical = cases.filter((c) => c.severity === "critical" && c.status === "confirmed")
    const totalAffected = cases.reduce((s, c) => s + (c.affectedCount || 1), 0)
    return { total: cases.length, confirmed: confirmed.length, resolved: resolved.length, critical: critical.length, totalAffected }
  }, [cases])

  const topDiseases = useMemo(() => {
    const map: Record<string, number> = {}
    cases.forEach((c) => { map[c.diseaseName] = (map[c.diseaseName] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [cases])

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="container-custom">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-wide mb-4">
            <Activity className="h-3.5 w-3.5" />
            Live Epidemic Tracking
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {t("home.epidemic.title")}
          </h2>
          <p className="text-gray-500 mt-3">
            {t("home.epidemic.subtitle")}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500 font-medium">{t("home.epidemic.totalReports")}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600 font-medium">{t("home.epidemic.active")}</p>
            <p className="text-3xl font-bold text-red-700 mt-1">{stats.confirmed}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-600 font-medium">{t("home.epidemic.critical")}</p>
            <p className="text-3xl font-bold text-amber-700 mt-1">{stats.critical}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-600 font-medium">{t("home.epidemic.resolved")}</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{stats.resolved}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <MapPin className="h-4 w-4 text-red-500" />
                  {t("home.epidemic.outbreakMap")}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {lastUpdated && (
                    <span className="hidden sm:flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <button
                    onClick={fetchCases}
                    className="flex items-center gap-1 text-gray-500 hover:text-red-600 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="h-96 bg-gray-100 animate-pulse flex items-center justify-center">
                  <Activity className="h-6 w-6 text-gray-400 animate-pulse" />
                </div>
              ) : (
                <EpidemicMap cases={cases} heightClassName="h-96" />
              )}
              {!loading && cases.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">
                  No active epidemic reports right now. Check back soon.
                </p>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 shadow-sm bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("home.epidemic.topDiseases")}</h3>
              {topDiseases.length === 0 ? (
                <p className="text-sm text-gray-400">No data yet</p>
              ) : (
                <div className="space-y-2.5">
                  {topDiseases.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700 truncate">{name}</span>
                      <span className="text-sm font-bold text-gray-900 flex-shrink-0">{count}</span>
                    </div>
                  ))}
                  <div className="h-px bg-gray-100 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total animals affected</span>
                    <span className="text-sm font-bold text-red-600">{stats.totalAffected.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 shadow-sm bg-gradient-to-br from-red-50 to-orange-50 p-5">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-sm font-semibold text-gray-900">{t("home.epidemic.howItWorks")}</h3>
              </div>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>{t("home.epidemic.step1")}</li>
                <li>{t("home.epidemic.step2")}</li>
                <li>{t("home.epidemic.step3")}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
