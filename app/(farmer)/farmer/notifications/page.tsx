"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bell, Check, Trash2, Clock, Stethoscope, Megaphone,
  ShieldAlert, CalendarCheck, UserPlus, MessageCircle
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser } from "@/lib/actions/auth"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"

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

type Filter = "all" | "unread" | "read"

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`
  return new Date(dateStr).toLocaleDateString()
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

function NotificationIcon({ type }: { type: string }) {
  const lower = type?.toLowerCase() ?? ""
  let Icon = Bell
  if (lower.includes("consultation") || lower.includes("booking")) Icon = Stethoscope
  else if (lower.includes("announcement") || lower.includes("system")) Icon = Megaphone
  else if (lower.includes("alert") || lower.includes("critical")) Icon = ShieldAlert
  else if (lower.includes("appointment") || lower.includes("schedule")) Icon = CalendarCheck
  else if (lower.includes("user") || lower.includes("registration")) Icon = UserPlus
  else if (lower.includes("message") || lower.includes("chat")) Icon = MessageCircle

  return (
    <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
      <Icon className="h-5 w-5 text-emerald-600" />
    </div>
  )
}

export default function FarmerNotificationsPage() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>("all")

  useEffect(() => {
    const stored = localStorage.getItem("farmer-dismissed-notifications")
    if (stored) setDismissedIds(new Set(JSON.parse(stored)))
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        if (userData?._id) {
          const userId = String(userData._id)
          await fetchNotifications(userId)
          const interval = setInterval(() => fetchNotifications(userId), 10000)
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
        fetch(`/api/notifications?userId=${userId}&role=farmer`),
        fetch("/api/announcements"),
      ])
      const notificationsData = await notificationsRes.json()
      const announcementsData = await announcementsRes.json()

      let all: Notification[] = []

      if (notificationsData.success && notificationsData.notifications)
        all = [...all, ...notificationsData.notifications]

      if (announcementsData.success && announcementsData.announcements) {
        const mapped = announcementsData.announcements.map((a: any) => ({
          _id: `announcement-${a._id}`,
          title: a.title,
          message: a.content,
          type: "announcement",
          priority: a.priority,
          read: false,
          createdAt: a.createdAt,
          expiresAt: a.expiresAt,
        }))
        all = [...all, ...mapped]
      }

      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      const restoredIds = all.map((n) => n._id).filter((id) => dismissedIds.has(id))
      if (restoredIds.length > 0) {
        const updated = new Set(dismissedIds)
        restoredIds.forEach((id) => updated.delete(id))
        setDismissedIds(updated)
        localStorage.setItem("farmer-dismissed-notifications", JSON.stringify([...updated]))
      }

      setNotifications(all.filter((n) => !dismissedIds.has(n._id)))
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
    )
    if (notificationId.startsWith("announcement-")) return
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" })
      if (!res.ok)
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, read: false } : n))
        )
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: false } : n))
      )
    }
  }

  const markAllAsRead = async () => {
    const prev = notifications
    setNotifications((p) =>
      p.map((n) => (n._id.startsWith("announcement-") ? n : { ...n, read: true }))
    )
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, role: "farmer" }),
      })
      if (!res.ok) setNotifications(prev)
    } catch {
      setNotifications(prev)
    }
  }

  const handleDelete = async (id: string) => {
    const newDismissed = new Set(dismissedIds).add(id)
    setDismissedIds(newDismissed)
    localStorage.setItem("farmer-dismissed-notifications", JSON.stringify([...newDismissed]))
    setNotifications((prev) => prev.filter((n) => n._id !== id))
    if (!id.startsWith("announcement-")) {
      await fetch(`/api/notifications?id=${id}&userId=${user._id}`, { method: "DELETE" })
    }
    setDeleteId(null)
  }

  const unreadCount = notifications.filter(
    (n) => !n.read && !n._id.startsWith("announcement-")
  ).length

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read
    if (filter === "read") return n.read
    return true
  })

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("farmer.notifications") || "Notifications"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("farmer.notificationsDesc") || "Stay up to date with your latest alerts and messages."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline" size="sm" className="mt-1">
            <Check className="h-4 w-4 mr-2" />
            {t("farmer.markAllRead") || "Mark all as read"}
          </Button>
        )}
      </div>

      {/* Single card with filter tabs + rows */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>
                {t("farmer.allNotifications") || "All Notifications"}
              </CardTitle>
              {unreadCount > 0 && (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} {t("farmer.unreadCount") || "unread"}
                </Badge>
              )}
            </div>
            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(["all", "unread", "read"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                    filter === f
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f === "all" ? (t("common.all") || "All") :
                   f === "unread" ? (t("farmer.unread") || "Unread") :
                   (t("farmer.read") || "Read")}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 px-0 pb-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Bell className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-gray-600">
                {t("farmer.noNotifications") || "No notifications"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {t("farmer.noNotificationsDesc") || "You have no notifications at this time."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((notification) => {
                const timeLeft = getTimeLeft(notification.expiresAt)
                const isExpiringSoon =
                  notification.expiresAt &&
                  new Date(notification.expiresAt).getTime() - Date.now() < 6 * 60 * 60 * 1000

                return (
                  <div
                    key={notification._id}
                    className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      !notification.read ? "bg-emerald-50/40" : ""
                    }`}
                    onClick={() => !notification.read && markAsRead(notification._id)}
                  >
                    <NotificationIcon type={notification.type} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm ${notification.read ? "text-gray-700" : "text-gray-900"}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 leading-snug">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-400">{timeAgo(notification.createdAt)}</span>
                        {timeLeft && (
                          <span className={`flex items-center gap-1 text-xs ${
                            isExpiringSoon ? "text-red-500 font-medium" : "text-gray-400"
                          }`}>
                            <Clock className="h-3 w-3" />
                            {timeLeft}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-red-50 flex-shrink-0 mt-0.5"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(notification._id) }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("farmer.deleteNotification") || "Delete notification"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("farmer.deleteNotificationConfirm") || "This notification will be removed from your list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
