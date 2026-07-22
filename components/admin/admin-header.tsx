"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Menu, Settings, LogOut, User, AlertCircle, CheckCircle, Clock, UserX, UserPlus, Calendar, Timer, TrendingDown, BarChart3, Target, FileText, Database, Shield, Loader2, MessageSquare, RefreshCw } from "lucide-react"
import { logoutUser, getCurrentUser } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat"
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

export default function AdminHeader() {
  const { t } = useLanguage()
  const router = useRouter()
  const { toggleMobileSidebar } = useMobileSidebar()
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getCurrentUser()
        setUser(userData ? { ...userData, _id: String(userData._id) } as HeaderUser : null)
      } catch (error) {
        console.error("Error fetching user:", error)
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(() => {
      fetchNotifications()
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const [adminNotificationsRes, announcementsRes] = await Promise.all([
        fetch('/api/admin/notifications'),
        fetch('/api/announcements')
      ])

      let allNotifications: any[] = []

      if (adminNotificationsRes.ok) {
        const adminData = await adminNotificationsRes.json()
        if (adminData.success) {
          const formattedAdminNotifications = adminData.notifications.map((n: any) => ({
            ...n,
            _id: n.id,
            createdAt: n.createdAt,
            type: n.type || 'admin'
          }))
          allNotifications = [...allNotifications, ...formattedAdminNotifications]
        }
      }

      if (announcementsRes.ok) {
        const announcementsData = await announcementsRes.json()
        if (announcementsData.success && announcementsData.announcements) {
          const announcementNotifications = announcementsData.announcements.map((a: any) => ({
            _id: `announcement-${a._id}`,
            title: `📢 ${a.title}`,
            message: a.content,
            time: new Date(a.createdAt).toLocaleDateString(),
            read: false,
            type: 'announcement',
            priority: a.priority,
            createdAt: a.createdAt
          }))
          allNotifications = [...allNotifications, ...announcementNotifications]
        }
      }

      // Sort by creation date and limit to 15 for dropdown
      const sortedNotifications = allNotifications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 15)

      setNotifications(sortedNotifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (notificationId: string) => {
    // Optimistic update - mark as read immediately
    setNotifications(prev =>
      prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
    )

    // Don't make API call for announcements
    if (notificationId.startsWith('announcement-')) {
      return
    }

    try {
      const response = await fetch('/api/admin/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      if (!response.ok) {
        // Revert optimistic update on failure
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, read: false } : n)
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      // Revert optimistic update on error
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: false } : n)
      )
    }
  }

  const getNotificationIcon = (type: string) => {
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
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />
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
    : "A"

  return (
    <header className="sticky top-0 z-50 h-14 sm:h-16 bg-white border-b border-gray-200 shadow-sm print:hidden">
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
          <Link href="/admin" className="flex items-center space-x-2 group">
            <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 flex-shrink-0" />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">{t('admin.portal')}</h1>
              <p className="text-xs text-gray-500 hidden md:block">{t('admin.regionalManagement')}</p>
            </div>
          </Link>
        </div>

        {/* Right: language, notifications, avatar */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <LanguageSwitcher />

          {/* Notifications */}
          <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative p-2" aria-label={t('admin.notifications')}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 bg-red-500 hover:bg-red-500 text-xs flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">{t('admin.notifications')}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchNotifications}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label={t('admin.refresh')}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <Link href="/admin/notifications" className="text-xs text-green-600 hover:text-green-800">
                    {t('admin.viewAll')}
                  </Link>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">{t('admin.noNotifications')}</div>
                ) : (
                  notifications.map((notification, index) => (
                    <div
                      key={notification._id || notification.id || index}
                      className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? "bg-green-50" : ""
                      }`}
                      onClick={() => !notification.read && markAsRead(notification._id || notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${!notification.read ? "text-gray-900" : "text-gray-600"}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{stripHtml(notification.message)}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
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
                  <p className="text-sm font-medium truncate max-w-32">{user?.name?.split(" ")[0] || t('admin.adminUser')}</p>
                  <p className="text-xs text-gray-500 truncate max-w-32">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || t('admin.adminUser')}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  {t('admin.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('admin.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={handleLogout}
                disabled={isLoggingOut}
                onSelect={(e) => isLoggingOut && e.preventDefault()}
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {isLoggingOut ? t('auth.loggingOut') : t('admin.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
