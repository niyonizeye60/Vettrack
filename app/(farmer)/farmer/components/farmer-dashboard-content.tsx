"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import AnnouncementsBanner from "@/components/ui/announcements-banner"

import {
  PlusCircle, Calendar, FileText, Activity,
  MilkIcon as Cow, CheckCircle, XCircle, AlertCircle, ArrowRight, FileBarChart,
  ShieldAlert, Baby, Bell, MessageSquare, LifeBuoy, Droplets, Heart, Eye,
} from "lucide-react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from "recharts"

interface FarmerDashboardContentProps {
  currentUser: { _id: string; name: string; role: string }
  animals: any[]
  consultations: any[]
}

interface PnlSnapshot { income: number; expense: number; net: number }
interface DiseaseStats { active: number; underTreatment: number }
interface BirthStats { upcomingCount: number; nextDate: string | null; nextAnimal: string | null }
interface InboxStats { unreadNotifications: number; unreadMessages: number; openTickets: number }
interface MilkTrendPoint { date: string; liters: number }
interface PnlTrendPoint { month: string; income: number; expense: number }
interface TrackingSummary {
  hasConfig: boolean
  latestBpm: number | null
  latestTemp: number | null
  series: { time: string; bpm: number }[]
}

function getBpmStatus(bpm: number | null, t: (key: string) => string) {
  if (bpm === null || bpm === 0) return { label: t("farmer.noData"), color: "#9CA3AF" }
  if (bpm < 60) return { label: t("farmer.low"), color: "#3B82F6" }
  if (bpm <= 100) return { label: t("farmer.normal"), color: "#10B981" }
  if (bpm <= 130) return { label: t("farmer.elevated"), color: "#F59E0B" }
  return { label: t("farmer.high"), color: "#EF4444" }
}

export default function FarmerDashboardContent({
  currentUser,
  animals,
  consultations,
}: FarmerDashboardContentProps) {
  const { t } = useLanguage()
  const [pnl, setPnl] = useState<PnlSnapshot | null>(null)
  const [pnlLoading, setPnlLoading] = useState(true)
  const [diseaseStats, setDiseaseStats] = useState<DiseaseStats | null>(null)
  const [birthStats, setBirthStats] = useState<BirthStats | null>(null)
  const [inboxStats, setInboxStats] = useState<InboxStats | null>(null)
  const [milkTrend, setMilkTrend] = useState<MilkTrendPoint[] | null>(null)
  const [pnlTrend, setPnlTrend] = useState<PnlTrendPoint[] | null>(null)
  const [trackingSummary, setTrackingSummary] = useState<TrackingSummary | null>(null)
  const [activeCalfCount, setActiveCalfCount] = useState<number | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)

  useEffect(() => {
    async function fetchPnl() {
      try {
        const now = new Date()
        const pad = (n: number) => String(n).padStart(2, "0")
        const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`
        const res = await fetch(`/api/reports/general?farmerId=${currentUser._id}&startDate=${start}&endDate=${end}`)
        const data = await res.json()
        if (!data.error) setPnl({ income: data.income.total, expense: data.expenses.total, net: data.netResult })
      } catch {
        setPnl(null)
      } finally {
        setPnlLoading(false)
      }
    }
    fetchPnl()
  }, [currentUser._id])

  useEffect(() => {
    async function fetchExtras() {
      const [diseaseRes, inseminationRes, notifRes, convRes, ticketRes] = await Promise.allSettled([
        fetch(`/api/diseases?farmerId=${currentUser._id}`),
        fetch(`/api/insemination?farmerId=${currentUser._id}`),
        fetch(`/api/notifications?userId=${currentUser._id}&role=farmer`),
        fetch(`/api/chat/conversations`),
        fetch(`/api/support/tickets`),
      ])

      if (diseaseRes.status === "fulfilled" && diseaseRes.value.ok) {
        try {
          const records = await diseaseRes.value.json()
          if (Array.isArray(records)) {
            setDiseaseStats({
              active: records.filter((r: any) => r.status === "Active").length,
              underTreatment: records.filter((r: any) => r.status === "Under Treatment").length,
            })
          }
        } catch { /* leave diseaseStats null */ }
      }

      if (inseminationRes.status === "fulfilled" && inseminationRes.value.ok) {
        try {
          const records = await inseminationRes.value.json()
          if (Array.isArray(records)) {
            const now = new Date()
            const future = records
              .filter((r: any) => r.expectedBirthDate && new Date(r.expectedBirthDate) >= now)
              .sort((a: any, b: any) => new Date(a.expectedBirthDate).getTime() - new Date(b.expectedBirthDate).getTime())
            setBirthStats({
              upcomingCount: future.length,
              nextDate: future[0]?.expectedBirthDate ?? null,
              nextAnimal: future[0]?.animalName ?? null,
            })
          }
        } catch { /* leave birthStats null */ }
      }

      let unreadNotifications = 0
      if (notifRes.status === "fulfilled" && notifRes.value.ok) {
        try {
          const data = await notifRes.value.json()
          if (data.success && Array.isArray(data.notifications)) {
            unreadNotifications = data.notifications.filter((n: any) => !n.read).length
          }
        } catch { /* default to 0 */ }
      }

      let unreadMessages = 0
      if (convRes.status === "fulfilled" && convRes.value.ok) {
        try {
          const data = await convRes.value.json()
          if (Array.isArray(data.conversations)) {
            unreadMessages = data.conversations.reduce((s: number, c: any) => s + (c.unreadCount || 0), 0)
          }
        } catch { /* default to 0 */ }
      }

      let openTickets = 0
      if (ticketRes.status === "fulfilled" && ticketRes.value.ok) {
        try {
          const data = await ticketRes.value.json()
          if (Array.isArray(data.tickets)) {
            openTickets = data.tickets.filter((t: any) => t.status !== "resolved").length
          }
        } catch { /* default to 0 */ }
      }

      setInboxStats({ unreadNotifications, unreadMessages, openTickets })
    }
    fetchExtras()
  }, [currentUser._id])

  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0")

    async function fetchMilkTrend() {
      try {
        const since = new Date()
        since.setDate(since.getDate() - 20)
        const startDate = `${since.getFullYear()}-${pad(since.getMonth() + 1)}-${pad(since.getDate())}`
        const res = await fetch(`/api/milk?farmerId=${currentUser._id}&startDate=${startDate}`)
        if (!res.ok) return
        const records = await res.json()
        if (!Array.isArray(records)) return
        const byDate: Record<string, number> = {}
        records.forEach((r: any) => { byDate[r.date] = (byDate[r.date] || 0) + (r.liters || 0) })
        const series = Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-14)
          .map(([date, liters]) => ({ date: date.slice(5), liters: Math.round(liters * 10) / 10 }))
        setMilkTrend(series)
      } catch {
        setMilkTrend([])
      }
    }

    async function fetchPnlTrend() {
      try {
        const now = new Date()
        const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1))
        const results = await Promise.all(months.map(async (d) => {
          const label = d.toLocaleDateString(undefined, { month: "short" })
          try {
            const start = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
            const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
            const end = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(lastDay)}`
            const res = await fetch(`/api/reports/general?farmerId=${currentUser._id}&startDate=${start}&endDate=${end}`)
            const data = await res.json()
            if (!data.error) return { month: label, income: data.income.total, expense: data.expenses.total }
          } catch { /* fall through to zeroed point */ }
          return { month: label, income: 0, expense: 0 }
        }))
        setPnlTrend(results)
      } catch {
        setPnlTrend([])
      }
    }

    fetchMilkTrend()
    fetchPnlTrend()
  }, [currentUser._id])

  useEffect(() => {
    async function fetchTracking() {
      try {
        const configRes = await fetch(`/api/tracking-config?role=farmer`)
        const configData = await configRes.json()
        const channelId = configData?.config?.channelId

        if (!channelId) {
          setTrackingSummary({ hasConfig: false, latestBpm: null, latestTemp: null, series: [] })
          return
        }

        const feedRes = await fetch(`/api/thingspeak?channelId=${channelId}&results=20`)
        if (!feedRes.ok) {
          setTrackingSummary({ hasConfig: true, latestBpm: null, latestTemp: null, series: [] })
          return
        }
        const feedData = await feedRes.json()
        const feeds = Array.isArray(feedData?.feeds) ? feedData.feeds : []
        const series = feeds.map((f: any) => ({
          time: new Date(f.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          bpm: Number.parseFloat(f.field1) || 0,
        }))
        const latest = feeds[feeds.length - 1]
        const latestBpm = latest ? Number.parseFloat(latest.field1) || 0 : null
        const latestTempRaw = latest?.field4 != null ? Number.parseFloat(latest.field4) : NaN
        const latestTemp = !Number.isNaN(latestTempRaw) ? latestTempRaw : null

        setTrackingSummary({ hasConfig: true, latestBpm, latestTemp, series })
      } catch {
        setTrackingSummary({ hasConfig: false, latestBpm: null, latestTemp: null, series: [] })
      }
    }
    fetchTracking()
  }, [currentUser._id])

  useEffect(() => {
    async function fetchCalfCount() {
      try {
        const res = await fetch(`/api/calves?farmerId=${currentUser._id}`)
        if (!res.ok) return setActiveCalfCount(0)
        const records = await res.json()
        setActiveCalfCount(Array.isArray(records) ? records.filter((c: any) => c.status === "active").length : 0)
      } catch {
        setActiveCalfCount(0)
      }
    }
    fetchCalfCount()
  }, [currentUser._id])

  const totalAnimals = animals.filter((a) => a.status !== "Deceased").length
  const healthyAnimals = animals.filter((a) => a.status === "Healthy").length
  const cows = animals.filter((a) => (a.type || "").toLowerCase() === "cow" && a.gender === "female")
  const lactatingCowCount = cows.filter((a) => a.lactationStatus === "lactating").length
  const dryCowCount = cows.filter((a) => a.lactationStatus !== "lactating").length
  const farmStatusData = [
    { name: t("farmer.lactatingCows"), value: lactatingCowCount, color: "#2a78d6" },
    { name: t("farmer.dryCows"), value: dryCowCount, color: "#eb6834" },
    { name: t("farmer.calves"), value: activeCalfCount ?? 0, color: "#1baf7a" },
  ]
  const pendingRequests = consultations.filter((c) => c.status === "pending")
  const acceptedConsultations = consultations.filter((c) => c.status === "accepted")
  const rejectedConsultations = consultations.filter((c) => c.status === "rejected")

  type AnimalActivity = { type: "animal"; name: string; date: string; id: string; raw: any }
  type ConsultationActivity = { type: "consultation"; service: string; date: string; id: string; status: string; doctor: string; raw: any }
  type ActivityItem = AnimalActivity | ConsultationActivity

  const recentAnimals: AnimalActivity[] = animals
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map((animal) => ({ type: "animal" as const, name: animal.name, date: new Date(animal.createdAt).toLocaleDateString(), id: animal._id, raw: animal }))

  const recentConsultations: ConsultationActivity[] = consultations
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map((c) => ({ type: "consultation" as const, service: c.service, date: new Date(c.createdAt).toLocaleDateString(), id: c._id, status: c.status, doctor: c.doctor, raw: c }))

  const recentActivity: ActivityItem[] = [...recentAnimals, ...recentConsultations]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  const bpmStatus = getBpmStatus(trackingSummary?.latestBpm ?? null, t)

  return (
    <div className="p-4 sm:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Announcements */}
        <AnnouncementsBanner />

        {/* Greeting */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {currentUser.name}
          </h1>
          <p className="text-green-600 font-medium text-sm mt-1">{t("farmer.farmer")}</p>
          <p className="text-gray-400 text-xs mt-0.5">{today}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t("farmer.animals")}</p>
                <Cow className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{totalAnimals}</h3>
              <p className="text-xs text-gray-400 mt-1">
                {totalAnimals > 0 ? `${healthyAnimals} ${t("farmer.healthyAnimals")}` : t("farmer.registered")}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t("farmer.pending")}</p>
                <AlertCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-orange-600 mt-2">{pendingRequests.length}</h3>
              <p className="text-xs text-gray-400 mt-1">{t("farmer.awaiting")}</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t("farmer.accepted")}</p>
                <CheckCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-green-600 mt-2">{acceptedConsultations.length}</h3>
              <p className="text-xs text-gray-400 mt-1">{t("farmer.confirmed")}</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t("farmer.rejected")}</p>
                <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-blue-600 mt-2">{rejectedConsultations.length}</h3>
              <p className="text-xs text-gray-400 mt-1">{t("farmer.declined")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Farm status overview */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Cow className="h-4 w-4 text-green-600" />
              {t("farmer.farmStatusOverview")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {activeCalfCount === null ? (
              <div className="h-[240px] rounded-lg bg-gray-100 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={farmStatusData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                  <Tooltip formatter={(v: any) => [v, t("farmer.count")]} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={90}>
                    <LabelList dataKey="value" position="top" style={{ fontSize: 13, fontWeight: 600, fill: "#374151" }} />
                    {farmStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Health alerts */}
        {diseaseStats && (diseaseStats.active > 0 || diseaseStats.underTreatment > 0) && (
          <Card className="border-red-200 bg-red-50 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-red-100 flex-shrink-0">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800">{t("farmer.healthAlerts")}</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {diseaseStats.active > 0 && `${diseaseStats.active} ${t("farmer.needsAttention")}`}
                      {diseaseStats.active > 0 && diseaseStats.underTreatment > 0 && " · "}
                      {diseaseStats.underTreatment > 0 && `${diseaseStats.underTreatment} ${t("farmer.inTreatment")}`}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 flex-shrink-0">
                  <Link href="/farmer/diseases" className="flex items-center gap-1">
                    {t("farmer.viewDetails")} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming births */}
        {birthStats && birthStats.upcomingCount > 0 && (
          <Card className="border-sky-200 bg-sky-50 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-sky-100 flex-shrink-0">
                    <Baby className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sky-800">{t("farmer.upcomingBirths")}</p>
                    <p className="text-xs text-sky-600 mt-0.5">
                      {birthStats.upcomingCount} {t("farmer.upcoming")}
                      {birthStats.nextDate && (
                        <>
                          {" · "}{t("farmer.nextExpected")}: {new Date(birthStats.nextDate).toLocaleDateString()}
                          {birthStats.nextAnimal && ` (${birthStats.nextAnimal})`}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="border-sky-300 text-sky-700 hover:bg-sky-100 flex-shrink-0">
                  <Link href="/farmer/insemination" className="flex items-center gap-1">
                    {t("farmer.viewDetails")} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inbox strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/farmer/notifications"
            className="flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-green-600 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg p-2 bg-amber-50 flex-shrink-0">
                <Bell className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{t("farmer.notifications")}</p>
                <p className="text-xs text-gray-400">{t("farmer.unread")}</p>
              </div>
            </div>
            {!!inboxStats?.unreadNotifications && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white flex-shrink-0">{inboxStats.unreadNotifications}</Badge>
            )}
          </Link>

          <Link
            href="/farmer/messages"
            className="flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-green-600 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg p-2 bg-sky-50 flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-sky-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{t("farmer.messages")}</p>
                <p className="text-xs text-gray-400">{t("farmer.unread")}</p>
              </div>
            </div>
            {!!inboxStats?.unreadMessages && (
              <Badge className="bg-sky-500 hover:bg-sky-500 text-white flex-shrink-0">{inboxStats.unreadMessages}</Badge>
            )}
          </Link>

          <Link
            href="/farmer/support"
            className="flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-green-600 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg p-2 bg-violet-50 flex-shrink-0">
                <LifeBuoy className="h-4 w-4 text-violet-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{t("farmer.support")}</p>
                <p className="text-xs text-gray-400">{t("farmer.open")}</p>
              </div>
            </div>
            {!!inboxStats?.openTickets && (
              <Badge className="bg-violet-500 hover:bg-violet-500 text-white flex-shrink-0">{inboxStats.openTickets}</Badge>
            )}
          </Link>
        </div>

        {/* Net Profit/Loss widget */}
        {pnlLoading ? (
          <div className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-40" />
            <div className="h-8 bg-gray-200 rounded w-32 mt-3" />
            <div className="h-2 bg-gray-200 rounded w-full mt-4" />
          </div>
        ) : pnl && (
          <Card className={`border shadow-sm ${pnl.net > 0 ? "border-green-200 bg-green-50" : pnl.net < 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{t("farmer.thisMonthResult")}</p>
                  <h3 className={`text-2xl sm:text-3xl font-bold mt-1 ${pnl.net > 0 ? "text-green-700" : pnl.net < 0 ? "text-red-700" : "text-gray-700"}`}>
                    {pnl.net < 0 ? `(RWF ${Math.abs(Math.round(pnl.net)).toLocaleString()})` : `RWF ${Math.round(pnl.net).toLocaleString()}`}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-2 rounded-full bg-white overflow-hidden min-w-[80px] max-w-[160px]">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (pnl.income / Math.max(pnl.income, pnl.expense, 1)) * 100)}%` }} />
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-white overflow-hidden min-w-[80px] max-w-[160px]">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (pnl.expense / Math.max(pnl.income, pnl.expense, 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
                <Button asChild variant="outline" className="rounded-lg gap-2 border-gray-200 hover:border-green-600 hover:text-green-700 flex-shrink-0">
                  <Link href="/farmer/reports">
                    <FileBarChart className="h-4 w-4" />
                    {t("farmer.viewFullReport")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white h-auto py-3 px-4 justify-between">
            <Link href="/farmer/animals?action=add" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">{t("farmer.registerAnimal")}</p>
                  <p className="text-xs text-green-100">{t("farmer.addNewLivestock")}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto py-3 px-4 border-gray-200 hover:border-green-600 hover:text-green-700 justify-between">
            <Link href="/farmer/consultations?action=add" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">{t("farmer.bookConsultation")}</p>
                  <p className="text-xs text-gray-400">{t("farmer.scheduleVisit")}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto py-3 px-4 border-gray-200 hover:border-green-600 hover:text-green-700 justify-between">
            <Link href="/farmer/consultations" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">{t("farmer.viewConsultations")}</p>
                  <p className="text-xs text-gray-400">{t("farmer.manageBookings")}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </Link>
          </Button>
        </div>

        {/* Recent activity + trend charts — uniform 2x2 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  {t("farmer.recentActivity")}
                </div>
                <Badge variant="secondary" className="text-xs">{recentActivity.length} {t("farmer.items")}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentActivity.length > 0 ? (
                <div className="h-[260px] overflow-y-auto pr-1 space-y-2">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`mt-0.5 rounded-lg p-2 flex-shrink-0 ${activity.type === "animal" ? "bg-green-50" : "bg-sky-50"}`}>
                        {activity.type === "animal"
                          ? <Cow className="h-4 w-4 text-green-600" />
                          : <Calendar className="h-4 w-4 text-sky-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {activity.type === "animal" ? (
                          <>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {t("farmer.animalRegistered")} <span className="text-green-600">{activity.name}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{t("farmer.addedOn")} {activity.date}</p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                <span className="text-sky-700">{activity.service}</span> {t("farmer.consultation")}
                              </p>
                              <Badge
                                variant="outline"
                                className={`text-xs shrink-0 ${
                                  activity.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : activity.status === "accepted" ? "bg-green-50 text-green-700 border-green-200"
                                  : activity.status === "rejected" ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-sky-50 text-sky-700 border-sky-200"
                                }`}
                              >
                                {activity.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              {activity.doctor && `Dr. ${activity.doctor} · `}{t("farmer.bookedOn")} {activity.date}
                            </p>
                          </>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0 text-gray-400 hover:text-green-700 hover:bg-green-50"
                        aria-label={t("farmer.viewDetails")}
                        onClick={() => setSelectedActivity(activity)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[260px] flex flex-col items-center justify-center text-center">
                  <Activity className="h-9 w-9 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-600">{t("farmer.noRecentActivity")}</p>
                  <p className="text-xs text-gray-400 mt-1">{t("farmer.farmActivitiesAppear")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Milk production trend */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Droplets className="h-4 w-4 text-green-600" />
                {t("farmer.dailyProductionTrend")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {milkTrend === null ? (
                <div className="h-[260px] rounded-lg bg-gray-100 animate-pulse" />
              ) : milkTrend.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-center">
                  <Droplets className="h-9 w-9 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-600">{t("farmer.noDataAvailable")}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={milkTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`${v}L`, "Liters"]} />
                    <Bar dataKey="liters" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Income vs expense trend */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <FileBarChart className="h-4 w-4 text-green-600" />
                {t("farmer.incomeExpenseTrend")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {pnlTrend === null ? (
                <div className="h-[260px] rounded-lg bg-gray-100 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pnlTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`RWF ${Number(v).toLocaleString()}`, ""]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" fill="#16a34a" name={t("farmer.income")} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#dc2626" name={t("farmer.expensesHeader")} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Live tracking */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-green-600" />
                  {t("farmer.liveTracking")}
                </div>
                {trackingSummary?.hasConfig && trackingSummary.latestBpm !== null && (
                  <Badge variant="outline" className="text-xs" style={{ borderColor: bpmStatus.color, color: bpmStatus.color }}>
                    {bpmStatus.label}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {trackingSummary === null ? (
                <div className="h-[260px] rounded-lg bg-gray-100 animate-pulse" />
              ) : !trackingSummary.hasConfig ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-center">
                  <Heart className="h-9 w-9 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-600">{t("farmer.noTrackingDevice")}</p>
                  <Button asChild size="sm" variant="outline" className="mt-3 border-gray-200 hover:border-green-600 hover:text-green-700">
                    <Link href="/farmer/tracking">{t("farmer.setUpTracking")}</Link>
                  </Button>
                </div>
              ) : trackingSummary.series.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-center">
                  <Heart className="h-9 w-9 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-600">{t("farmer.noDataAvailable")}</p>
                </div>
              ) : (
                <div className="h-[260px] flex flex-col">
                  <div className="flex items-center gap-6 mb-2 flex-shrink-0">
                    <p className="text-2xl font-bold text-gray-900">
                      {trackingSummary.latestBpm} <span className="text-sm font-normal text-gray-400">BPM</span>
                    </p>
                    {trackingSummary.latestTemp !== null && (
                      <p className="text-2xl font-bold text-gray-900">
                        {trackingSummary.latestTemp}° <span className="text-sm font-normal text-gray-400">C</span>
                      </p>
                    )}
                  </div>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trackingSummary.series}>
                        <Tooltip formatter={(v: any) => [`${v} BPM`, ""]} labelFormatter={() => ""} />
                        <Line type="monotone" dataKey="bpm" stroke={bpmStatus.color} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full mt-2 flex-shrink-0 border-gray-200 hover:border-green-600 hover:text-green-700">
                    <Link href="/farmer/tracking" className="flex items-center justify-center gap-1">
                      {t("farmer.viewDetails")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Activity details dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedActivity?.type === "animal" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Cow className="h-5 w-5 text-green-600" />
                  {selectedActivity.raw.name}
                </DialogTitle>
              </DialogHeader>
              <div className="text-sm divide-y divide-gray-100">
                <div className="flex justify-between items-start gap-4 py-2">
                  <span className="text-gray-500">{t("farmer.type")}</span>
                  <span className="font-medium text-gray-900 text-right">{selectedActivity.raw.type || "—"}</span>
                </div>
                {selectedActivity.raw.breed && (
                  <div className="flex justify-between items-start gap-4 py-2">
                    <span className="text-gray-500">{t("farmer.breed")}</span>
                    <span className="font-medium text-gray-900 text-right">{selectedActivity.raw.breed}</span>
                  </div>
                )}
                <div className="flex justify-between items-start gap-4 py-2">
                  <span className="text-gray-500">{t("farmer.status")}</span>
                  <Badge
                    variant="outline"
                    className={selectedActivity.raw.status === "Healthy" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}
                  >
                    {selectedActivity.raw.status || "—"}
                  </Badge>
                </div>
                {selectedActivity.raw.gender && (
                  <div className="flex justify-between items-start gap-4 py-2">
                    <span className="text-gray-500">{t("farmer.gender")}</span>
                    <span className="font-medium text-gray-900 text-right">{selectedActivity.raw.gender}</span>
                  </div>
                )}
                {selectedActivity.raw.earTagId && (
                  <div className="flex justify-between items-start gap-4 py-2">
                    <span className="text-gray-500">{t("farmer.earTagId")}</span>
                    <span className="font-medium text-gray-900 text-right">{selectedActivity.raw.earTagId}</span>
                  </div>
                )}
                {selectedActivity.raw.insuranceId && (
                  <div className="flex justify-between items-start gap-4 py-2">
                    <span className="text-gray-500">{t("farmer.insuranceId")}</span>
                    <span className="font-medium text-gray-900 text-right">{selectedActivity.raw.insuranceId}</span>
                  </div>
                )}
                <div className="flex justify-between items-start gap-4 py-2">
                  <span className="text-gray-500">{t("farmer.addedOn")}</span>
                  <span className="font-medium text-gray-900 text-right">{selectedActivity.date}</span>
                </div>
              </div>
            </>
          ) : selectedActivity?.type === "consultation" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-sky-600" />
                  {selectedActivity.raw.service}
                </DialogTitle>
              </DialogHeader>
              <div className="text-sm divide-y divide-gray-100">
                <div className="flex justify-between items-start gap-4 py-2">
                  <span className="text-gray-500">{t("farmer.status")}</span>
                  <Badge
                    variant="outline"
                    className={
                      selectedActivity.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200"
                      : selectedActivity.status === "accepted" ? "bg-green-50 text-green-700 border-green-200"
                      : selectedActivity.status === "rejected" ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-sky-50 text-sky-700 border-sky-200"
                    }
                  >
                    {selectedActivity.status}
                  </Badge>
                </div>
                {selectedActivity.doctor && (
                  <div className="flex justify-between items-start gap-4 py-2">
                    <span className="text-gray-500">{t("farmer.doctor")}</span>
                    <span className="font-medium text-gray-900 text-right">Dr. {selectedActivity.doctor}</span>
                  </div>
                )}
                {selectedActivity.raw.animalName && (
                  <div className="flex justify-between items-start gap-4 py-2">
                    <span className="text-gray-500">{t("farmer.animal")}</span>
                    <span className="font-medium text-gray-900 text-right">{selectedActivity.raw.animalName}</span>
                  </div>
                )}
                {selectedActivity.raw.date && (
                  <div className="flex justify-between items-start gap-4 py-2">
                    <span className="text-gray-500">{t("farmer.date")}</span>
                    <span className="font-medium text-gray-900 text-right">{selectedActivity.raw.date}</span>
                  </div>
                )}
                {selectedActivity.raw.time && (
                  <div className="flex justify-between items-start gap-4 py-2">
                    <span className="text-gray-500">{t("farmer.time")}</span>
                    <span className="font-medium text-gray-900 text-right">{selectedActivity.raw.time}</span>
                  </div>
                )}
                {selectedActivity.raw.feedback && (
                  <div className="flex justify-between items-start gap-4 py-2">
                    <span className="text-gray-500">{t("farmer.feedback")}</span>
                    <span className="font-medium text-gray-900 text-right">{selectedActivity.raw.feedback}</span>
                  </div>
                )}
                <div className="flex justify-between items-start gap-4 py-2">
                  <span className="text-gray-500">{t("farmer.bookedOn")}</span>
                  <span className="font-medium text-gray-900 text-right">{selectedActivity.date}</span>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
