"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/LanguageContext"
import EpidemicMap from "./epidemic-map"
import EpidemicRegisterDialog from "./epidemic-register-dialog"
import {
  EPIDEMIC_STATUS_STYLES, EPIDEMIC_SEVERITY_STYLES, EPIDEMIC_STATUSES,
  type EpidemicCase,
} from "@/lib/epidemics"
import {
  Activity, MapPin, Plus, CheckCircle2, XCircle, Trash2, Loader2, RefreshCw, AlertTriangle, RotateCcw,
} from "lucide-react"

interface EpidemicManagementProps {
  // "admin" can approve/manage cases; "doctor" can view and report only;
  // "farmer" sees only their own reports.
  role: "farmer" | "doctor" | "admin"
  farmerId?: string
  farmerName?: string
}

const STATUS_FILTERS = ["all", ...EPIDEMIC_STATUSES]
/** Admins also get the cases farmers and vets deleted, to restore or remove for good. */
const DELETED_FILTER = "deleted"

export default function EpidemicManagement({ role, farmerId, farmerName }: EpidemicManagementProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const isStaff = role !== "farmer"
  const canApprove = role === "admin"
  const [cases, setCases] = useState<EpidemicCase[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [registerOpen, setRegisterOpen] = useState(false)
  const [selectedCase, setSelectedCase] = useState<EpidemicCase | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [categoryBusy, setCategoryBusy] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/epidemics/diseases", { cache: "no-store" })
      const data = await res.json()
      if (data && Array.isArray(data.categories)) setCategories(data.categories)
    } catch {
      setCategories([])
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const fetchCases = useCallback(async () => {
    try {
      const url = isStaff ? "/api/epidemics?all=1" : `/api/epidemics?farmerId=${farmerId}`
      const res = await fetch(url)
      const data = await res.json()
      setCases(Array.isArray(data) ? data : [])
    } catch {
      setCases([])
    } finally {
      setLoading(false)
    }
  }, [role, farmerId])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  // An admin alert links here as ?case=<id>: open that case once the list has loaded.
  const searchParams = useSearchParams()
  const linkedCaseId = searchParams.get("case")
  const openedLinkedCase = useRef<string | null>(null)
  useEffect(() => {
    if (!linkedCaseId || loading || openedLinkedCase.current === linkedCaseId) return
    openedLinkedCase.current = linkedCaseId
    const linked = cases.find((c) => c._id === linkedCaseId)
    if (linked) {
      setStatusFilter(linked.deletedAt ? DELETED_FILTER : "all")
      setSelectedCase(linked)
    }
  }, [linkedCaseId, loading, cases])

  // Only admins are sent deleted cases; they sit under their own filter, out of the counts and map.
  const liveCases = useMemo(() => cases.filter((c) => !c.deletedAt), [cases])
  const deletedCases = useMemo(() => cases.filter((c) => c.deletedAt), [cases])
  const statusFilters = canApprove ? [...STATUS_FILTERS, DELETED_FILTER] : STATUS_FILTERS

  const filtered = useMemo(
    () =>
      statusFilter === DELETED_FILTER
        ? deletedCases
        : statusFilter === "all"
          ? liveCases
          : liveCases.filter((c) => c.status === statusFilter),
    [liveCases, deletedCases, statusFilter]
  )

  const stats = useMemo(() => ({
    total: liveCases.length,
    confirmed: liveCases.filter((c) => c.status === "confirmed").length,
    resolved: liveCases.filter((c) => c.status === "resolved").length,
    rejected: liveCases.filter((c) => c.status === "rejected").length,
    pending: liveCases.filter((c) => c.status === "pending").length,
  }), [liveCases])

  const addCategory = async () => {
    const name = newCategory.trim()
    if (!name) return
    setCategoryBusy(true)
    try {
      const res = await fetch("/api/epidemics/diseases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("epidemic.failedToAddCategory"))
      toast({ title: t("epidemic.categoryAdded"), description: t("epidemic.nowSelectable").replace("{name}", name) })
      setNewCategory("")
      await fetchCategories()
    } catch (err: any) {
      toast({ title: t("epidemic.couldNotAddCategory"), description: err.message || t("epidemic.pleaseTryAgain"), variant: "destructive" })
    } finally {
      setCategoryBusy(false)
    }
  }

  const removeCategory = async (id: string, name: string) => {
    setCategoryBusy(true)
    try {
      const res = await fetch(`/api/epidemics/diseases?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(t("epidemic.failedToDelete"))
      toast({ title: t("epidemic.categoryRemoved"), description: t("epidemic.nameDeleted").replace("{name}", name) })
      await fetchCategories()
    } catch {
      toast({ title: t("epidemic.couldNotDeleteCategory"), description: t("epidemic.pleaseTryAgain"), variant: "destructive" })
    } finally {
      setCategoryBusy(false)
    }
  }

  const updateStatus = async (c: EpidemicCase, status: string) => {
    setActionId(c._id)
    try {
      const res = await fetch("/api/epidemics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c._id, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("epidemic.failed"))
      toast({ title: t("epidemic.caseMarkedAs").replace("{status}", t(`epidemic.status.${status}`)), description: t("epidemic.nameUpdated").replace("{name}", c.diseaseName) })
      setSelectedCase((prev) => (prev && prev._id === c._id ? { ...prev, status: status as EpidemicCase["status"] } : prev))
      await fetchCases()
    } catch (err: any) {
      toast({ title: t("epidemic.updateFailed"), description: err.message || t("epidemic.pleaseTryAgain"), variant: "destructive" })
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setActionId(deleteId)
    try {
      const res = await fetch(`/api/epidemics?id=${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(t("epidemic.failedToDelete"))
      toast({ title: t("epidemic.caseDeleted") })
      setSelectedCase((prev) => (prev && prev._id === deleteId ? null : prev))
      await fetchCases()
    } catch {
      toast({ title: t("epidemic.deleteFailed"), description: t("epidemic.pleaseTryAgain"), variant: "destructive" })
    } finally {
      setActionId(null)
      setDeleteId(null)
    }
  }

  /** Admins: bring back a case a farmer or vet deleted, with the status it had. */
  const restoreCase = async (c: EpidemicCase) => {
    setActionId(c._id)
    try {
      const res = await fetch("/api/epidemics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c._id, action: "restore" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("epidemic.restoreFailed"))
      toast({ title: t("epidemic.caseRestored"), description: t("epidemic.nameUpdated").replace("{name}", c.diseaseName) })
      setSelectedCase((prev) => (prev && prev._id === c._id ? null : prev))
      await fetchCases()
    } catch (err: any) {
      toast({ title: t("epidemic.restoreFailed"), description: err.message || t("epidemic.pleaseTryAgain"), variant: "destructive" })
    } finally {
      setActionId(null)
    }
  }

  // What the delete dialog is about: an admin removes for good, anyone else only hides
  // their own report (an admin can still restore it).
  const deleteTarget = deleteId ? cases.find((c) => c._id === deleteId) ?? null : null
  const deleteIsPermanent = canApprove

  // Resolved/rejected/deleted cases are removed from the map (the first two still appear in the table).
  const mapCases = filtered
    .filter((c) => !c.deletedAt && c.status !== "resolved" && c.status !== "rejected")
    .map((c) => ({
      _id: c._id,
      diseaseName: c.diseaseName,
      animalType: c.animalType,
      animalName: c.animalName,
      farmerName: c.farmerName,
      affectedCount: c.affectedCount,
      severity: c.severity,
      latitude: c.latitude,
      longitude: c.longitude,
      district: c.district,
      sector: c.sector,
      status: c.status,
      reportedAt: c.reportedAt,
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-red-500" />
            {t("epidemic.epidemicOutbreakMap")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {role === "admin"
              ? t("epidemic.monitorAndManageEpidemicCasesReported")
              : role === "doctor"
                ? t("epidemic.monitorEpidemicCasesReportedAcrossThe")
                : t("epidemic.trackEpidemicCasesYouReportedAnd")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCases} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {t("epidemic.refresh")}
          </Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => setRegisterOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("epidemic.reportCase")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 font-medium">{t("epidemic.total")}</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</h3>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-red-600 font-medium">{t("epidemic.confirmed")}</p>
            <h3 className="text-3xl font-bold text-red-700 mt-1">{stats.confirmed}</h3>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-amber-600 font-medium">{t("epidemic.pending")}</p>
            <h3 className="text-3xl font-bold text-amber-700 mt-1">{stats.pending}</h3>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-green-600 font-medium">{t("epidemic.resolved")}</p>
            <h3 className="text-3xl font-bold text-green-700 mt-1">{stats.resolved}</h3>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 font-medium">{t("epidemic.rejected")}</p>
            <h3 className="text-3xl font-bold text-gray-600 mt-1">{stats.rejected}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-red-500" />
              {t("epidemic.casesOnMap")} {filtered.length > 0 && <span className="text-xs font-normal text-gray-400">({filtered.length})</span>}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {statusFilters.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize border transition-colors ${
                    statusFilter === s
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {t(`epidemic.status.${s}`)}
                  {s === DELETED_FILTER && deletedCases.length > 0 && ` (${deletedCases.length})`}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <EpidemicMap
              cases={mapCases}
              heightClassName="h-96"
              selectedCaseId={selectedCase?._id}
              onSelect={(c) => {
                const full = cases.find((x) => x._id === c._id)
                if (full) setSelectedCase(full)
              }}
            />
          )}
          {!loading && cases.length === 0 && (
            <p className="text-center text-sm text-gray-400 mt-3">
              No epidemic cases yet. Click &quot;Report Case&quot; to pin the first one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">{t("epidemic.allReports")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("epidemic.disease")}</TableHead>
                <TableHead>{t("epidemic.animal")}</TableHead>
                {isStaff && <TableHead>{t("epidemic.reportedBy")}</TableHead>}
                <TableHead>{t("common.location")}</TableHead>
                <TableHead>{t("epidemic.affected")}</TableHead>
                <TableHead>{t("epidemic.severity")}</TableHead>
                <TableHead>{t("epidemic.status")}</TableHead>
                <TableHead>{t("epidemic.reported")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isStaff ? 9 : 8} className="text-center text-gray-400 py-8">
                    {t("epidemic.noReportsMatchThisFilter")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((c) => (
                <TableRow key={c._id} className={selectedCase?._id === c._id ? "bg-red-50/50" : ""}>
                  <TableCell className="font-medium text-gray-900">{c.diseaseName}</TableCell>
                  <TableCell>
                    {c.animalName || "—"}
                    {c.animalType && <span className="text-xs text-gray-400 block">{c.animalType}</span>}
                  </TableCell>
                  {isStaff && <TableCell className="text-gray-600">{c.farmerName || "—"}</TableCell>}
                  <TableCell className="text-xs text-gray-500">
                    {c.district && <span className="font-medium text-gray-700">{c.district}</span>}
                    {c.sector && <span> · {c.sector}</span>}
                    {c.sector && <br />}
                    {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                  </TableCell>
                  <TableCell>{c.affectedCount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={EPIDEMIC_SEVERITY_STYLES[c.severity] || ""}>
                      <span className="capitalize">{t(`epidemic.severity.${c.severity}`)}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={EPIDEMIC_STATUS_STYLES[c.status] || ""}>
                      <span className="capitalize">{t(`epidemic.status.${c.status}`)}</span>
                    </Badge>
                    {c.deletedAt && (
                      <span className="block text-xs text-gray-400 mt-1">
                        {t("epidemic.deletedByOn")
                          .replace("{name}", c.deletedByName || "—")
                          .replace("{date}", new Date(c.deletedAt).toLocaleDateString())}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">{new Date(c.reportedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {c.deletedAt ? (
                      // Only admins are sent deleted cases: bring it back, or remove it for good.
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50" disabled={actionId === c._id} onClick={() => restoreCase(c)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t("epidemic.restore")}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50" disabled={actionId === c._id} onClick={() => setDeleteId(c._id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("epidemic.deletePermanently")}
                        </Button>
                      </div>
                    ) : (
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {canApprove && c.status === "confirmed" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-amber-700 border-amber-200 hover:bg-amber-50" disabled={actionId === c._id} onClick={() => updateStatus(c, "pending")}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t("epidemic.moveToPending")}
                        </Button>
                      )}
                      {canApprove && c.status !== "confirmed" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50" disabled={actionId === c._id} onClick={() => updateStatus(c, "confirmed")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t("epidemic.confirm")}
                        </Button>
                      )}
                      {canApprove && c.status !== "resolved" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50" disabled={actionId === c._id} onClick={() => updateStatus(c, "resolved")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t("epidemic.resolve")}
                        </Button>
                      )}
                      {canApprove && c.status !== "rejected" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-gray-500 border-gray-200 hover:bg-gray-100" disabled={actionId === c._id} onClick={() => updateStatus(c, "rejected")}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> {t("epidemic.reject")}
                        </Button>
                      )}
                      {/* Farmers and vets can delete only the cases they reported. */}
                      {c.canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50"
                          disabled={actionId === c._id}
                          onClick={() => setDeleteId(c._id)}
                          aria-label={t("common.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Disease categories (admin only) */}
      {canApprove && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">{t("epidemic.diseaseCategories")}</CardTitle>
            <p className="text-xs text-gray-400">
              {t("epidemic.categoriesAdminsCanSelectWhenReporting")}
            </p>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 && (
                <span className="text-sm text-gray-400">{t("epidemic.noCategoriesYetAddTheFirst")}</span>
              )}
              {categories.map((c) => (
                <span
                  key={c._id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
                >
                  {c.name}
                  <button
                    onClick={() => removeCategory(c._id, c.name)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    aria-label={t("epidemic.deleteName").replace("{name}", c.name)}
                    disabled={categoryBusy}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 max-w-md">
              <Input
                placeholder={t("epidemic.newDiseaseNameEGContagious")}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                disabled={categoryBusy}
              />
              <Button
                size="sm"
                className="flex-shrink-0 bg-red-600 hover:bg-red-700"
                onClick={addCategory}
                disabled={categoryBusy || !newCategory.trim()}
              >
                {categoryBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t("common.add")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Register dialog */}
      <EpidemicRegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        mode={isStaff ? "staff" : "farmer"}
        farmerId={role === "farmer" ? farmerId : undefined}
        canManage={canApprove}
        onSaved={fetchCases}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t("epidemic.deleteThisCase")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteIsPermanent ? t("epidemic.thisWillPermanentlyRemoveTheCase") : t("epidemic.softDeleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === deleteId}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={actionId === deleteId} onClick={handleDelete}>
              {actionId === deleteId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleteIsPermanent && deleteTarget?.deletedAt ? t("epidemic.deletePermanently") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Selected case details */}
      {selectedCase && (
        <div className="fixed inset-x-0 bottom-4 z-[900] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-white rounded-xl shadow-2xl border border-gray-200 max-w-lg w-full p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900">{selectedCase.diseaseName}</p>
                <p className="text-sm text-gray-500">
                  {selectedCase.animalName || selectedCase.animalType || t("epidemic.animal")}
                  {selectedCase.district && ` · ${selectedCase.district}`}
                  {selectedCase.sector && `, ${selectedCase.sector}`}
                  {selectedCase.district ? "" : ` · ${selectedCase.latitude.toFixed(4)}, ${selectedCase.longitude.toFixed(4)}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant="outline" className={EPIDEMIC_STATUS_STYLES[selectedCase.status] || ""}>
                  <span className="capitalize">{t(`epidemic.status.${selectedCase.status}`)}</span>
                </Badge>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label={t("common.close")}
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              {selectedCase.farmerName && <p>Reported by {selectedCase.farmerName}</p>}
              {selectedCase.affectedCount > 0 && <p>{selectedCase.affectedCount} animal(s) affected</p>}
              {selectedCase.symptoms && <p className="text-gray-500">Symptoms: {selectedCase.symptoms}</p>}
              <p className="text-xs text-gray-400">{new Date(selectedCase.reportedAt).toLocaleString()}</p>
              {selectedCase.deletedAt && (
                <p className="text-xs font-medium text-red-600">
                  {t("epidemic.deletedByOn")
                    .replace("{name}", selectedCase.deletedByName || "—")
                    .replace("{date}", new Date(selectedCase.deletedAt).toLocaleDateString())}
                </p>
              )}
            </div>
            {canApprove && selectedCase.deletedAt && (
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs text-green-700 border-green-200 hover:bg-green-50" disabled={actionId === selectedCase._id} onClick={() => restoreCase(selectedCase)}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t("epidemic.restore")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  disabled={actionId === selectedCase._id}
                  // The panel sits above dialogs, so step it aside for the confirmation.
                  onClick={() => {
                    setDeleteId(selectedCase._id)
                    setSelectedCase(null)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("epidemic.deletePermanently")}
                </Button>
              </div>
            )}
            {canApprove && !selectedCase.deletedAt && selectedCase.status === "confirmed" && (
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs text-amber-700 border-amber-200 hover:bg-amber-50" disabled={actionId === selectedCase._id} onClick={() => updateStatus(selectedCase, "pending")}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t("epidemic.moveToPending")}
                </Button>
              </div>
            )}
            {/* A report opened from an admin alert is usually one to review - decide it here. */}
            {canApprove && !selectedCase.deletedAt && selectedCase.status === "pending" && (
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" disabled={actionId === selectedCase._id} onClick={() => updateStatus(selectedCase, "confirmed")}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t("epidemic.confirm")}
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs text-gray-500 border-gray-200 hover:bg-gray-100" disabled={actionId === selectedCase._id} onClick={() => updateStatus(selectedCase, "rejected")}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> {t("epidemic.reject")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
