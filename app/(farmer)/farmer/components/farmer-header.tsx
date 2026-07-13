"use client"

import { logoutUser, getCurrentUser } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"
import { Bell, Menu, User, LogOut, Settings, Leaf, RefreshCw, Loader2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from "@/contexts/LanguageContext"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useToast } from "@/hooks/use-toast"
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat"
import { playChatNotificationSound } from "@/lib/notification-sound"
import { useMobileSidebar } from "./mobile-sidebar-context"

interface HeaderUser {
  _id: string
  name: string
  email: string
  role: string
  image?: string
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

export default function FarmerHeader() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const { toggleMobileSidebar } = useMobileSidebar()
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationCount, setNotificationCount] = useState(0)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const seenChatNotificationIds = useRef<Set<string> | null>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getCurrentUser()
        setUser(userData ? { ...userData, _id: String(userData._id) } as HeaderUser : null)
        if (userData?._id) {
          const userId = String(userData._id)
          fetchNotifications(userId)
          const interval = setInterval(() => fetchNotifications(userId), 10000)
          return () => clearInterval(interval)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const fetchNotifications = async (userId: string) => {
    try {
      const [notificationsRes, announcementsRes] = await Promise.all([
        fetch(`/api/notifications?userId=${userId}&role=farmer`),
        fetch("/api/announcements"),
      ])
      const notificationsData = await notificationsRes.json()
      const announcementsData = await announcementsRes.json()

      let all: any[] = []

      if (notificationsData.success && notificationsData.notifications) {
        const formatted = notificationsData.notifications.map((n: any) => ({
          _id: n._id,
          title: n.title,
          message: n.message,
          time: new Date(n.createdAt).toLocaleDateString(),
          read: n.read,
          type: "notification",
          rawType: n.type,
        }))

        const chatNotifs = formatted.filter((n: any) => n.rawType === "chat")
        if (seenChatNotificationIds.current === null) {
          seenChatNotificationIds.current = new Set(chatNotifs.map((n: any) => n._id))
        } else {
          const newChat = chatNotifs.filter((n: any) => !seenChatNotificationIds.current!.has(n._id))
          newChat.forEach((n: any) => toast({ title: n.title, description: n.message }))
          if (newChat.length > 0) playChatNotificationSound()
          chatNotifs.forEach((n: any) => seenChatNotificationIds.current!.add(n._id))
        }

        all = [...all, ...formatted]
      }

      if (announcementsData.success && announcementsData.announcements) {
        all = [...all, ...announcementsData.announcements.map((a: any) => ({
          _id: `announcement-${a._id}`,
          title: `📢 ${a.title}`,
          message: a.content,
          time: new Date(a.createdAt).toLocaleDateString(),
          read: false,
          type: "announcement",
          priority: a.priority,
        }))]
      }

      setNotifications(all)
      setNotificationCount(all.filter((n: any) => !n.read).length)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setNotifications([])
      setNotificationCount(0)
    }
  }

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
    setNotificationCount(prev => Math.max(0, prev - 1))
    if (id.startsWith("announcement-")) return
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" })
      if (!res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: false } : n))
        setNotificationCount(prev => prev + 1)
      }
    } catch {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: false } : n))
      setNotificationCount(prev => prev + 1)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logoutUser()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      setIsLoggingOut(false)
    }
  }

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "F"

  if (loading) {
    return (
      <header className="sticky top-0 z-50 h-14 sm:h-16 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex h-full items-center justify-between px-3 sm:px-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-gray-200 rounded animate-pulse" />
            <div className="w-32 h-5 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 h-14 sm:h-16 bg-white border-b border-gray-200 shadow-sm">
      <PresenceHeartbeat />
      <div className="flex h-full items-center justify-between px-3 sm:px-6">

        {/* Left: mobile toggle + brand */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileSidebar}
            className="md:hidden p-2"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/farmer" className="flex items-center space-x-2 group">
            <Leaf className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 flex-shrink-0" />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">{t("farmer.portal")}</h1>
              <p className="text-xs text-gray-500 hidden md:block">{t("farmer.farmer")}</p>
            </div>
          </Link>
        </div>

        {/* Right: language, notifications, avatar */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <LanguageSwitcher />

          {/* Notifications */}
          <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative p-2" aria-label={t("farmer.notifications")}>
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 bg-red-500 hover:bg-red-500 text-xs flex items-center justify-center">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">{t("farmer.notifications")}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => user?._id && fetchNotifications(user._id)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label={t("farmer.refresh")}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <Link href="/farmer/notifications" className="text-xs text-green-600 hover:text-green-800">
                    {t("farmer.viewAll")}
                  </Link>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">{t("farmer.noNotifications")}</div>
                ) : (
                  notifications.map((n, i) => (
                    <div
                      key={n._id || i}
                      className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !n.read ? "bg-green-50" : ""
                      }`}
                      onClick={() => !n.read && n.type !== "announcement" && markAsRead(n._id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? "bg-green-500" : "bg-gray-300"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${!n.read ? "text-gray-900" : "text-gray-600"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{stripHtml(n.message)}</p>
                          <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src={user?.image} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-green-100 text-green-600 text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium truncate max-w-32">{user?.name?.split(" ")[0] || t("farmer.farmer")}</p>
                  <p className="text-xs text-gray-500 truncate max-w-32">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || t("farmer.farmer")}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/farmer/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t("farmer.profile")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/farmer/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t("farmer.settings")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                onSelect={(e) => isLoggingOut && e.preventDefault()}
                className="text-red-600 focus:text-red-600"
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                <span>{isLoggingOut ? t('auth.loggingOut') : t("farmer.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
