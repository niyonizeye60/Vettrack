"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
  CheckCircle,
  Loader2
} from "lucide-react"
import { logoutUser } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"
import SuperAdminSidebar from "@/components/superadmin/super-admin-sidebar"
import { useLanguage } from "@/contexts/LanguageContext"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { getNotifications, markNotificationRead, generateSystemNotifications } from "@/lib/actions/superadmin"
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat"

interface SuperAdminHeaderProps {
  user: {
    _id: string
    name: string
    email: string
    role: string
  }
}

export default function SuperAdminHeader({ user }: SuperAdminHeaderProps) {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true)

  const [isOnline, setIsOnline] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Track online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load notifications
    loadNotifications()

    // Auto-refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const loadNotifications = async () => {
    try {
      // Generate system notifications first
      await generateSystemNotifications()
      
      // Then fetch all notifications
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
    if (priority === 'critical') return <AlertTriangle className="w-4 h-4 text-red-500" />
    if (type === 'security') return <Shield className="w-4 h-4 text-orange-500" />
    if (type === 'system') return <Activity className="w-4 h-4 text-blue-500" />
    return <Info className="w-4 h-4 text-gray-500" />
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50'
      case 'high': return 'border-orange-500 bg-orange-50'
      case 'normal': return 'border-blue-500 bg-blue-50'
      default: return 'border-gray-500 bg-gray-50'
    }
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

  return (
    <header className="w-full h-full">
      <PresenceHeartbeat />
      <div className="flex h-full items-center justify-between px-3 sm:px-6">
        {/* Left side - Mobile menu + Logo */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Mobile menu button - Only visible on mobile/tablet */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="lg:hidden p-2"
                aria-label="Open mobile menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="px-4 py-4 border-b">
                <SheetTitle className="flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <span>{t('superadmin.superAdmin') || 'Super Admin'}</span>
                </SheetTitle>
                <SheetDescription>
                  {t('superadmin.systemControlPanel') || 'System Control Panel'}
                </SheetDescription>
              </SheetHeader>
              <div className="py-4">
                <SuperAdminSidebar onNavigate={() => setIsMobileMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo and title */}
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900">{t('superadmin.superAdmin') || 'Super Admin'}</h1>
              <p className="text-xs text-gray-500 hidden md:block">{t('superadmin.systemControlPanel') || 'System Control Panel'}</p>
            </div>
            {/* Mobile title - shorter version */}
            <div className="block sm:hidden">
              <h1 className="text-sm font-semibold text-gray-900">{t('superadmin.admin') || 'Admin'}</h1>
            </div>
          </div>
        </div>

        {/* Right side - Status, Notifications and profile */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Online status - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isOnline ? t('superadmin.online') || 'Online' : t('superadmin.offline') || 'Offline'}
            </span>
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="relative p-2">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-80 max-w-sm">
              <SheetHeader>
                <SheetTitle>{t('superadmin.notifications') || 'Notifications'}</SheetTitle>
                <SheetDescription>
                  {t('superadmin.systemAlertsUpdates') || 'System alerts and updates'}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-3 max-h-[70vh] overflow-y-auto">
                {isLoadingNotifications ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                        !notification.read 
                          ? getPriorityColor(notification.priority)
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type, notification.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-400">{getTimeAgo(notification.createdAt)}</p>
                            {notification.priority === 'critical' && (
                              <Badge variant="destructive" className="text-xs px-1 py-0">Critical</Badge>
                            )}
                            {notification.priority === 'high' && (
                              <Badge variant="secondary" className="text-xs px-1 py-0 bg-orange-100 text-orange-800">High</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {notifications.length > 0 && (
                  <div className="pt-3 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => router.push('/superadmin/notifications')}
                    >
                      View All Notifications
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                {/* User info - Hidden on mobile */}
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium truncate max-w-32">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate max-w-32">{user.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500 font-normal">{user.email}</p>
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