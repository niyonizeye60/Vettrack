"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/auth"
import { useLanguage } from "@/contexts/LanguageContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Settings, Mail, MapPin, Phone, Calendar, Users, UserCheck, MessageSquare, Award } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Stats {
  totalUsers: number
  activeUsers: number
  supportTickets: number
  yearsActive: number
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

export default function AdminProfilePage() {
  const { t } = useLanguage()
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bannerImage, setBannerImage] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, activeUsers: 0, supportTickets: 0, yearsActive: 0 })

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

          const dashboardRes = await fetch("/api/admin-dashboard").then((r) => r.json()).catch(() => ({}))

          setStats({
            totalUsers: dashboardRes.stats?.totalUsers ?? 0,
            activeUsers: dashboardRes.stats?.activeUsers ?? 0,
            supportTickets: dashboardRes.stats?.supportTickets ?? 0,
            yearsActive,
          })
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
    : "A"

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt as string).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null

  const locationStr = [user?.district, user?.sector].filter(Boolean).join(", ")

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
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
        <Link href="/admin" className="hover:text-gray-700 transition-colors">
          {t("admin.dashboard")}
        </Link>
        <span className="text-gray-300">›</span>
        <span className="text-gray-900 font-medium">{t("admin.profile")}</span>
      </nav>

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("admin.profile")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("admin.profileDesc")}</p>
      </div>

      {/* Profile hero card */}
      <Card className="overflow-hidden border border-gray-200">
        {/* Banner */}
        <div className="h-36">
          {bannerImage ? (
            <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-green-600 to-green-500" />
          )}
        </div>

        <CardContent className="pt-0 pb-5 px-6">
          {/* Avatar + button row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <Avatar className="w-24 h-24 border-4 border-white shadow-md ring-2 ring-green-100">
              <AvatarImage src={user?.image} alt={user?.name || t("admin.adminUser")} />
              <AvatarFallback className="bg-green-100 text-green-600 text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <Button variant="outline" size="sm" onClick={() => router.push("/admin/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                {t("admin.editProfile")}
              </Button>
            </div>
          </div>

          {/* Name + role */}
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl font-bold text-gray-900">{user?.name || t("admin.adminUser")}</h2>
            <Badge variant="outline" className="capitalize text-xs font-medium">
              {user?.role || "admin"}
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
                {t("admin.joined")} {joinedDate}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overview */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            value={stats.totalUsers}
            label={t("admin.regionalUsers")}
            valueColor="text-gray-900"
          />
          <StatCard
            icon={UserCheck}
            value={stats.activeUsers}
            label={t("admin.activeUsers")}
            valueColor="text-green-600"
          />
          <StatCard
            icon={MessageSquare}
            value={stats.supportTickets}
            label={t("admin.supportTickets")}
            valueColor="text-orange-600"
          />
          <StatCard
            icon={Award}
            value={stats.yearsActive}
            label={t("admin.yearsActive")}
            valueColor="text-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.personalInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label={t("admin.fullName")} value={user?.name} />
              <InfoRow label={t("common.email")} value={user?.email} />
              <InfoRow label={t("common.phone")} value={user?.phone} />
              <InfoRow label={t("admin.district")} value={user?.district} />
              {user?.sector && <InfoRow label={t("admin.sector")} value={user.sector} />}
              {user?.bio && <InfoRow label={t("admin.bio")} value={user.bio} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.accountInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label={t("admin.role")} value={<span className="capitalize">{user?.role}</span>} />
              <InfoRow
                label={t("admin.status")}
                value={
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 capitalize text-xs">
                    {user?.status || "active"}
                  </Badge>
                }
              />
              <InfoRow label={t("admin.joined")} value={joinedDate} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
