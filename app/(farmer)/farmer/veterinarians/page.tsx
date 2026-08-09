"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { getDoctorsList } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Stethoscope, ShieldCheck, Plus, Pencil, Trash2, Syringe, ShieldAlert, KeyRound, Lock, History, Search, List, Grid3X3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  PERMISSION_MODULES, PERMISSION_ACTIONS, emptyPermissions,
  type PermissionMap, type PermissionAction, type PermissionModule,
} from "@/lib/permissions"

interface Doctor { _id: string; name: string; email: string; specialization: string; phone: string }
interface Grant {
  _id: string
  vetId: string
  permissions: PermissionMap
  updateOwnOnly: boolean
  status: "active" | "revoked"
  note: string | null
  grantedAt: string
  revokedAt: string | null
  vet: { _id: string; name: string; email: string; phone: string; specialization: string; image: string | null }
}
interface AuditEntry {
  _id: string
  vetId: string
  vetName: string
  module: string
  action: string
  animalName: string | null
  summary: string
  changes: { field: string; from: unknown; to: unknown }[] | null
  createdAt: string
}

const MODULE_ICON: Record<string, JSX.Element> = {
  insemination: <Syringe className="h-4 w-4" />,
  health: <ShieldAlert className="h-4 w-4" />,
  access: <KeyRound className="h-4 w-4" />,
}

const MODULE_TONE: Record<string, string> = {
  insemination: "bg-blue-50 text-blue-700 border-blue-200",
  health: "bg-amber-50 text-amber-700 border-amber-200",
  access: "bg-purple-50 text-purple-700 border-purple-200",
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

export default function FarmerVeterinariansPage() {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [grants, setGrants] = useState<Grant[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Assign / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Grant | null>(null)
  const [vetId, setVetId] = useState("")
  const [permissions, setPermissions] = useState<PermissionMap>(emptyPermissions())
  const [updateOwnOnly, setUpdateOwnOnly] = useState(true)
  const [note, setNote] = useState("")
  const [formError, setFormError] = useState("")

  const [revoking, setRevoking] = useState<Grant | null>(null)

  // Grant list: search, module filter, and layout
  const [grantSearch, setGrantSearch] = useState("")
  const [grantModule, setGrantModule] = useState("all")
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid")

  // Audit filters
  const [filterVet, setFilterVet] = useState("all")
  const [filterModule, setFilterModule] = useState("all")

  const activeGrants = useMemo(() => grants.filter((g) => g.status === "active"), [grants])

  /** How many vets currently hold at least read access to one module. */
  const countWithAccess = (key: PermissionModule) =>
    activeGrants.filter((g) => g.permissions[key]?.view).length

  const grantsFiltered = !!grantSearch.trim() || grantModule !== "all"

  const visibleGrants = useMemo(() => {
    const q = grantSearch.trim().toLowerCase()
    return activeGrants.filter((g) => {
      if (grantModule !== "all" && !g.permissions[grantModule as PermissionModule]?.view) return false
      if (!q) return true
      return (
        g.vet.name?.toLowerCase().includes(q) ||
        g.vet.specialization?.toLowerCase().includes(q) ||
        g.vet.email?.toLowerCase().includes(q)
      )
    })
  }, [activeGrants, grantSearch, grantModule])

  /** Module pills + action badges for one grant, shared by the grid and table views. */
  const permissionBadges = (grant: Grant) => (
    <div className="space-y-1.5">
      {PERMISSION_MODULES.map((mod) => {
        const granted = PERMISSION_ACTIONS.filter((a) => grant.permissions[mod.key]?.[a])
        if (granted.length === 0) return null
        return (
          <div key={mod.key} className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded border ${MODULE_TONE[mod.key]}`}>
              {MODULE_ICON[mod.key]}
              {t(mod.labelKey)}
            </span>
            {granted.map((a) => (
              <Badge key={a} variant="secondary" className="text-xs">
                {t(`farmer.perm${a.charAt(0).toUpperCase()}${a.slice(1)}`)}
              </Badge>
            ))}
          </div>
        )
      })}
      {grant.updateOwnOnly && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
          {t("farmer.updateOwnOnly")}
        </p>
      )}
    </div>
  )

  const loadGrants = useCallback(async () => {
    const res = await fetch("/api/farm-vets")
    if (!res.ok) return
    const data = await res.json()
    setGrants(Array.isArray(data.grants) ? data.grants : [])
  }, [])

  const loadAudit = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterVet !== "all") params.set("vetId", filterVet)
    if (filterModule !== "all") params.set("module", filterModule)
    const res = await fetch(`/api/farm-vets/audit?${params.toString()}`)
    if (!res.ok) return
    const data = await res.json()
    setAudit(Array.isArray(data.entries) ? data.entries : [])
  }, [filterVet, filterModule])

  useEffect(() => {
    async function init() {
      try {
        const userData = await getCurrentUser()
        if (!userData) return
        setUser(userData)
        const [docs] = await Promise.all([getDoctorsList(), loadGrants(), loadAudit()])
        setDoctors(Array.isArray(docs) ? docs : [])
      } finally {
        setLoading(false)
      }
    }
    init()
    // loadAudit is re-run by the filter effect below; only the initial load belongs here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user) return
    loadAudit()
  }, [user, filterVet, filterModule, loadAudit])

  function openAssign() {
    setEditing(null)
    setVetId("")
    setPermissions(emptyPermissions())
    setUpdateOwnOnly(true)
    setNote("")
    setFormError("")
    setDialogOpen(true)
  }

  function openEdit(grant: Grant) {
    setEditing(grant)
    setVetId(grant.vetId)
    setPermissions(grant.permissions)
    setUpdateOwnOnly(grant.updateOwnOnly)
    setNote(grant.note || "")
    setFormError("")
    setDialogOpen(true)
  }

  function toggle(moduleKey: string, action: PermissionAction) {
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey as keyof PermissionMap], [action]: !prev[moduleKey as keyof PermissionMap][action] },
    }))
    setFormError("")
  }

  const anySelected = PERMISSION_MODULES.some((m) =>
    PERMISSION_ACTIONS.some((a) => permissions[m.key][a])
  )

  async function save() {
    if (!vetId) {
      setFormError(t("farmer.selectVeterinarian"))
      return
    }
    if (!anySelected) {
      setFormError(t("farmer.noPermissionsSelected"))
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/farm-vets", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vetId, permissions, updateOwnOnly, note }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || "Failed to save")
        return
      }
      setDialogOpen(false)
      toast({ title: editing ? t("farmer.vetAccessUpdated") : t("farmer.vetAccessGranted") })
      await Promise.all([loadGrants(), loadAudit()])
    } catch {
      setFormError("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function revoke() {
    if (!revoking) return
    setSaving(true)
    try {
      const res = await fetch(`/api/farm-vets?vetId=${revoking.vetId}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: t("farmer.vetAccessRevoked") })
        await Promise.all([loadGrants(), loadAudit()])
      } else {
        const data = await res.json()
        toast({ title: data.error || "Failed to revoke", variant: "destructive" })
      }
    } finally {
      setSaving(false)
      setRevoking(null)
    }
  }

  // Veterinarians not already holding an active grant - re-granting a revoked vet is
  // allowed and reactivates their existing row.
  const assignableDoctors = doctors.filter(
    (d) => editing?.vetId === d._id || !activeGrants.some((g) => g.vetId === d._id)
  )

  const groupedAudit = useMemo(() => {
    const groups: { label: string; entries: AuditEntry[] }[] = []
    for (const entry of audit) {
      const label = dayLabel(entry.createdAt)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.entries.push(entry)
      else groups.push({ label, entries: [entry] })
    }
    return groups
  }, [audit])

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 bg-gray-200 rounded w-40" />
        <div className="h-4 bg-gray-200 rounded w-64 mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
      <div className="h-10 bg-gray-200 rounded w-full max-w-md" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("farmer.veterinarians")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("farmer.veterinariansDesc")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.veterinarians")}</p>
              <Stethoscope className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{activeGrants.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("farmer.withAccessNow")}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.permInsemination")}</p>
              <Syringe className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-blue-600 mt-2">{countWithAccess("insemination")}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("farmer.vetsGranted")}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.permHealth")}</p>
              <ShieldAlert className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-orange-600 mt-2">{countWithAccess("health")}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("farmer.vetsGranted")}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.vetActivity")}</p>
              <KeyRound className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-green-600 mt-2">{audit.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("farmer.recordedActions")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-900">
        <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>{t("farmer.privacyNote")}</p>
      </div>

      <Tabs defaultValue="access">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="access" className="flex items-center gap-1">
            <Stethoscope className="h-4 w-4" /> {t("farmer.veterinarians")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1">
            <History className="h-4 w-4" /> {t("farmer.vetActivity")}
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------ Access ------------------------------ */}
        <TabsContent value="access" className="space-y-4 pt-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  {t("farmer.vetsWithAccess")}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button onClick={openAssign}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("farmer.assignVeterinarian")}
                  </Button>
                  {/* Below md the table is unusable, so the grid is forced and the switch hidden. */}
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("table")}
                    aria-label={t("common.tableView")}
                    className="hidden md:flex"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    aria-label={t("common.gridView")}
                    className="hidden md:flex"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t("farmer.searchVeterinarians")}
                    className="pl-9 bg-white"
                    value={grantSearch}
                    onChange={(e) => setGrantSearch(e.target.value)}
                  />
                </div>
                <Select value={grantModule} onValueChange={setGrantModule}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("farmer.allModules")}</SelectItem>
                    {PERMISSION_MODULES.map((m) => (
                      <SelectItem key={m.key} value={m.key}>{t(m.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grid view - always on mobile, on desktop when selected */}
              <div className={viewMode === "grid" ? "block" : "block md:hidden"}>
                {visibleGrants.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>{grantsFiltered ? t("farmer.noVetsMatch") : t("farmer.noVetsAssigned")}</p>
                    {!grantsFiltered && <p className="text-xs mt-1">{t("farmer.noVetsAssignedDesc")}</p>}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visibleGrants.map((grant) => (
                      <div
                        key={grant._id}
                        className="border border-gray-200 rounded-xl bg-white p-4 hover:shadow-md transition-shadow duration-200 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{grant.vet.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {grant.vet.specialization || t("farmer.veterinarian")}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(grant)} aria-label={t("farmer.editAccess")}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setRevoking(grant)} aria-label={t("farmer.revokeAccess")}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        {permissionBadges(grant)}
                        {grant.note && <p className="text-xs text-gray-600 italic">{grant.note}</p>}
                        <p className="text-xs text-gray-400">
                          {t("farmer.grantedOn")} {new Date(grant.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Table view - desktop only */}
              <div className={`overflow-x-auto ${viewMode === "table" ? "hidden md:block" : "hidden"}`}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("farmer.veterinarian")}</TableHead>
                      <TableHead>{t("farmer.permissions")}</TableHead>
                      <TableHead>{t("farmer.grantedOn")}</TableHead>
                      <TableHead>{t("farmer.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleGrants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                          <p>{grantsFiltered ? t("farmer.noVetsMatch") : t("farmer.noVetsAssigned")}</p>
                          {!grantsFiltered && <p className="text-xs mt-1">{t("farmer.noVetsAssignedDesc")}</p>}
                        </TableCell>
                      </TableRow>
                    ) : visibleGrants.map((grant) => (
                      <TableRow key={grant._id}>
                        {/* Veterinarian */}
                        <TableCell>
                          <p className="font-medium">{grant.vet.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {grant.vet.specialization || t("farmer.veterinarian")}
                          </p>
                          {grant.note && <p className="text-xs text-gray-600 italic mt-0.5">{grant.note}</p>}
                        </TableCell>

                        {/* Permissions */}
                        <TableCell>{permissionBadges(grant)}</TableCell>

                        {/* Granted on */}
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                          {new Date(grant.grantedAt).toLocaleDateString()}
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(grant)} aria-label={t("farmer.editAccess")}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setRevoking(grant)} aria-label={t("farmer.revokeAccess")}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------- Activity ----------------------------- */}
        <TabsContent value="activity" className="space-y-4 pt-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-sky-500 rounded-full" />
                {t("farmer.vetActivity")}
              </CardTitle>
              <p className="text-sm text-gray-500">{t("farmer.vetActivityDesc")}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl">
                <Select value={filterVet} onValueChange={setFilterVet}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("farmer.allVeterinarians")}</SelectItem>
                    {grants.map((g) => (
                      <SelectItem key={g.vetId} value={g.vetId}>{g.vet.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterModule} onValueChange={setFilterModule}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("farmer.allModules")}</SelectItem>
                    {PERMISSION_MODULES.map((m) => (
                      <SelectItem key={m.key} value={m.key}>{t(m.labelKey)}</SelectItem>
                    ))}
                    <SelectItem value="access">{t("farmer.permissions")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {groupedAudit.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">{t("farmer.noVetActivity")}</p>
              ) : (
                <div className="space-y-6">
                  {groupedAudit.map((group) => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{group.label}</p>
                      <ul className="space-y-3">
                        {group.entries.map((entry) => (
                          <li key={entry._id} className="flex gap-3">
                            <span className={`flex-shrink-0 h-8 w-8 rounded-full border flex items-center justify-center ${MODULE_TONE[entry.module] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                              {MODULE_ICON[entry.module] || <KeyRound className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-800">{entry.summary}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(entry.createdAt).toLocaleString(undefined, {
                                  hour: "2-digit", minute: "2-digit",
                                  day: "numeric", month: "short", year: "numeric",
                                })}
                              </p>
                              {entry.changes && entry.changes.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <span className="font-medium">{t("farmer.changedFields")}:</span>{" "}
                                  {entry.changes.map((c) => c.field).join(", ")}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --------------------------- Assign / edit --------------------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("farmer.editAccessTitle") : t("farmer.assignVetTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">{t("farmer.veterinarian")}</label>
              <Combobox
                value={vetId}
                onValueChange={(v) => { setVetId(v); setFormError("") }}
                options={assignableDoctors.map((d) => ({
                  value: d._id,
                  label: d.specialization ? `${d.name} — ${d.specialization}` : d.name,
                }))}
                placeholder={t("farmer.selectVeterinarian")}
                searchPlaceholder={t("farmer.searchVeterinarians")}
                emptyText={t("farmer.noVeterinariansFound")}
                disabled={!!editing || assignableDoctors.length === 0}
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700 block">{t("farmer.permissions")}</label>
              {PERMISSION_MODULES.map((mod) => (
                <div key={mod.key} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {MODULE_ICON[mod.key]}
                    <span className="text-sm font-medium text-gray-900">{t(mod.labelKey)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{t(mod.descKey)}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PERMISSION_ACTIONS.map((action) => {
                      const id = `${mod.key}-${action}`
                      return (
                        <label key={action} htmlFor={id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <Checkbox
                            id={id}
                            checked={permissions[mod.key][action]}
                            onCheckedChange={() => toggle(mod.key, action)}
                          />
                          {t(`farmer.perm${action.charAt(0).toUpperCase()}${action.slice(1)}`)}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <label htmlFor="updateOwnOnly" className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox
                id="updateOwnOnly"
                checked={updateOwnOnly}
                onCheckedChange={(c) => setUpdateOwnOnly(c === true)}
                className="mt-0.5"
              />
              <span>
                <span className="text-sm text-gray-800 block">{t("farmer.updateOwnOnly")}</span>
                <span className="text-xs text-gray-500">{t("farmer.updateOwnOnlyDesc")}</span>
              </span>
            </label>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">{t("farmer.accessNote")}</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("farmer.accessNotePlaceholder")}
              />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                {t("common.cancel")}
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? t("farmer.saving") : editing ? t("common.save") : t("farmer.assignVeterinarian")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------ Revoke ------------------------------ */}
      <AlertDialog open={!!revoking} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("farmer.revokeAccessTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("farmer.revokeAccessDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={revoke} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {t("farmer.revokeAccess")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
