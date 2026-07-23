"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Bell,
  User,
  Settings,
  LogOut,
  Menu,
  Shield,
  Activity,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react"
import { logoutUser } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { getNotifications, markNotificationRead, generateSystemNotifications } from "@/lib/actions/superadmin"
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat"
import { useMobileSidebar } from "./mobile-sidebar-context"
import { Skeleton } from "@/components/ui/skeleton"

interface SuperAdminHeaderProps {
  user: {
    _id: string
    name: string
    email: string
    role: string
    image?: string
  }
}

export default function SuperAdminHeader({ user }: SuperAdminHeaderProps) {
  const { t } = useLanguage()
  const { toggleMobileSidebar } = useMobileSidebar()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [avatarImage, setAvatarImage] = useState<string | undefined>(user.image)
  const router = useRouter()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const handleFocus = async () => {
      try {
        const res = await fetch("/api/profile").then(r => r.json()).catch(() => null)
        if (res?.image) setAvatarImage(res.image)
      } catch {}
    }

    window.addEventListener('focus', handleFocus)
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [])

  const loadNotifications = async () => {
    try {
      await generateSystemNotifications()
      const data = await getNotifications(user._id)
      setNotifications(data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markNotificationRead(notification._id)
      setNotifications(prev =>
        prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
      )
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'critical') return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (type === 'security') return <Shield className="h-4 w-4 text-orange-500" />
    if (type === 'system') return <Activity className="h-4 w-4 text-blue-500" />
    return <Info className="h-4 w-4 text-gray-500" />
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logoutUser()
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      setIsLoggingOut(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "SA"

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
            className="lg:hidden p-2"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 flex-shrink-0" />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">{t('superadmin.superAdmin') || 'Super Admin'}</h1>
              <p className="text-xs text-gray-500 hidden md:block">{t('superadmin.systemControlPanel') || 'System Control Panel'}</p>
            </div>
            <div className="block sm:hidden">
              <h1 className="text-sm font-semibold text-gray-900">{t('superadmin.admin') || 'Admin'}</h1>
            </div>
          </div>
        </div>

        {/* Right: online status, language, notifications, avatar */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isOnline ? t('superadmin.online') || 'Online' : t('superadmin.offline') || 'Offline'}
            </span>
          </div>

          <LanguageSwitcher />

          {/* Notifications */}
          <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative p-2" aria-label={t('superadmin.notifications') || 'Notifications'}>
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
                <h3 className="font-semibold text-sm">{t('superadmin.notifications') || 'Notifications'}</h3>
                <Link href="/superadmin/notifications" className="text-xs text-blue-600 hover:text-blue-800">
                  {t('superadmin.viewAll') || 'View All'}
                </Link>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {isLoadingNotifications ? (
                  <div>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-3 border-b last:border-b-0 flex items-start gap-3">
                        <Skeleton className="h-4 w-4 rounded-full flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">{t('superadmin.noNotifications') || 'No notifications'}</div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type, notification.priority)}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${!notification.read ? "text-gray-900" : "text-gray-600"}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{getTimeAgo(notification.createdAt)}</p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2 bg-blue-500" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src={avatarImage} alt={user.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium truncate max-w-32">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate max-w-32">{user.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/superadmin/profile')}>
                <User className="mr-2 h-4 w-4" />
                {t('superadmin.profile') || 'Profile'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/superadmin/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                {t('superadmin.settings') || 'Settings'}
              </DropdownMenuItem>
              {/* Mobile-only online status */}
              <div className="md:hidden">
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <div className={`mr-2 w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  {t('superadmin.status')}: {isOnline ? t('superadmin.online') || 'Online' : t('superadmin.offline') || 'Offline'}
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                onSelect={(e) => isLoggingOut && e.preventDefault()}
                className="text-red-600"
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {isLoggingOut ? t('auth.loggingOut') : (t('superadmin.logout') || 'Logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
