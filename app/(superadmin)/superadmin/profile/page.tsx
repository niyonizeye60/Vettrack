"use client"

import { useState, useEffect, useRef } from "react"
import { getCurrentUser } from "@/lib/auth"
import { useLanguage } from "@/contexts/LanguageContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Settings, Mail, MapPin, Phone, Calendar, Activity,
  Users, ClipboardList, Shield, Award, RefreshCw, UserCheck, Camera
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type Tab = "overview" | "activity"

interface Stats {
  totalUsers: number
  totalConsultations: number
  activeUsers: number
  yearsActive: number
}

interface ActivityItem {
  _id: string
  action: string
  details: string
  ipAddress: string
  createdAt: string
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000)

  if (date >= todayStart) return "TODAY"
  if (date >= yesterdayStart) return "YESTERDAY"
  if (date >= weekStart) return "THIS WEEK"
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()
}

function timeAgoShort(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatAction(action: string): string {
  return action
    .replace(/^(admin|chat|system)\./, "")
    .replace(/\./g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

function ActivityTimeline({ activity }: { activity: ActivityItem[] }) {
  const groups: { label: string; items: ActivityItem[] }[] = []
  const seen = new Map<string, number>()

  for (const item of activity) {
    const label = getDateGroup(item.createdAt)
    if (!seen.has(label)) {
      seen.set(label, groups.length)
      groups.push({ label, items: [] })
    }
    groups[seen.get(label)!].items.push(item)
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-gray-400 tracking-widest mb-4">{group.label}</p>
          <div className="space-y-5">
            {group.items.map((item) => {
              const isExport = item.action.includes("export")
              const Icon = isExport ? RefreshCw : Shield
              const iconBg = isExport ? "bg-blue-50" : "bg-purple-50"
              const iconColor = isExport ? "text-blue-600" : "text-purple-600"

              return (
                <div key={item._id} className="flex gap-4 items-start">
                  <div className={`flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${iconBg}`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{formatAction(item.action)}</p>
                    {item.details && (
                      <p className="text-sm text-gray-500 mt-0.5">{item.details}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{timeAgoShort(item.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  valueColor,
}: {
  icon: React.ElementType
  value: string | number
  label: string
  valueColor: string
}) {
  return (
    <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
        </div>
        <h3 className={`text-3xl font-bold mt-2 ${valueColor}`}>{value}</h3>
        <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
      </CardContent>
    </Card>
  )
}

export default function SuperAdminProfilePage() {
  const { t } = useLanguage()
  const router = useRouter()

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<any>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("overview")
  const [bannerImage, setBannerImage] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalConsultations: 0, activeUsers: 0, yearsActive: 0 })
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [userData, bannerRes] = await Promise.all([
          getCurrentUser(),
          fetch("/api/system/banner").then((r) => r.json()).catch(() => ({})),
        ])
        setUser(userData)
        setAvatarPreview((userData as any)?.image ?? null)
        setBannerImage(bannerRes.bannerImage ?? null)

        if (userData) {
          const yearsActive = userData.createdAt
            ? Math.max(1, Math.floor((Date.now() - new Date(userData.createdAt as string).getTime()) / (1000 * 60 * 60 * 24 * 365)))
            : 1

          const statsRes = await fetch("/api/admin-dashboard").then((r) => r.json()).catch(() => ({}))

          setStats({
            totalUsers: statsRes.totalUsers ?? 0,
            totalConsultations: statsRes.totalConsultations ?? 0,
            activeUsers: statsRes.activeUsers ?? 0,
            yearsActive,
          })

          const activityRes = await fetch("/api/farmer/activity").then((r) => r.json()).catch(() => ({}))
          setActivity(activityRes.activity ?? [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload/avatar", { method: "POST", body: form })
      const data = await res.json()
      if (data.success) {
        setAvatarPreview(data.image)
        window.dispatchEvent(new Event('focus'))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAvatarUploading(false)
      e.target.value = ""
    }
  }

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "SA"

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt as string).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>

        <Card className="overflow-hidden border border-gray-200">
          <Skeleton className="h-36 w-full rounded-none" />
          <CardContent className="pt-0 pb-5 px-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <Skeleton className="w-24 h-24 rounded-full border-4 border-white" />
              <Skeleton className="h-8 w-28 mb-1" />
            </div>
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-24 mb-5" />
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4 border-t border-gray-100">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/superadmin" className="hover:text-gray-700 transition-colors">
          Dashboard
        </Link>
        <span className="text-gray-300">›</span>
        <span className="text-gray-900 font-medium">Profile</span>
      </nav>

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">View and manage your account information</p>
      </div>

      {/* Profile hero card */}
      <Card className="overflow-hidden border border-gray-200">
        {/* Banner */}
        <div className="h-36">
          {bannerImage ? (
            <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-purple-600 to-purple-500" />
          )}
        </div>

        <CardContent className="pt-0 pb-5 px-6">
          {/* Avatar + button row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white shadow-md ring-2 ring-purple-100">
                <AvatarImage src={avatarPreview ?? undefined} alt={user?.name || "Super Admin"} />
                <AvatarFallback className="bg-purple-100 text-purple-600 text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 h-7 w-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
              >
                <Camera className="h-3.5 w-3.5 text-gray-600" />
              </button>
            </div>
            <div className="pb-1">
              <Button variant="outline" size="sm" onClick={() => router.push("/superadmin/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Name + role */}
          <div className="mb-1">
            <h2 className="text-xl font-bold text-gray-900">{user?.name || "Super Admin"}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                <Shield className="h-2.5 w-2.5 mr-1" />
                Super Admin
              </Badge>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-5">{user?.location || "Rwanda"}</p>

          {/* Info bar */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 pt-4 border-t border-gray-100">
            {user?.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                {user.email}
              </span>
            )}
            {user?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                {user.location}
              </span>
            )}
            {user?.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                {user.phone}
              </span>
            )}
            {joinedDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                Joined {joinedDate}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(["overview", "activity"] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={async () => {
                setTab(tabKey)
                if (tabKey === "activity" && activity.length === 0 && !activityLoading) {
                  setActivityLoading(true)
                  const res = await fetch("/api/farmer/activity").then((r) => r.json()).catch(() => ({}))
                  setActivity(res.activity ?? [])
                  setActivityLoading(false)
                }
              }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === tabKey
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tabKey === "overview" ? "Overview" : "Activity"}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              value={stats.totalUsers}
              label="Total Users"
              valueColor="text-gray-900"
            />
            <StatCard
              icon={UserCheck}
              value={stats.activeUsers}
              label="Active Users"
              valueColor="text-purple-600"
            />
            <StatCard
              icon={ClipboardList}
              value={stats.totalConsultations}
              label="Consultations"
              valueColor="text-green-600"
            />
            <StatCard
              icon={Award}
              value={stats.yearsActive}
              label="Years Active"
              valueColor="text-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Full Name" value={user?.name} />
                <InfoRow label="Email" value={user?.email} />
                <InfoRow label="Phone" value={user?.phone} />
                <InfoRow label="Location" value={user?.location} />
                {user?.bio && <InfoRow label="Bio" value={user.bio} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Role" value={<span className="capitalize">{user?.role}</span>} />
                <InfoRow
                  label="Status"
                  value={
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 capitalize text-xs">
                      {user?.status || "active"}
                    </Badge>
                  }
                />
                <InfoRow label="Joined" value={joinedDate} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Activity */}
      {tab === "activity" && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="font-medium text-gray-600">No activity yet</p>
                <p className="text-sm text-gray-400 mt-1">Your recent actions will appear here</p>
              </div>
            ) : (
              <ActivityTimeline activity={activity} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
