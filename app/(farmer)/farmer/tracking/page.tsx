"use client"
// The farmer's collar tracking page. Data comes from Vettrack's own database: the
// collars post readings and accelerometer bursts to /api/iot/*, and this page reads
// them back through /api/tracking/*. (It used to proxy ThingSpeak channels.)
import { useCallback, useEffect, useState } from "react"
import { Eye, EyeOff, Loader2, Plus, Radio, Settings, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser as getAuthUser } from "@/lib/auth"
import { TrackingDashboard } from "@/components/tracking/tracking-dashboard"
import { TrackingActions, TrackingSkeleton, useLeafletCss } from "@/components/tracking/tracking-actions"
import { useDeviceDashboard } from "@/components/tracking/use-device-dashboard"
import { deviceLabel, fill, postureLabel, timeAgo } from "@/components/tracking/format"
import type { PostureName } from "@/lib/tracking/behaviour"
import type { TrackingDeviceSummary } from "@/lib/tracking/types"

type AnimalOption = { _id: string; name: string; earTagId: string | null; kind?: string }

const ERROR_KEYS: Record<string, string> = {
  duplicate_device: "deviceTracking.errDuplicate",
  invalid_device_id: "deviceTracking.errDeviceId",
  invalid_api_key: "deviceTracking.errApiKey",
  invalid_animal: "deviceTracking.errAnimal",
  no_recent_reading: "deviceTracking.errNoRecentReading",
}

const input =
  "w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white"

function KeyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={`${input} pr-12`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function AnimalSelect({ animals, value, onChange }: { animals: AnimalOption[]; value: string; onChange: (v: string) => void }) {
  const { t } = useLanguage()
  return (
    <select className={input} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("deviceTracking.noAnimalLinked")}</option>
      {animals.map((a) => (
        <option key={a._id} value={a._id}>
          {a.name}
          {a.earTagId ? ` #${a.earTagId}` : ""}
        </option>
      ))}
    </select>
  )
}

export default function FarmerTrackingPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  useLeafletCss()

  const [me, setMe] = useState<{ id: string; name: string } | null>(null)
  const [devices, setDevices] = useState<TrackingDeviceSummary[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [devicesError, setDevicesError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [limitInput, setLimitInput] = useState("50")
  const [limit, setLimit] = useState(50)
  const [animals, setAnimals] = useState<AnimalOption[]>([])
  const [dialog, setDialog] = useState<"add" | "settings" | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [calibrating, setCalibrating] = useState<PostureName | null>(null)

  // form state, shared by the add and settings dialogs
  const [formDeviceId, setFormDeviceId] = useState("")
  const [formKey, setFormKey] = useState("")
  const [formName, setFormName] = useState("")
  const [formAnimalId, setFormAnimalId] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { data, loading, refreshing, error, lastUpdated, refresh } = useDeviceDashboard(selectedId, limit)
  const selected = devices.find((d) => d.id === selectedId) ?? null

  const apiError = useCallback(
    (json: any) => (json?.code && ERROR_KEYS[json.code] ? t(ERROR_KEYS[json.code]) : json?.error || t("deviceTracking.errGeneric")),
    [t]
  )

  const loadDevices = useCallback(async (preferId?: string) => {
    setDevicesLoading(true)
    try {
      const res = await fetch("/api/tracking/devices", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const list: TrackingDeviceSummary[] = json.devices ?? []
      setDevices(list)
      setDevicesError(false)
      setSelectedId((prev) => {
        const want = preferId ?? prev
        return want && list.some((d) => d.id === want) ? want : list[0]?.id ?? null
      })
    } catch (err) {
      console.error("Failed to load tracking devices:", err)
      setDevicesError(true)
    } finally {
      setDevicesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDevices()
    getAuthUser()
      .then((u) => u && setMe({ id: u._id, name: u.name }))
      .catch((err) => console.error("Failed to fetch user data:", err))
  }, [loadDevices])

  // The farm's animals, for linking a collar to the cow wearing it.
  useEffect(() => {
    if (!me) return
    fetch(`/api/farm-animals?farmerId=${me.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => setAnimals(Array.isArray(list) ? list.filter((a: AnimalOption) => a.kind !== "calf") : []))
      .catch(() => setAnimals([]))
  }, [me])

  const openAdd = () => {
    setFormDeviceId("")
    setFormKey("")
    setFormName("")
    setFormAnimalId("")
    setFormError(null)
    setDialog("add")
  }

  const openSettings = () => {
    if (!selected) return
    setFormName(selected.name)
    setFormKey("")
    setFormAnimalId(selected.animalId ?? "")
    setFormError(null)
    setDialog("settings")
  }

  const submitAdd = async () => {
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch("/api/tracking/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: formDeviceId, apiKey: formKey, name: formName, animalId: formAnimalId || null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return setFormError(apiError(json))
      setDialog(null)
      toast({ title: t("deviceTracking.addedToast") })
      await loadDevices(json.device?.id)
    } catch {
      setFormError(t("deviceTracking.errGeneric"))
    } finally {
      setSaving(false)
    }
  }

  const submitSettings = async () => {
    if (!selected) return
    setSaving(true)
    setFormError(null)
    try {
      const body: Record<string, unknown> = { name: formName, animalId: formAnimalId || null }
      if (formKey.trim()) body.apiKey = formKey
      const res = await fetch(`/api/tracking/devices/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return setFormError(apiError(json))
      setDevices((list) => list.map((d) => (d.id === json.device.id ? json.device : d)))
      setDialog(null)
      toast({ title: t("deviceTracking.savedToast") })
    } catch {
      setFormError(t("deviceTracking.errGeneric"))
    } finally {
      setSaving(false)
    }
  }

  const removeDevice = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tracking/devices/${selected.id}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(apiError(json))
      setConfirmRemove(false)
      setDialog(null)
      toast({ title: t("deviceTracking.removedToast") })
      setSelectedId(null)
      await loadDevices()
    } catch (err) {
      toast({ title: t("deviceTracking.errGeneric"), description: err instanceof Error ? err.message : undefined, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const calibrate = async (posture: PostureName, action: "set" | "clear") => {
    if (!selected) return
    setCalibrating(posture)
    try {
      const res = await fetch(`/api/tracking/devices/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calibrate: { posture, action } }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(apiError(json))
      setDevices((list) => list.map((d) => (d.id === json.device.id ? json.device : d)))
      toast({
        title:
          action === "set"
            ? fill(t("deviceTracking.calibratedToast"), { posture: postureLabel(posture, t) })
            : t("deviceTracking.calibrationClearedToast"),
      })
      refresh()
    } catch (err) {
      toast({
        title: t("deviceTracking.calibrationFailed"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setCalibrating(null)
    }
  }

  const applyLimit = () => {
    const n = Math.min(500, Math.max(1, Number.parseInt(limitInput, 10) || 50))
    setLimitInput(String(n))
    setLimit(n)
  }

  const label = selected ? deviceLabel(selected) : t("farmer.cowHealthMonitor")
  // The device list is updated straight after a calibration; the dashboard catches up on its next fetch.
  const shown = data && selected ? { ...data, device: selected } : data

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("farmer.realTimeTracking")}</p>
          </div>
          {selected && (
            <TrackingActions
              data={data}
              meta={{
                animalLabel: label,
                generatedBy: me?.name || t("trackingReport.unknownUser"),
                fileSlug: selected.deviceId.toLowerCase(),
              }}
              lastUpdated={lastUpdated}
              refreshing={refreshing}
              onRefresh={refresh}
            />
          )}
        </div>

        {devicesLoading && devices.length === 0 ? (
          <TrackingSkeleton />
        ) : devicesError && devices.length === 0 ? (
          <div className="border border-gray-200 shadow-sm rounded-lg p-12 text-center bg-white">
            <p className="text-gray-600 mb-6">{t("deviceTracking.errGeneric")}</p>
            <button onClick={() => loadDevices()} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
              {t("farmer.tryAgain")}
            </button>
          </div>
        ) : devices.length === 0 ? (
          <div className="border border-gray-200 shadow-sm rounded-lg p-12 text-center bg-white">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-50">
              <Radio className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{t("deviceTracking.connectTitle")}</h3>
            <p className="text-gray-600 mb-6 max-w-xl mx-auto">{t("deviceTracking.connectDesc")}</p>
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
              <Plus className="w-4 h-4" /> {t("deviceTracking.addDevice")}
            </button>
          </div>
        ) : (
          <>
            {/* Device bar */}
            <div className="border border-gray-200 shadow-sm rounded-lg p-6 mb-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-6 items-end">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t("deviceTracking.collar")}</label>
                  <select className={input} value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {deviceLabel(d)} · {d.deviceId}
                      </option>
                    ))}
                  </select>
                  {selected && (
                    <p className="text-xs text-gray-500">
                      {selected.lastSeenAt
                        ? fill(t("deviceTracking.lastSeen"), { when: timeAgo(selected.lastSeenAt, t) })
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
                    <button className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium" onClick={applyLimit}>
                      {t("farmer.fetch")}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={openSettings}
                    className="inline-flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:border-green-600 hover:text-green-700"
                  >
                    <Settings className="w-4 h-4" /> {t("deviceTracking.settings")}
                  </button>
                  <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg">
                    <Plus className="w-4 h-4" /> {t("deviceTracking.addDevice")}
                  </button>
                </div>
              </div>
            </div>

            {loading && !data ? (
              <TrackingSkeleton />
            ) : error && !data ? (
              <div className="border border-gray-200 shadow-sm rounded-lg p-12 text-center bg-white">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{t("farmer.noDataAvailable")}</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button onClick={refresh} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                  {t("farmer.tryAgain")}
                </button>
              </div>
            ) : shown ? (
              <TrackingDashboard data={shown} animalLabel={label} calibration={{ onCalibrate: calibrate, busy: calibrating }} />
            ) : null}
          </>
        )}
      </div>

      {/* Add device */}
      <Dialog open={dialog === "add"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("deviceTracking.addDevice")}</DialogTitle>
            <DialogDescription>{t("deviceTracking.addDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t("deviceTracking.deviceId")}</label>
              <input className={input} value={formDeviceId} onChange={(e) => setFormDeviceId(e.target.value)} placeholder="COW-001" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t("deviceTracking.deviceKey")}</label>
              <KeyInput value={formKey} onChange={setFormKey} placeholder={t("deviceTracking.deviceKeyPlaceholder")} />
              <p className="text-xs text-gray-500">{t("deviceTracking.deviceKeyHint")}</p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t("deviceTracking.nameOptional")}</label>
              <input className={input} value={formName} onChange={(e) => setFormName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t("deviceTracking.animalOptional")}</label>
              <AnimalSelect animals={animals} value={formAnimalId} onChange={setFormAnimalId} />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <button className="px-4 py-2 border border-gray-200 rounded-lg" onClick={() => setDialog(null)} disabled={saving}>
              {t("deviceTracking.cancel")}
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
              onClick={submitAdd}
              disabled={saving || !formDeviceId.trim() || !formKey.trim()}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {t("deviceTracking.addDevice")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device settings */}
      <Dialog open={dialog === "settings"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("deviceTracking.settings")}</DialogTitle>
            <DialogDescription>
              {t("deviceTracking.deviceId")}: <span className="font-mono">{selected?.deviceId}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t("deviceTracking.name")}</label>
              <input className={input} value={formName} onChange={(e) => setFormName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t("deviceTracking.animalOptional")}</label>
              <AnimalSelect animals={animals} value={formAnimalId} onChange={setFormAnimalId} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t("deviceTracking.newDeviceKey")}</label>
              <KeyInput value={formKey} onChange={setFormKey} placeholder={t("deviceTracking.keepCurrentKey")} />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter className="sm:justify-between gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              onClick={() => setConfirmRemove(true)}
              disabled={saving}
            >
              <Trash2 className="w-4 h-4" /> {t("deviceTracking.removeDevice")}
            </button>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-200 rounded-lg" onClick={() => setDialog(null)} disabled={saving}>
                {t("deviceTracking.cancel")}
              </button>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                onClick={submitSettings}
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} {t("deviceTracking.save")}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deviceTracking.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deviceTracking.removeDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t("deviceTracking.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault()
                removeDevice()
              }}
              disabled={saving}
            >
              {t("deviceTracking.removeDevice")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
