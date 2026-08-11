"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { MapPin, Warehouse, Syringe, ShieldAlert, ShieldPlus, Search, Info, Lock, List, Grid3X3 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { PERMISSION_MODULES, PERMISSION_ACTIONS, type PermissionMap, type PermissionModule } from "@/lib/permissions"

interface Farm {
  farmerId: string
  farmerName: string
  district: string
  sector: string
  permissions: PermissionMap
  updateOwnOnly: boolean
  grantedAt: string
}

const MODULE_ICON: Record<string, JSX.Element> = {
  insemination: <Syringe className="h-3 w-3" />,
  health: <ShieldAlert className="h-3 w-3" />,
  vaccination: <ShieldPlus className="h-3 w-3" />,
}

const MODULE_TONE: Record<string, string> = {
  insemination: "bg-blue-50 text-blue-700 border-blue-200",
  health: "bg-amber-50 text-amber-700 border-amber-200",
  vaccination: "bg-green-50 text-green-700 border-green-200",
}

export default function FarmsPageClient({ farms }: { farms: Farm[] }) {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterModule, setFilterModule] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid")

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return farms.filter(f => {
      if (filterModule !== "all" && !f.permissions[filterModule as PermissionModule]?.view) return false
      if (!q) return true
      return (
        f.farmerName?.toLowerCase().includes(q) ||
        f.district?.toLowerCase().includes(q) ||
        f.sector?.toLowerCase().includes(q)
      )
    })
  }, [farms, searchTerm, filterModule])

  const countWithAccess = (key: PermissionModule) => farms.filter(f => f.permissions[key]?.view).length

  /** The permission badges for one farm, shared by the mobile card and desktop row. */
  const accessBadges = (farm: Farm) => {
    const granted = PERMISSION_MODULES.filter(mod =>
      PERMISSION_ACTIONS.some(a => farm.permissions[mod.key]?.[a])
    )
    if (granted.length === 0) return <span className="text-xs text-gray-400">—</span>
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {granted.map(mod => (
          <span
            key={mod.key}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${MODULE_TONE[mod.key]}`}
          >
            {MODULE_ICON[mod.key]}
            {t(mod.labelKey)}
            <span className="text-[10px] font-normal opacity-70">
              {PERMISSION_ACTIONS.filter(a => farm.permissions[mod.key]?.[a]).join(" · ")}
            </span>
          </span>
        ))}
        {farm.updateOwnOnly && (
          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 gap-1">
            <Lock className="h-2.5 w-2.5" />{t("vet.ownOnly")}
          </Badge>
        )}
      </div>
    )
  }

  // A search or module filter that matches nothing is a different message from a vet
  // who genuinely holds no grants.
  const isFiltered = !!searchTerm.trim() || filterModule !== "all"

  const emptyState = (
    <div className="text-center py-12">
      <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
        <Warehouse className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-gray-500 text-sm font-medium">
        {isFiltered ? t("vet.noResultsFound") : t("vet.noFarms")}
      </p>
      {!isFiltered && (
        <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">{t("vet.noFarmsDesc")}</p>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("vet.farms")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("vet.farmsDesc")}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("vet.farms")}</p>
              <Warehouse className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{farms.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("vet.activeAccess")}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.permInsemination")}</p>
              <Syringe className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-blue-600 mt-2">{countWithAccess("insemination")}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("vet.farmsWithAccess")}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.permHealth")}</p>
              <ShieldAlert className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-orange-600 mt-2">{countWithAccess("health")}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("vet.farmsWithAccess")}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.permVaccination")}</p>
              <ShieldPlus className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-green-600 mt-2">{countWithAccess("vaccination")}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("vet.farmsWithAccess")}</p>
          </CardContent>
        </Card>
      </div>

      {farms.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-900">
          <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <p>{t("vet.auditNotice")}</p>
        </div>
      )}

      {/* Filters + view switch */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Warehouse className="h-5 w-5 text-green-600" />
              {t("vet.farms")}
            </CardTitle>
            {/* Below md the table is unusable, so the grid is forced and the switch hidden. */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("table")}
                aria-label={t("common.tableView")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                aria-label={t("common.gridView")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t("vet.searchFarms")}
                className="pl-9 bg-white h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-full sm:w-56 h-9 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("vet.allModules")}</SelectItem>
                {PERMISSION_MODULES.map((m) => (
                  <SelectItem key={m.key} value={m.key}>{t(m.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">

          {/* Grid view - always on mobile, on desktop when selected */}
          <div className={viewMode === "grid" ? "block" : "block md:hidden"}>
            {filtered.length === 0 ? emptyState : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                {filtered.map((farm) => (
                  <div
                    key={farm.farmerId}
                    className="border border-gray-200 rounded-xl bg-white p-4 hover:shadow-md transition-shadow duration-200 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                        <Warehouse className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{farm.farmerName}</p>
                        {(farm.district || farm.sector) && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate">{[farm.sector, farm.district].filter(Boolean).join(", ")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">{accessBadges(farm)}</div>
                    <p className="text-xs text-gray-400">
                      {t("vet.granted")} {farm.grantedAt ? new Date(farm.grantedAt).toLocaleDateString() : "—"}
                    </p>
                    <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full">
                      <Link href={`/veterinary/farms/${farm.farmerId}`}>{t("vet.openFarm")}</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Table view - desktop only */}
          <div className={`overflow-x-auto ${viewMode === "table" ? "hidden md:block" : "hidden"}`}>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-[220px] font-semibold text-gray-600">{t("vet.farm")}</TableHead>
                  <TableHead className="w-[170px] font-semibold text-gray-600">{t("vet.location")}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t("vet.access")}</TableHead>
                  <TableHead className="w-[120px] font-semibold text-gray-600">{t("vet.granted")}</TableHead>
                  <TableHead className="w-[130px] font-semibold text-gray-600">{t("vet.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">{emptyState}</TableCell>
                  </TableRow>
                ) : filtered.map((farm) => (
                  <TableRow key={farm.farmerId} className="hover:bg-gray-50/80 transition-colors duration-150">
                    {/* Farm */}
                    <TableCell className="w-[220px]">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                          <Warehouse className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <p className="font-medium text-gray-800 text-sm truncate">{farm.farmerName}</p>
                      </div>
                    </TableCell>
                    {/* Location */}
                    <TableCell className="w-[170px]">
                      {(farm.district || farm.sector) ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{[farm.sector, farm.district].filter(Boolean).join(", ")}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    {/* Access */}
                    <TableCell>{accessBadges(farm)}</TableCell>
                    {/* Granted */}
                    <TableCell className="w-[120px]">
                      <span className="text-sm text-gray-600">
                        {farm.grantedAt ? new Date(farm.grantedAt).toLocaleDateString() : "—"}
                      </span>
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="w-[130px]">
                      <Link href={`/veterinary/farms/${farm.farmerId}`}>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shrink-0">
                          {t("vet.openFarm")}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
