"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { getActivityLogs, getActivityLogCategoryCounts } from "@/lib/actions/superadmin"
import {
  History, RefreshCw, ChevronLeft, ChevronRight, Search, LayoutGrid, Eye,
  LogIn, PawPrint, FileText, Briefcase, LifeBuoy, UserCog, Shield, Download, AlertCircle
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

const ROLE_BADGE: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  doctor: "bg-green-100 text-green-800",
  farmer: "bg-orange-100 text-orange-800",
}

// One consistent language across the whole page: an icon + a text-{color}-600 tint on a
// shared bg-gray-100 chip, matching the existing Recent Activity feed on the dashboard.
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
const DEFAULT_META = { label: "Other", icon: AlertCircle, color: "text-gray-600" }

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

  let lastDay: string | null = null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('superadmin.activityLog') || 'Activity Log'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('superadmin.activityLogDesc') || 'Every logged-in action across all roles'}</p>
        </div>
        <Button onClick={() => fetchData(page)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('superadmin.refresh') || 'Refresh'}
        </Button>
      </div>

      {/* Category overview - click a chip to filter, at-a-glance counts for everything else */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("all")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            category === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          {t('superadmin.allActivity') || 'All Activity'}
          <span className={`text-xs ${category === "all" ? "text-blue-100" : "text-gray-400"}`}>{counts.total.toLocaleString()}</span>
        </button>
        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const count = countFor(key)
          if (count === 0 && category !== key) return null
          const Icon = meta.icon
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                category === key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(`superadmin.category.${key}`) || meta.label}
              <span className={`text-xs ${category === key ? "text-blue-100" : "text-gray-400"}`}>{count.toLocaleString()}</span>
            </button>
          )
        })}
      </div>

      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('superadmin.searchActivity') || 'Search by user, email, or action...'}
              className="pl-9"
            />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full sm:w-40">
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
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            {category === "all" ? (t('superadmin.allActivity') || 'All Activity') : (t(`superadmin.category.${category}`) || CATEGORY_META[category]?.label)}
          </CardTitle>
          <CardDescription>
            {data.total.toLocaleString()} {t('superadmin.entries') || 'entries'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {data.logs.length > 0 ? (
            <>
              <div className="space-y-1">
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
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-4 pb-1 first:pt-0">
                          {label}
                        </p>
                      )}
                      <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50/80 transition-colors duration-150 group">
                        <div className={`p-2 rounded-lg bg-gray-100 ${meta.color} flex-shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 leading-5">
                            {formatActionLabel(log.action)}
                            {log.details && <span className="font-normal text-gray-600"> — {log.details}</span>}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center flex-wrap gap-x-2 gap-y-1">
                            <span>{log.userName}</span>
                            <Badge variant="secondary" className={`${ROLE_BADGE[log.userRole] || 'bg-gray-100 text-gray-700'} text-[10px] px-1.5 py-0 leading-4`}>
                              {log.userRole}
                            </Badge>
                            <span className="text-gray-300">·</span>
                            <span>{created.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-shrink-0 text-gray-500 hover:text-blue-700 hover:bg-blue-50 opacity-70 group-hover:opacity-100"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">{t('superadmin.viewDetails') || 'View Details'}</span>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {t('superadmin.page') || 'Page'} {data.page} {t('superadmin.of') || 'of'} {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="p-3 rounded-full bg-gray-100 mb-3">
                <History className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">{t('superadmin.noDataAvailable') || 'No data available'}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                    <div className={`p-2 rounded-lg bg-gray-100 ${meta.color} flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
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
                      <Badge variant="secondary" className={`${ROLE_BADGE[selectedLog.userRole] || 'bg-gray-100 text-gray-700'} text-xs`}>
                        {selectedLog.userRole}
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
