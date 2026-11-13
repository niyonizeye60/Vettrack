"use client"
// The vet's view of a patient's (farmer's) tracking collars: the same full dashboard
// the farmer sees, read-only. Access is checked server-side - the vet needs a
// consultation with the farmer (lib/tracking/store.ts resolveTrackingAccess).
import { useEffect, useState } from "react"
import { Radio, Users } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser as getAuthUser } from "@/lib/auth"
import { TrackingDashboard } from "@/components/tracking/tracking-dashboard"
import { TrackingActions, TrackingSkeleton, useLeafletCss } from "@/components/tracking/tracking-actions"
import { useDeviceDashboard } from "@/components/tracking/use-device-dashboard"
import { deviceLabel, fill, timeAgo } from "@/components/tracking/format"
import type { TrackingDeviceSummary } from "@/lib/tracking/types"

type Patient = {
  id: string
  name: string
  phone: string
  hasTracking: boolean
}

const input =
  "w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white disabled:bg-gray-50"

export default function VeterinaryTrackingPage() {
  const { t } = useLanguage()
  useLeafletCss()

  const [patients, setPatients] = useState<Patient[]>([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [selectedPatientId, setSelectedPatientId] = useState<string>("")
  const [devices, setDevices] = useState<TrackingDeviceSummary[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [limitInput, setLimitInput] = useState("50")
  const [limit, setLimit] = useState(50)
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null)

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null
  const { data, loading, refreshing, error, lastUpdated, refresh } = useDeviceDashboard(selectedDeviceId, limit)

  useEffect(() => {
    async function fetchPatients() {
      setPatientsLoading(true)
      try {
        const res = await fetch("/api/veterinary/patients")
        const json = await res.json()
        const list: Patient[] = json.patients ?? []
        setPatients(list)
        // Prefer a patient who actually has a collar.
        const first = list.find((p) => p.hasTracking) ?? list[0]
        if (first) setSelectedPatientId(first.id)
      } catch (err) {
        console.error("Failed to load patients:", err)
      } finally {
        setPatientsLoading(false)
      }
    }
    fetchPatients()
    getAuthUser()
      .then((u) => u && setCurrentUser({ name: u.name }))
      .catch((err) => console.error("Failed to fetch user data:", err))
  }, [])

  // The selected patient's collars.
  useEffect(() => {
    setDevices([])
    setSelectedDeviceId(null)
    setDevicesError(null)
    if (!selectedPatientId) return
    let cancelled = false
    setDevicesLoading(true)
    fetch(`/api/tracking/devices?farmerId=${selectedPatientId}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
        const list: TrackingDeviceSummary[] = json.devices ?? []
        setDevices(list)
        setSelectedDeviceId(list[0]?.id ?? null)
      })
      .catch((err) => !cancelled && setDevicesError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setDevicesLoading(false))
    return () => {
      cancelled = true
    }
  }, [selectedPatientId])

  const applyLimit = () => {
    const n = Math.min(500, Math.max(1, Number.parseInt(limitInput, 10) || 50))
    setLimitInput(String(n))
    setLimit(n)
  }

  const label = selectedDevice ? deviceLabel(selectedDevice) : t("vet.patientHealthMonitor")
  const fileSlug = `${(selectedPatient?.name || "patient").trim().toLowerCase().replace(/\s+/g, "-")}-${selectedDevice?.deviceId.toLowerCase() ?? ""}`

  const emptyCard = (icon: React.ReactNode, title: string, desc: string) => (
    <div className="border border-gray-200 shadow-sm rounded-lg p-12 text-center bg-white">
      <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-50">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">{desc}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("farmer.realTimeTracking")}</p>
            {selectedPatient && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>
                  {selectedPatient.name}
                  {selectedPatient.phone ? ` • ${selectedPatient.phone}` : ""}
                </span>
              </div>
            )}
          </div>
          {selectedDevice && (
            <TrackingActions
              data={data}
              meta={{
                animalLabel: label,
                generatedBy: currentUser?.name || t("vetTracking.unknownUser"),
                patient: selectedPatient ? { name: selectedPatient.name, phone: selectedPatient.phone } : undefined,
                withLogo: true,
                fileSlug,
              }}
              lastUpdated={lastUpdated}
              refreshing={refreshing}
              onRefresh={refresh}
            />
          )}
        </div>

        {/* Patient + collar pickers */}
        <div className="border border-gray-200 shadow-sm rounded-lg p-6 mb-6 bg-white">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t("vet.selectPatient")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t("vet.patient")}</label>
              <select
                className={input}
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                disabled={patientsLoading || patients.length === 0}
              >
                {patientsLoading ? (
                  <option>…</option>
                ) : patients.length === 0 ? (
                  <option value="">—</option>
                ) : (
                  patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                      {patient.hasTracking ? "" : ` ${t("vet.noTrackerSuffix")}`}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t("deviceTracking.collar")}</label>
              <select
                className={input}
                value={selectedDeviceId ?? ""}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                disabled={devices.length === 0}
              >
                {devices.length === 0 ? (
                  <option value="">—</option>
                ) : (
                  devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {deviceLabel(d)} · {d.deviceId}
                    </option>
                  ))
                )}
              </select>
              {selectedDevice && (
                <p className="text-xs text-gray-500">
                  {selectedDevice.lastSeenAt
                    ? fill(t("deviceTracking.lastSeen"), { when: timeAgo(selectedDevice.lastSeenAt, t) })
                    : t("deviceTracking.neverSeen")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t("deviceTracking.readingsToShow")}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className={`${input} flex-1 min-w-0`}
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyLimit()}
                  min={1}
                  max={500}
                />
                <button
                  className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                  onClick={applyLimit}
                  disabled={!selectedDeviceId}
                >
                  {t("farmer.fetch")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {patientsLoading || devicesLoading || (loading && !data) ? (
          <TrackingSkeleton />
        ) : patients.length === 0 ? (
          emptyCard(<Users className="w-6 h-6 text-green-600" />, t("vet.noTrackablePatientsYet"), t("vet.noTrackablePatientsYetDesc"))
        ) : devicesError ? (
          emptyCard(<Radio className="w-6 h-6 text-green-600" />, t("farmer.noDataAvailable"), devicesError)
        ) : devices.length === 0 ? (
          emptyCard(<Radio className="w-6 h-6 text-green-600" />, t("farmer.noDataAvailable"), t("vet.noTrackerYet"))
        ) : error && !data ? (
          <div className="border border-gray-200 shadow-sm rounded-lg p-12 text-center bg-white">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{t("farmer.noDataAvailable")}</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button onClick={refresh} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
              {t("farmer.tryAgain")}
            </button>
          </div>
        ) : data ? (
          <TrackingDashboard data={data} animalLabel={label} />
        ) : null}
      </div>
    </div>
  )
}
