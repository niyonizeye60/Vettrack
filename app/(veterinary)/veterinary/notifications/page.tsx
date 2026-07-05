"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell, Check, Trash2, Clock, RefreshCw, Loader2,
  AlertCircle, AlertTriangle, Info, Megaphone
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser } from "@/lib/actions/auth"

interface Notification {
  _id: string
  title: string
  message: string
  type: string
  priority: string
  read: boolean
  createdAt: string
  expiresAt?: string
}

function getTimeLeft(expiresAt?: string) {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return "Expired"
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`
}

function priorityConfig(priority: string) {
  switch (priority) {
    case 'critical': return { badge: 'bg-red-50 text-red-700 border-red-200',    icon: <AlertCircle   className="h-4 w-4 text-red-500"    />, dot: 'bg-red-500'    }
    case 'high':     return { badge: 'bg-orange-50 text-orange-700 border-orange-200', icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, dot: 'bg-orange-500' }
    case 'normal':   return { badge: 'bg-blue-50 text-blue-700 border-blue-200',  icon: <Info          className="h-4 w-4 text-blue-500"   />, dot: 'bg-blue-500'   }
    default:         return { badge: 'bg-gray-50 text-gray-600 border-gray-200',  icon: <Bell          className="h-4 w-4 text-gray-400"   />, dot: 'bg-gray-400'   }
  }
}

function typeConfig(type: string) {
  switch (type) {
    case 'announcement': return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'consultation':  return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'system':        return 'bg-gray-50 text-gray-600 border-gray-200'
    default:              return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

export default function VeterinaryNotificationsPage() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const stored = localStorage.getItem('vet-dismissed-notifications')
    if (stored) setDismissedIds(new Set(JSON.parse(stored)))
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        if (userData?._id) {
          await fetchNotifications(userData._id)
          const interval = setInterval(() => fetchNotifications(userData._id), 10000)
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

  const fetchNotifications = async (userId: string, { silent = false } = {}) => {
    if (!silent) setRefreshing(true)
    try {
      const [notifRes, annRes] = await Promise.all([
        fetch(`/api/notifications?userId=${userId}&role=doctor`),
        fetch('/api/announcements'),
      ])
      const notifData = await notifRes.json()
      const annData   = await annRes.json()

      let all: Notification[] = []
      if (notifData.success && notifData.notifications) all = [...all, ...notifData.notifications]
      if (annData.success && annData.announcements) {
        all = [...all, ...annData.announcements.map((a: any) => ({
          _id: `announcement-${a._id}`,
          title: a.title,
          message: a.content,
          type: 'announcement',
          priority: a.priority,
          read: false,
          createdAt: a.createdAt,
          expiresAt: a.expiresAt,
        }))]
      }
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Restore any that the admin un-dismissed server-side
      const restored = all.map(n => n._id).filter(id => dismissedIds.has(id))
      if (restored.length > 0) {
        const updated = new Set(dismissedIds)
        restored.forEach(id => updated.delete(id))
        setDismissedIds(updated)
        localStorage.setItem('vet-dismissed-notifications', JSON.stringify([...updated]))
      }

      setNotifications(all.filter(n => !dismissedIds.has(n._id)))
    } catch (e) {
      console.error(e)
    } finally {
      setRefreshing(false)
    }
  }

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
    if (id.startsWith('announcement-')) return
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      if (!res.ok) setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: false } : n))
    } catch {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: false } : n))
    }
  }

  const markAllAsRead = async () => {
    const prev = notifications
    setNotifications(p => p.map(n => n._id.startsWith('announcement-') ? n : { ...n, read: true }))
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, role: 'doctor' }),
      })
      if (!res.ok) setNotifications(prev)
    } catch { setNotifications(prev) }
  }

  const handleDelete = async (id: string) => {
    const updated = new Set(dismissedIds).add(id)
    setDismissedIds(updated)
    localStorage.setItem('vet-dismissed-notifications', JSON.stringify([...updated]))
    setNotifications(prev => prev.filter(n => n._id !== id))
    if (!id.startsWith('announcement-')) {
      await fetch(`/api/notifications?id=${id}&userId=${user._id}`, { method: 'DELETE' })
    }
    setDeleteId(null)
  }

  const unreadCount = notifications.filter(n => !n.read && !n._id.startsWith('announcement-')).length
  const readCount   = notifications.filter(n =>  n.read).length

  const visibleNotifications =
    activeTab === "unread" ? notifications.filter(n => !n.read) :
    activeTab === "read"   ? notifications.filter(n =>  n.read) :
    notifications

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-24 bg-gray-200 rounded" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('vet.notifications')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('vet.notificationsDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={refreshing}
            onClick={() => user?._id && fetchNotifications(user._id)}
          >
            {refreshing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            {t('vet.refresh')}
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={markAllAsRead}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              {t('vet.markAllRead')}
            </Button>
          )}
        </div>
      </div>

      {/* Unread stat card — only show when there are unread */}
      {unreadCount > 0 && (
        <Card className="border border-gray-200 shadow-sm bg-white max-w-xs">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('vet.unreadNotifications')}</p>
              <Bell className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-orange-500 mt-2">{unreadCount}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('vet.requiresAttention')}</p>
          </CardContent>
        </Card>
      )}

      {/* Notifications list card */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-0 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4 pb-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Bell className="h-5 w-5 text-green-600" />
              {t('vet.allNotifications')}
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
                  {t('vet.unread')}
                  {unreadCount > 0 && (
                    <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="read" className="h-7 px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  {t('vet.read')}
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
              <p className="text-gray-600 font-medium">{t('vet.noNotifications')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('vet.noNotificationsDesc')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleNotifications.map(n => {
                const pc = priorityConfig(n.priority)
                const timeLeft = getTimeLeft(n.expiresAt)
                const expiringSoon = n.expiresAt &&
                  (new Date(n.expiresAt).getTime() - Date.now()) < 6 * 60 * 60 * 1000

                return (
                  <div
                    key={n._id}
                    className={`flex items-start gap-4 p-4 hover:bg-gray-50/80 transition-colors duration-150 ${
                      !n.read ? 'border-l-2 border-l-green-500 bg-green-50/30' : ''
                    }`}
                  >
                    {/* Priority icon */}
                    <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${
                      n.priority === 'critical' ? 'bg-red-100' :
                      n.priority === 'high'     ? 'bg-orange-100' :
                      n.priority === 'normal'   ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {n.type === 'announcement'
                        ? <Megaphone className="h-4 w-4 text-violet-600" />
                        : pc.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <p
                            className={`text-sm font-semibold truncate cursor-pointer ${
                              !n.read ? 'text-gray-900' : 'text-gray-600'
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
                          <Badge variant="outline" className={`text-xs ${pc.badge}`}>
                            {n.priority}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${typeConfig(n.type)}`}>
                            {n.type}
                          </Badge>
                          {!n.read && (
                            <Button
                              size="icon" variant="ghost"
                              className="h-6 w-6 text-green-600 hover:bg-green-50"
                              title={t('vet.markAsRead')}
                              onClick={() => markAsRead(n._id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="icon" variant="ghost"
                            className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50"
                            title={t('vet.dismiss')}
                            onClick={() => setDeleteId(n._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div
                        className="text-sm text-gray-600 mt-1 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-bold [&_em]:italic [&_a]:underline [&_a]:text-green-700 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:opacity-80 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-1"
                        dangerouslySetInnerHTML={{ __html: n.message }}
                      />

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                        {timeLeft && (
                          <span className={`flex items-center gap-1 ${expiringSoon ? 'text-red-500 font-medium' : ''}`}>
                            <Clock className="h-2.5 w-2.5" />{timeLeft}
                          </span>
                        )}
                        <span className={n.read ? 'text-gray-400' : 'text-green-600 font-medium'}>
                          {n.read ? t('vet.read') : t('vet.unread')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('vet.dismissNotification')}</AlertDialogTitle>
            <AlertDialogDescription>{t('vet.dismissNotificationDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('vet.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              {t('vet.dismiss')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
