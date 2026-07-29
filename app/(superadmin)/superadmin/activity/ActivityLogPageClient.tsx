"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { getActivityLogs, getActivityLogCategoryCounts } from "@/lib/actions/superadmin"
import {
  Eye, ChevronLeft, ChevronRight, Search, RotateCw,
  LogIn, PawPrint, FileText, Briefcase, LifeBuoy, UserCog, Shield, Download, CircleDot, History
} from "lucide-react"

interface ActivityLog {
  _id: string
  action: string
  details: string
  createdAt: string | Date
  userId: string | null
  userName: string
  userEmail: string
  userRole: string
}

interface ActivityData {
  logs: ActivityLog[]
  total: number
  page: number
  pageSize: number
}

interface CategoryCounts {
  total: number
  byCategory: Array<{ category: string; count: number }>
}

interface ActivityLogPageClientProps {
  initialData: ActivityData
  initialCounts: CategoryCounts
}

// Same soft badge colors as getRoleColor in users-management.tsx, so a role
// badge looks the same here as it does on the Users page.
const ROLE_BADGE_COLOR: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  doctor: "bg-green-100 text-green-800",
  farmer: "bg-orange-100 text-orange-800",
}

// Same translation keys users-management.tsx's translateRole uses, so a role reads the
// same way here as it does on the Users page (e.g. "doctor" -> "Doctor").
const ROLE_LABEL_KEY: Record<string, string> = {
  superadmin: "superadmin.superAdmin",
  admin: "superadmin.admin",
  doctor: "superadmin.veterinarian",
  farmer: "superadmin.farmer",
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  auth: { label: "Auth", icon: LogIn, color: "text-teal-600" },
  livestock: { label: "Livestock", icon: PawPrint, color: "text-green-600" },
  consultation: { label: "Consultations", icon: FileText, color: "text-orange-600" },
  employee: { label: "Employees", icon: Briefcase, color: "text-blue-600" },
  support: { label: "Support", icon: LifeBuoy, color: "text-cyan-600" },
  account: { label: "Account", icon: UserCog, color: "text-pink-600" },
  admin: { label: "Admin", icon: Shield, color: "text-indigo-600" },
  export: { label: "Exports", icon: Download, color: "text-fuchsia-600" },
}
const DEFAULT_META = { label: "Other", icon: CircleDot, color: "text-gray-600" }

function formatActionLabel(action: string) {
  const [, ...rest] = action.split(".")
  const words = (rest.length ? rest.join(" ") : action).replace(/_/g, " ")
  return words.replace(/\b\w/g, (c) => c.toUpperCase())
}

function dayLabel(date: Date) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (startOfDay.getTime() === startOfToday.getTime()) return "Today"
  if (startOfDay.getTime() === startOfYesterday.getTime()) return "Yesterday"
  return date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    year: startOfDay.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

export default function ActivityLogPageClient({ initialData, initialCounts }: ActivityLogPageClientProps) {
  const { t } = useLanguage()
  const roleLabel = (role: string) => t(ROLE_LABEL_KEY[role] || "") || (role.charAt(0).toUpperCase() + role.slice(1))
  const [data, setData] = useState<ActivityData>(initialData)
  const [counts, setCounts] = useState<CategoryCounts>(initialCounts)
  const [page, setPage] = useState(initialData.page)
  const [role, setRole] = useState("all")
  const [category, setCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const isFirstRun = useRef(true)

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(handle)
  }, [search])

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    setPage(1)
  }, [role, category, debouncedSearch])

  const fetchData = async (targetPage: number) => {
    setLoading(true)
    const filterArgs = {
      role: role === "all" ? undefined : role,
      search: debouncedSearch || undefined,
    }
    const [logsResult, countsResult] = await Promise.all([
      getActivityLogs({
        page: targetPage,
        pageSize: initialData.pageSize,
        category: category === "all" ? undefined : category,
        ...filterArgs,
      }),
      getActivityLogCategoryCounts(filterArgs),
    ])
    setData(logsResult)
    setCounts(countsResult)
    setLoading(false)
  }

  useEffect(() => {
    if (isFirstRun.current) return
    let cancelled = false
    setLoading(true)
    const filterArgs = {
      role: role === "all" ? undefined : role,
      search: debouncedSearch || undefined,
    }
    Promise.all([
      getActivityLogs({
        page,
        pageSize: initialData.pageSize,
        category: category === "all" ? undefined : category,
        ...filterArgs,
      }),
      getActivityLogCategoryCounts(filterArgs),
    ]).then(([logsResult, countsResult]) => {
      if (!cancelled) {
        setData(logsResult)
        setCounts(countsResult)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, role, category, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const countFor = (cat: string) => counts.byCategory.find(c => c.category === cat)?.count || 0
  const panelTitle = category === "all"
    ? (t('superadmin.allActivity') || 'All Activity')
    : (t(`superadmin.category.${category}`) || CATEGORY_META[category]?.label)

  let lastDay: string | null = null

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('superadmin.activityLog') || 'Activity Log'}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('superadmin.activityLogDesc') || 'Every logged-in action across all roles'}</p>
      </div>

      {/* Segmented tab bar */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="all">{t('superadmin.allActivity') || 'All Activity'}</TabsTrigger>
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const count = countFor(key)
            if (count === 0 && category !== key) return null
            return (
              <TabsTrigger key={key} value={key}>
                {t(`superadmin.category.${key}`) || meta.label}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{panelTitle}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{data.total.toLocaleString()} {t('superadmin.entries') || 'entries'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('superadmin.searchActivity') || 'Search user, email, or action...'}
                className="pl-8 h-9 w-56 text-sm"
              />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9 w-32 text-sm">
                <SelectValue placeholder={t('superadmin.role') || 'Role'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('superadmin.allRoles') || 'All Roles'}</SelectItem>
                <SelectItem value="farmer">{t('superadmin.farmers') || 'Farmers'}</SelectItem>
                <SelectItem value="doctor">{t('superadmin.doctors') || 'Doctors'}</SelectItem>
                <SelectItem value="admin">{t('superadmin.admin') || 'Admin'}</SelectItem>
                <SelectItem value="superadmin">{t('superadmin.superAdmin') || 'Super Admin'}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => fetchData(page)}
              disabled={loading}
              className="gap-1.5"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('superadmin.refresh') || 'Refresh'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                <Skeleton className="h-4 flex-1 max-w-md" />
                <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
                <Skeleton className="h-4 w-16 flex-shrink-0" />
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : data.logs.length > 0 ? (
          <>
            {/* Table header row */}
            <div className="hidden sm:flex items-center gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <span className="flex-1">{t('superadmin.action') || 'Action'}</span>
              <span className="w-36">{t('superadmin.user') || 'User'}</span>
              <span className="w-28">{t('superadmin.role') || 'Role'}</span>
              <span className="w-24">{t('superadmin.time') || 'Time'}</span>
              <span className="w-12 text-right">{t('superadmin.actions') || 'Actions'}</span>
            </div>

            <div>
              {data.logs.map((log) => {
                const cat = log.action.split(".")[0]
                const meta = CATEGORY_META[cat] || DEFAULT_META
                const Icon = meta.icon
                const created = new Date(log.createdAt)
                const label = dayLabel(created)
                const showHeader = label !== lastDay
                lastDay = label

                return (
                  <div key={log._id}>
                    {showHeader && (
                      <div className="px-5 pt-4 pb-1.5 bg-gray-50/60">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <div className="flex-1 min-w-0 flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${meta.color}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{formatActionLabel(log.action)}</p>
                          {log.details && <p className="text-xs text-gray-400 truncate">{log.details}</p>}
                        </div>
                      </div>
                      <span className="w-36 text-sm text-gray-600 truncate">{log.userName}</span>
                      <span className="w-28">
                        <Badge variant="secondary" className={ROLE_BADGE_COLOR[log.userRole] || "bg-gray-100 text-gray-800"}>
                          {roleLabel(log.userRole)}
                        </Badge>
                      </span>
                      <span className="w-24 text-sm text-gray-500">
                        {created.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="w-12 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-8 w-8 p-0 rounded-full text-gray-500 hover:text-blue-600 hover:border-blue-200"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {t('superadmin.page') || 'Page'} {data.page} {t('superadmin.of') || 'of'} {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0 rounded-full text-gray-500"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 w-8 p-0 rounded-full text-gray-500"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <History className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">{t('superadmin.noDataAvailable') || 'No data available'}</p>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedLog && (() => {
            const cat = selectedLog.action.split(".")[0]
            const meta = CATEGORY_META[cat] || DEFAULT_META
            const Icon = meta.icon
            const created = new Date(selectedLog.createdAt)
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="leading-tight">{formatActionLabel(selectedLog.action)}</DialogTitle>
                      <DialogDescription>{t(`superadmin.category.${cat}`) || meta.label}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-0.5 pt-1">
                  <DetailRow label={t('superadmin.details') || 'Details'} value={selectedLog.details || '—'} />
                  <DetailRow label={t('superadmin.user') || 'User'} value={selectedLog.userName} />
                  <DetailRow label={t('superadmin.email') || 'Email'} value={selectedLog.userEmail || '—'} />
                  <DetailRow
                    label={t('superadmin.role') || 'Role'}
                    value={
                      <Badge variant="secondary" className={ROLE_BADGE_COLOR[selectedLog.userRole] || "bg-gray-100 text-gray-800"}>
                        {roleLabel(selectedLog.userRole)}
                      </Badge>
                    }
                  />
                  <DetailRow label={t('superadmin.time') || 'Time'} value={created.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'medium' })} />
                  <DetailRow
                    label={t('superadmin.action') || 'Action'}
                    value={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{selectedLog.action}</code>}
                  />
                  <DetailRow
                    label="ID"
                    value={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded break-all">{selectedLog._id}</code>}
                  />
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 text-right break-words min-w-0">{value}</span>
    </div>
  )
}