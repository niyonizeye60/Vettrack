"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, Check, ArrowLeft, Trash2, Clock } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser } from "@/lib/actions/auth"
import Link from "next/link"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

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
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`
  return `Expires in ${minutes}m`
}

export default function VeterinaryNotificationsPage() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const stored = localStorage.getItem('vet-dismissed-notifications')
    if (stored) setDismissedIds(new Set(JSON.parse(stored)))
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        if (userData?._id) {
          await fetchNotifications(userData._id)
          const interval = setInterval(() => fetchNotifications(userData._id), 10000)
          return () => clearInterval(interval)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const fetchNotifications = async (userId: string) => {
    try {
      const [notificationsRes, announcementsRes] = await Promise.all([
        fetch(`/api/notifications?userId=${userId}&role=doctor`),
        fetch('/api/announcements')
      ])
      const notificationsData = await notificationsRes.json()
      const announcementsData = await announcementsRes.json()

      let allNotifications: Notification[] = []

      if (notificationsData.success && notificationsData.notifications)
        allNotifications = [...allNotifications, ...notificationsData.notifications]

      if (announcementsData.success && announcementsData.announcements) {
        const announcementNotifications = announcementsData.announcements.map((a: any) => ({
          _id: `announcement-${a._id}`,
          title: `📢 ${a.title}`,
          message: a.content,
          type: a.type,
          priority: a.priority,
          read: false,
          createdAt: a.createdAt
        }))
        allNotifications = [...allNotifications, ...announcementNotifications]
      }

      allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // If a notification comes back from API it means superadmin restored it — remove from dismissed
      const restoredIds = allNotifications.map(n => n._id).filter(id => dismissedIds.has(id))
      if (restoredIds.length > 0) {
        const updated = new Set(dismissedIds)
        restoredIds.forEach(id => updated.delete(id))
        setDismissedIds(updated)
        localStorage.setItem('vet-dismissed-notifications', JSON.stringify([...updated]))
      }

      setNotifications(allNotifications.filter(n => !dismissedIds.has(n._id)))
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: true } : n))
    if (notificationId.startsWith('announcement-')) return
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' })
      if (!response.ok)
        setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: false } : n))
    } catch {
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: false } : n))
    }
  }

  const markAllAsRead = async () => {
    const prev = notifications
    setNotifications(p => p.map(n => n._id.startsWith('announcement-') ? n : { ...n, read: true }))
    try {
      const res = await fetch(`/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, role: 'doctor' })
      })
      if (!res.ok) setNotifications(prev)
    } catch {
      setNotifications(prev)
    }
  }

  const handleDelete = async (id: string) => {
    const newDismissed = new Set(dismissedIds).add(id)
    setDismissedIds(newDismissed)
    localStorage.setItem('vet-dismissed-notifications', JSON.stringify([...newDismissed]))
    setNotifications(prev => prev.filter(n => n._id !== id))

    if (!id.startsWith('announcement-')) {
      await fetch(`/api/notifications?id=${id}&userId=${user._id}`, { method: 'DELETE' })
    }
    setDeleteId(null)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded"></div>)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/veterinary">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('vet.back') || 'Back'}
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="h-6 w-6" />
                {t('vet.notifications') || 'Notifications'}
              </h1>
              <p className="text-gray-600">{notifications.length} total notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => user?._id && fetchNotifications(user._id)} variant="ghost" size="sm">
              ↻ {t('vet.refresh') || 'Refresh'}
            </Button>
            {notifications.some(n => !n.read && !n._id.startsWith('announcement-')) && (
              <Button onClick={markAllAsRead} variant="outline" size="sm">
                <Check className="h-4 w-4 mr-2" />
                {t('vet.markAllRead')}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('vet.noNotifications') || 'No Notifications'}</h3>
                <p className="text-gray-600">{t('vet.noNotificationsDesc') || 'You have no notifications at this time.'}</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => {
              const timeLeft = getTimeLeft(notification.expiresAt)
              const isExpiringSoon = notification.expiresAt &&
                (new Date(notification.expiresAt).getTime() - Date.now()) < 6 * 60 * 60 * 1000
              return (
                <Card
                  key={notification._id}
                  className={`transition-all hover:shadow-md ${
                    !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle
                        className={`text-lg cursor-pointer ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}
                        onClick={() => !notification.read && markAsRead(notification._id)}
                      >
                        {notification.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                        <Badge variant="outline">{notification.type}</Badge>
                        {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-red-50"
                          onClick={() => setDeleteId(notification._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-3">{notification.message}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{new Date(notification.createdAt).toLocaleString()}</span>
                      <div className="flex items-center gap-3">
                        {timeLeft && (
                          <span className={`flex items-center gap-1 text-xs ${
                            isExpiringSoon ? 'text-red-500 font-medium' : 'text-gray-400'
                          }`}>
                            <Clock className="h-3 w-3" />
                            {timeLeft}
                          </span>
                        )}
                        <span className={notification.read ? 'text-green-600' : 'text-blue-600'}>
                          {notification.read ? 'Read' : 'Unread'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              This notification will be hidden from your view. The super admin can still see it and restore it if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
