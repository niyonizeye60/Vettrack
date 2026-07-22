"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell, Check, Clock, RefreshCw, Loader2,
  AlertCircle, AlertTriangle, Info, Megaphone, UserX, UserPlus, CheckCircle,
  Calendar, Timer, BarChart3, TrendingDown, Target, FileText, Settings, Database, Shield, MessageSquare
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser } from "@/lib/actions/auth"
import { Skeleton } from "@/components/ui/skeleton"

interface Notification {
  _id: string
  id?: string
  title: string
  message: string
  type: string
  priority?: string
  read: boolean
  createdAt: string
  time?: string
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'urgent': return <AlertCircle className="h-4 w-4 text-red-500" />
    case 'warning': return <Clock className="h-4 w-4 text-yellow-500" />
    case 'doctor_unavailable': return <UserX className="h-4 w-4 text-orange-500" />
    case 'new_user': return <UserPlus className="h-4 w-4 text-green-500" />
    case 'consultation_status': return <CheckCircle className="h-4 w-4 text-blue-500" />
    case 'appointment_conflict': return <Calendar className="h-4 w-4 text-red-500" />
    case 'response_time': return <Timer className="h-4 w-4 text-yellow-500" />
    case 'daily_summary': return <BarChart3 className="h-4 w-4 text-purple-500" />
    case 'activity_anomaly': return <TrendingDown className="h-4 w-4 text-orange-500" />
    case 'quality_alert': return <Target className="h-4 w-4 text-red-500" />
    case 'policy_update': return <FileText className="h-4 w-4 text-blue-500" />
    case 'maintenance_scheduled': return <Settings className="h-4 w-4 text-gray-500" />
    case 'backup_status': return <Database className="h-4 w-4 text-green-500" />
    case 'compliance_deadline': return <Shield className="h-4 w-4 text-orange-500" />
    case 'support_ticket': return <MessageSquare className="h-4 w-4 text-blue-500" />
    case 'announcement': return <Megaphone className="h-4 w-4 text-violet-600" />
    default: return <Info className="h-4 w-4 text-blue-500" />
  }
}

function getTypeIconBg(type: string) {
  switch (type) {
    case 'urgent':
    case 'appointment_conflict':
    case 'quality_alert':
      return 'bg-red-100'
    case 'warning':
    case 'response_time':
      return 'bg-yellow-100'
    case 'doctor_unavailable':
    case 'activity_anomaly':
    case 'compliance_deadline':
      return 'bg-orange-100'
    case 'new_user':
    case 'backup_status':
      return 'bg-green-100'
    case 'consultation_status':
    case 'policy_update':
    case 'support_ticket':
      return 'bg-blue-100'
    case 'daily_summary':
      return 'bg-purple-100'
    case 'announcement':
      return 'bg-violet-100'
    default:
      return 'bg-gray-100'
  }
}

function priorityConfig(priority: string) {
  switch (priority) {
    case 'critical': return 'bg-red-50 text-red-700 border-red-200'
    case 'high': return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'normal': return 'bg-blue-50 text-blue-700 border-blue-200'
    default: return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

export default function AdminNotificationsPage() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all")

  useEffect(() => {
    async function init() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        if (userData?.role === 'admin') {
          await fetchNotifications()
          const interval = setInterval(() => fetchNotifications({ silent: true }), 10000)
          return () => clearInterval(interval)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const fetchNotifications = async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true)
    try {
      const [adminNotificationsRes, announcementsRes] = await Promise.all([
        fetch('/api/admin/notifications'),
        fetch('/api/announcements')
      ])

      let allNotifications: Notification[] = []

      if (adminNotificationsRes.ok) {
        const adminData = await adminNotificationsRes.json()
        if (adminData.success) {
          allNotifications = [...allNotifications, ...adminData.notifications.map((n: any) => ({
            ...n,
            _id: n.id,
            createdAt: n.createdAt,
            type: n.type || 'admin'
          }))]
        }
      }

      if (announcementsRes.ok) {
        const announcementsData = await announcementsRes.json()
        if (announcementsData.success && announcementsData.announcements) {
          allNotifications = [...allNotifications, ...announcementsData.announcements.map((a: any) => ({
            _id: `announcement-${a._id}`,
            title: a.title,
            message: a.content,
            read: false,
            type: 'announcement',
            priority: a.priority,
            createdAt: a.createdAt
          }))]
        }
      }

      allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setNotifications(allNotifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
    )

    if (notificationId.startsWith('announcement-')) return

    try {
      const response = await fetch('/api/admin/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })
      if (!response.ok) {
        setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: false } : n))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: false } : n))
    }
  }

  const markAllAsRead = async () => {
    const previousNotifications = notifications
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))

    try {
      const response = await fetch('/api/admin/notifications/read', { method: 'PATCH' })
      if (!response.ok) setNotifications(previousNotifications)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      setNotifications(previousNotifications)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const readCount = notifications.filter(n => n.read).length

  const visibleNotifications =
    activeTab === "unread" ? notifications.filter(n => !n.read) :
    activeTab === "read" ? notifications.filter(n => n.read) :
    notifications

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>

        <Card className="border border-gray-200 shadow-sm bg-white max-w-xs">
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.notifications')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('admin.notificationsDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={refreshing}
            onClick={() => fetchNotifications()}
          >
            {refreshing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            {t('admin.refresh')}
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={markAllAsRead}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              {t('admin.markAllRead')}
            </Button>
          )}
        </div>
      </div>

      {/* Unread stat card */}
      {unreadCount > 0 && (
        <Card className="border border-gray-200 shadow-sm bg-white max-w-xs">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('admin.unreadNotifications')}</p>
              <Bell className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-orange-500 mt-2">{unreadCount}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('admin.requiresAttention')}</p>
          </CardContent>
        </Card>
      )}

      {/* Notifications list card */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-0 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4 pb-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Bell className="h-5 w-5 text-green-600" />
              {t('admin.allNotifications')}
              {notifications.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs text-gray-500 border-gray-200">
                  {notifications.length}
                </Badge>
              )}
            </CardTitle>
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
              <TabsList className="h-8 bg-gray-100 p-0.5">
                <TabsTrigger value="all" className="h-7 px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  {t('common.all')}
                  {notifications.length > 0 && (
                    <span className="ml-1.5 bg-gray-200 text-gray-600 text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
                      {notifications.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread" className="h-7 px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  {t('admin.unread')}
                  {unreadCount > 0 && (
                    <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="read" className="h-7 px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  {t('admin.read')}
                  {readCount > 0 && (
                    <span className="ml-1.5 bg-gray-200 text-gray-600 text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
                      {readCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {visibleNotifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 rounded-full w-14 h-14 mx-auto mb-4 flex items-center justify-center">
                <Bell className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">{t('admin.noNotifications')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('admin.noNotificationsDesc')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleNotifications.map((n, index) => (
                <div
                  key={n._id || index}
                  className={`flex items-start gap-4 p-4 hover:bg-gray-50/80 transition-colors duration-150 ${
                    !n.read ? "border-l-2 border-l-green-500 bg-green-50/30" : ""
                  }`}
                >
                  {/* Type icon */}
                  <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${getTypeIconBg(n.type)}`}>
                    {getTypeIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <p
                          className={`text-sm font-semibold truncate cursor-pointer ${
                            !n.read ? "text-gray-900" : "text-gray-600"
                          }`}
                          onClick={() => !n.read && markAsRead(n._id)}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {n.priority && (
                          <Badge variant="outline" className={`text-xs ${priorityConfig(n.priority)}`}>
                            {n.priority}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                          {n.type}
                        </Badge>
                        {!n.read && (
                          <Button
                            size="icon" variant="ghost"
                            className="h-6 w-6 text-green-600 hover:bg-green-50"
                            title={t('admin.markAsRead')}
                            onClick={() => markAsRead(n._id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div
                      className="text-sm text-gray-600 mt-1 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-bold [&_em]:italic [&_a]:underline [&_a]:text-green-700 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:opacity-80 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-1"
                      dangerouslySetInnerHTML={{ __html: n.message }}
                    />

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                      <span className={n.read ? "text-gray-400" : "text-green-600 font-medium"}>
                        {n.read ? t('admin.read') : t('admin.unread')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
