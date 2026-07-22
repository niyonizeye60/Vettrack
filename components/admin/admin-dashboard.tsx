"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Users, FileText, Calendar, MessageSquare, TrendingUp, AlertCircle, Plus, ArrowRight, Mail, Phone, MapPin, BadgeCheck } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import AnnouncementsBanner from "@/components/ui/announcements-banner"
import { Skeleton } from "@/components/ui/skeleton"

type UserDetail = {
  _id: string
  name: string
  email: string
  phone?: string
  role: "farmer" | "doctor"
  status: string
  district?: string
  sector?: string
  licenseNumber?: string
  specialization?: string
  createdAt: string
}

type DashboardData = {
  stats: {
    totalUsers: number
    activeUsers: number
    growthPercentage: number
    consultations: number
    supportTickets: number
    contentItems: number
  }
  recentAlerts: Array<{
    id: string
    type: string
    title: string
    description: string
    priority: string
    createdAt: string
  }>
  performance: {
    userSatisfaction: number
    responseTime: string
    resolutionRate: number
  }
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { t } = useLanguage()

  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [viewingUser, setViewingUser] = useState<UserDetail | null>(null)
  const [userDetailLoading, setUserDetailLoading] = useState(false)
  const [userDetailError, setUserDetailError] = useState("")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (!viewingUserId) return
    setUserDetailLoading(true)
    setUserDetailError("")
    setViewingUser(null)
    fetch(`/api/admin-users/${viewingUserId}`)
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (ok) setViewingUser(json.user)
        else setUserDetailError(json.error || t('admin.failedToFetchData'))
      })
      .catch(() => setUserDetailError(t('admin.failedToFetchData')))
      .finally(() => setUserDetailLoading(false))
  }, [viewingUserId, t])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "suspended": return "bg-red-100 text-red-800"
      case "pending_verification": return "bg-yellow-100 text-yellow-800"
      case "rejected": return "bg-gray-200 text-gray-700"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return t('admin.active')
      case "suspended": return t('admin.suspended')
      case "pending_verification": return t('admin.pendingVerification')
      case "rejected": return t('admin.rejected')
      default: return status
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin-dashboard')
      const result = await response.json()
      
      if (response.ok) {
        setData(result)
      } else {
        setError(result.error || t('admin.failedToFetchData'))
      }
    } catch (error) {
      setError(t('admin.failedToFetchData'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
              <Skeleton className="h-9 w-full mt-4" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-gray-200 shadow-sm">
              <CardContent className="p-6 space-y-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || t('admin.noDataAvailable')}</p>
        <Button onClick={fetchDashboardData} className="mt-4">
          {t('admin.retry')}
        </Button>
      </div>
    )
  }
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="space-y-6">
      {/* System Announcements */}
      <AnnouncementsBanner />

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{t('admin.welcomeBack')}</h1>
          <p className="text-green-600 font-medium text-sm mt-1">{t('admin.happeningToday')}</p>
          <p className="text-gray-400 text-xs mt-0.5">{today}</p>
        </div>
        <Button asChild>
          <Link href="/admin/users">
            <Plus className="h-4 w-4 mr-2" />
            {t('admin.addNewUser')}
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('admin.regionalUsers')}</p>
              <Users className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{data.stats.totalUsers}</h3>
            <p className="text-xs text-gray-400 mt-1">+{data.stats.growthPercentage}% {t('admin.fromLastMonth')}</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('admin.activeUsers')}</p>
              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-green-600 mt-2">{data.stats.activeUsers}</h3>
            <p className="text-xs text-gray-400 mt-1">{data.stats.totalUsers - data.stats.activeUsers} {t('admin.inactive')}</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('admin.supportTickets')}</p>
              <MessageSquare className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-orange-600 mt-2">{data.stats.supportTickets}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('admin.allResolved')}</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('admin.newRegistrations')}</p>
              <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-blue-600 mt-2">{data.recentAlerts.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('admin.last24Hours')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                {t('admin.recentAlerts')}
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/support">
                  {t('admin.viewAll')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentAlerts.length > 0 ? (
                data.recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-blue-800">{alert.title}</p>
                      <p className="text-xs text-blue-600 mt-1">{alert.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200"
                      onClick={() => setViewingUserId(alert.id)}
                    >
                      {t('admin.view')}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>{t('admin.noRecentAlerts')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <TrendingUp className="h-4 w-4 text-green-600" />
              {t('admin.performance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">{t('admin.userSatisfaction')}</span>
                  <span className="text-sm font-medium text-green-600">{data.performance.userSatisfaction}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: `${data.performance.userSatisfaction}%`}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">{t('admin.responseTime')}</span>
                  <span className="text-sm font-medium text-blue-600">{data.performance.responseTime}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '85%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">{t('admin.resolutionRate')}</span>
                  <span className="text-sm font-medium text-green-600">{data.performance.resolutionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: `${data.performance.resolutionRate}%`}}></div>
                </div>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline" asChild>
              <Link href="/admin/reports">
                {t('admin.viewDetailedReports')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
          <CardContent className="p-6">
            <Link href="/admin/users" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <Users className="h-8 w-8 text-green-600 mb-2" />
                  <h3 className="font-medium text-gray-900">{t('admin.manageUsers')}</h3>
                  <p className="text-sm text-gray-500">{t('admin.addEditSuspendUsers')}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
          <CardContent className="p-6">
            <Link href="/admin/appointments" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <Calendar className="h-8 w-8 text-green-600 mb-2" />
                  <h3 className="font-medium text-gray-900">{t('admin.appointments')}</h3>
                  <p className="text-sm text-gray-500">{t('admin.scheduleManageVisits')}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
          <CardContent className="p-6">
            <Link href="/admin/support" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <MessageSquare className="h-8 w-8 text-orange-600 mb-2" />
                  <h3 className="font-medium text-gray-900">{t('admin.support')}</h3>
                  <p className="text-sm text-gray-500">{t('admin.handleTicketsIssues')}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
          <CardContent className="p-6">
            <Link href="/admin/content" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <FileText className="h-8 w-8 text-purple-600 mb-2" />
                  <h3 className="font-medium text-gray-900">{t('admin.content')}</h3>
                  <p className="text-sm text-gray-500">{t('admin.managePostsServices')}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!viewingUserId} onOpenChange={(open) => !open && setViewingUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.userDetails')}</DialogTitle>
          </DialogHeader>
          {userDetailLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ) : userDetailError ? (
            <p className="text-sm text-red-600 py-6 text-center">{userDetailError}</p>
          ) : viewingUser ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{viewingUser.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{viewingUser.role === 'doctor' ? t('admin.doctor') : t('admin.farmer')}</p>
                </div>
                <Badge className={getStatusColor(viewingUser.status)}>
                  {getStatusLabel(viewingUser.status)}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {viewingUser.email}
                </div>
                {viewingUser.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {viewingUser.phone}
                  </div>
                )}
                {viewingUser.role === 'doctor' && viewingUser.specialization && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <BadgeCheck className="h-4 w-4 text-gray-400" />
                    {viewingUser.specialization}
                  </div>
                )}
              </div>

              {(viewingUser.district || viewingUser.sector) && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {t('admin.district')}
                    </p>
                    <p className="text-sm font-medium text-gray-900">{viewingUser.district || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('admin.sector')}</p>
                    <p className="text-sm font-medium text-gray-900">{viewingUser.sector || '-'}</p>
                  </div>
                </div>
              )}

              {viewingUser.role === 'doctor' && viewingUser.licenseNumber && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">{t('admin.licenseNumber')}</p>
                    <p className="text-sm font-medium text-gray-900">{viewingUser.licenseNumber}</p>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">{t('admin.registeredOn')}</p>
                <p className="text-sm font-medium text-gray-900">{new Date(viewingUser.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingUserId(null)}>{t('common.close')}</Button>
            <Button asChild>
              <Link href="/admin/users" onClick={() => setViewingUserId(null)}>
                {t('admin.manageInUsers')}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}