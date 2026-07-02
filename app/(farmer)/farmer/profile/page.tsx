"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/auth"
import { useLanguage } from "@/contexts/LanguageContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Settings, Mail, MapPin, Phone, Calendar, Activity,
  Stethoscope, HeartPulse, PawPrint, Award,
  ClipboardPlus, RefreshCw
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type Tab = "overview" | "activity"

interface Stats {
  totalAnimals: number
  healthyAnimals: number
  totalConsultations: number
  yearsActive: number
}

interface ActivityItem {
  id: string
  kind: "animal_registered" | "animal_updated" | "consultation_booked" | "consultation_status"
  title: string
  description: string
  date: string
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

function ActivityTimeline({ activity, t }: { activity: ActivityItem[]; t: (key: string) => string }) {
  const groups: { label: string; items: ActivityItem[] }[] = []
  const seen = new Map<string, number>()

  for (const item of activity) {
    const label = getDateGroup(item.date)
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
              const isAnimal = item.kind === "animal_registered" || item.kind === "animal_updated"
              const isNew = item.kind === "animal_registered" || item.kind === "consultation_booked"
              const Icon = isAnimal ? (isNew ? PawPrint : RefreshCw) : (isNew ? ClipboardPlus : RefreshCw)
              const iconBg = isAnimal ? "bg-emerald-50" : "bg-sky-50"
              const iconColor = isAnimal ? "text-emerald-600" : "text-sky-600"
              const kindLabel =
                item.kind === "animal_registered" ? t("farmer.activityAnimalRegistered") :
                item.kind === "animal_updated" ? t("farmer.activityAnimalUpdated") :
                item.kind === "consultation_booked" ? t("farmer.activityConsultationBooked") :
                t("farmer.activityConsultationStatus")

              return (
                <div key={item.id} className="flex gap-4 items-start">
                  <div className={`flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${iconBg}`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{kindLabel}</p>
                    <p className="text-sm text-gray-500 mt-0.5 capitalize">{item.title}{item.description ? ` — ${item.description}` : ""}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgoShort(item.date)}</p>
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
  iconBg,
  iconColor,
}: {
  icon: React.ElementType
  value: string | number
  label: string
  iconBg: string
  iconColor: string
}) {
  return (
    <Card className="border border-gray-100">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function FarmerProfilePage() {
  const { t } = useLanguage()
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("overview")
  const [bannerImage, setBannerImage] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({ totalAnimals: 0, healthyAnimals: 0, totalConsultations: 0, yearsActive: 0 })
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
        setBannerImage(bannerRes.bannerImage ?? null)
        if (userData) {
          const yearsActive = userData.createdAt
            ? Math.max(1, Math.floor((Date.now() - new Date(userData.createdAt as string).getTime()) / (1000 * 60 * 60 * 24 * 365)))
            : 1

          const statsRes = await fetch("/api/farmer/stats").then((r) => r.json()).catch(() => ({}))

          setStats({
            totalAnimals: statsRes.totalAnimals ?? 0,
            healthyAnimals: statsRes.healthyAnimals ?? 0,
            totalConsultations: statsRes.totalConsultations ?? 0,
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

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "F"

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt as string).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null

  const locationStr = [user?.district, user?.sector].filter(Boolean).join(", ")

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-40" />
        <div className="h-6 bg-gray-200 rounded w-28" />
        <div className="h-56 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/farmer" className="hover:text-gray-700 transition-colors">
          {t("farmer.dashboard")}
        </Link>
        <span className="text-gray-300">›</span>
        <span className="text-gray-900 font-medium">{t("farmer.profile")}</span>
      </nav>

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("farmer.profile")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("farmer.profileDesc")}</p>
      </div>

      {/* Profile hero card */}
      <Card className="overflow-hidden border border-gray-200">
        {/* Banner */}
        <div className="h-36">
          {bannerImage ? (
            <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-emerald-600 to-green-500" />
          )}
        </div>

        <CardContent className="pt-0 pb-5 px-6">
          {/* Avatar + button row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <Avatar className="w-24 h-24 border-4 border-white shadow-md ring-2 ring-emerald-100">
              <AvatarImage src={user?.image} alt={user?.name || t("farmer.farmer")} />
              <AvatarFallback className="bg-emerald-600 text-white text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <Button variant="outline" size="sm" onClick={() => router.push("/farmer/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                {t("farmer.editProfile")}
              </Button>
            </div>
          </div>

          {/* Name + role */}
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl font-bold text-gray-900">{user?.name || t("farmer.farmer")}</h2>
            <Badge variant="outline" className="capitalize text-xs font-medium">
              {user?.role || "farmer"}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mb-5">{locationStr || "Rwanda"}</p>

          {/* Info bar */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 pt-4 border-t border-gray-100">
            {user?.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                {user.email}
              </span>
            )}
            {locationStr && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                {locationStr}
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
                {t("farmer.joined")} {joinedDate}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

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
              {tabKey === "overview" ? t("farmer.overview") : t("farmer.activity")}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={PawPrint}
              value={stats.totalAnimals}
              label={t("farmer.totalAnimals")}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <StatCard
              icon={HeartPulse}
              value={stats.healthyAnimals}
              label={t("farmer.healthyAnimals")}
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
            <StatCard
              icon={Stethoscope}
              value={stats.totalConsultations}
              label={t("farmer.totalConsultations")}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
            />
            <StatCard
              icon={Award}
              value={stats.yearsActive}
              label={t("farmer.yearsActive")}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("farmer.personalInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label={t("farmer.fullName")} value={user?.name} />
                <InfoRow label={t("common.email")} value={user?.email} />
                <InfoRow label={t("common.phone")} value={user?.phone} />
                <InfoRow label={t("farmer.district")} value={user?.district} />
                <InfoRow label={t("farmer.sector")} value={user?.sector} />
                {user?.bio && <InfoRow label={t("farmer.bio")} value={user.bio} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("farmer.accountInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label={t("farmer.role")} value={<span className="capitalize">{user?.role}</span>} />
                <InfoRow
                  label={t("farmer.status")}
                  value={
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 capitalize text-xs">
                      {user?.status || "active"}
                    </Badge>
                  }
                />
                <InfoRow label={t("farmer.joined")} value={joinedDate} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Activity */}
      {tab === "activity" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("farmer.activityTimeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="font-medium text-gray-600">{t("farmer.noActivityYet")}</p>
                <p className="text-sm text-gray-400 mt-1">{t("farmer.activityDesc")}</p>
              </div>
            ) : (
              <ActivityTimeline activity={activity} t={t} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
