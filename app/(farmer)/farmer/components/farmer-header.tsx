"use client"

import { logoutUser } from "@/lib/actions/auth"
import { getCurrentUser } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"
import { Bell, Menu, X, User, LogOut, Settings, Home, Calendar, MilkIcon as Cow } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from "@/contexts/LanguageContext"
import NotificationCenter from "@/components/ui/notification-center"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

interface HeaderUser {
  _id: string
  name: string
  email: string
  role: string
}

export default function FarmerHeader() {
  const { t } = useLanguage()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationCount, setNotificationCount] = useState(0)
  const [notificationOpen, setNotificationOpen] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        if (userData?._id) {
          fetchNotifications(userData._id)
          // Set up polling for notifications
          const interval = setInterval(() => {
            fetchNotifications(userData._id)
          }, 10000) // Poll every 10 seconds
          
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
        fetch('/api/announcements')
      ])
      
      const notificationsData = await notificationsRes.json()
      const announcementsData = await announcementsRes.json()
      
      let allNotifications: any[] = []
      
      // Add regular notifications
      if (notificationsData.success && notificationsData.notifications) {
        const formattedNotifications = notificationsData.notifications.map((n: any) => ({
          _id: n._id,
          title: n.title,
          message: n.message,
          time: new Date(n.createdAt).toLocaleDateString(),
          read: n.read,
          type: 'notification'
        }))
        allNotifications = [...allNotifications, ...formattedNotifications]
      }
      
      // Add announcements as notifications
      if (announcementsData.success && announcementsData.announcements) {
        const announcementNotifications = announcementsData.announcements.map((a: any) => ({
          _id: `announcement-${a._id}`,
          title: `📢 ${a.title}`,
          message: a.content,
          time: new Date(a.createdAt).toLocaleDateString(),
          read: false,
          type: 'announcement',
          priority: a.priority
        }))
        allNotifications = [...allNotifications, ...announcementNotifications]
      }
      
      setNotifications(allNotifications)
      setNotificationCount(allNotifications.filter((n: any) => !n.read).length)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setNotifications([])
      setNotificationCount(0)
    }
  }

  const markAsRead = async (notificationId: string) => {
    // Optimistic update - mark as read immediately
    setNotifications(prev => 
      prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
    )
    setNotificationCount(prev => Math.max(0, prev - 1))
    
    // Don't make API call for announcements
    if (notificationId.startsWith('announcement-')) {
      return
    }
    
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' })
      
      if (!response.ok) {
        // Revert optimistic update on failure
        setNotifications(prev => 
          prev.map(n => n._id === notificationId ? { ...n, read: false } : n)
        )
        setNotificationCount(prev => prev + 1)
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
      // Revert optimistic update on error
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: false } : n)
      )
      setNotificationCount(prev => prev + 1)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev)
  }

 

  if (loading) {
    return (
      <header className="bg-gradient-to-r from-emerald-600 to-green-600 shadow-lg text-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg animate-pulse"></div>
              <div className="w-32 h-6 bg-white/20 rounded animate-pulse"></div>
            </div>
            <div className="w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-gradient-to-r from-emerald-600 to-green-600 shadow-lg text-white sticky top-0 z-50 border-b border-emerald-500/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/farmer" className="flex items-center space-x-3 group">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 group-hover:bg-white/20 transition-all duration-200">
              <Cow className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{t('farmer.farmer')}</h1>
              <span className="text-xs text-emerald-100 font-medium hidden sm:block">
                {user?.name ? `${t('farmer.welcomeBack')}, ${user.name.split(" ")[0]}` : `${t('farmer.welcomeBack')}, ${t('farmer.farmer')}`}
              </span>
            </div>
          </Link>


          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Notifications */}
            <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative text-white hover:bg-white/10 hover:text-white p-2 h-auto"
                  aria-label={t('farmer.notifications')}
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-amber-500 hover:bg-amber-500 text-xs flex items-center justify-center">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{t('farmer.notifications')}</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => user?._id && fetchNotifications(user._id)}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      ↻
                    </button>
                    <Link href="/farmer/notifications" className="text-xs text-blue-600 hover:text-blue-800">
                      {t('farmer.viewAll') || 'View All'}
                    </Link>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {t('farmer.noNotifications')}
                    </div>
                  ) : (
                    notifications.map((notification, index) => (
                      <div 
                        key={notification._id || index} 
                        className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                          !notification.read ? (
                            notification.type === 'announcement' && notification.priority === 'critical' ? 'bg-red-50' :
                            notification.type === 'announcement' && notification.priority === 'high' ? 'bg-orange-50' :
                            'bg-blue-50'
                          ) : ''
                        }`}
                        onClick={() => !notification.read && notification.type !== 'announcement' && markAsRead(notification._id)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            !notification.read ? (
                              notification.type === 'announcement' && notification.priority === 'critical' ? 'bg-red-500' :
                              notification.type === 'announcement' && notification.priority === 'high' ? 'bg-orange-500' :
                              'bg-blue-500'
                            ) : 'bg-gray-300'
                          }`} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-600'
                            }`}>{notification.title}</p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dropdown - Desktop */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-white hover:bg-white/10 hover:text-white p-2 h-auto"
                  >
                    <Avatar className="h-8 w-8 border-2 border-emerald-200">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" alt={user?.name || "User"} />
                      <AvatarFallback className="bg-emerald-500 text-white text-sm">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "F"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:block font-medium text-sm">{user?.name?.split(" ")[0] || t('farmer.farmer')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name || t('farmer.farmer')}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/farmer/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('farmer.profile')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/farmer/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>{t('farmer.settings')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('farmer.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white hover:bg-white/10 hover:text-white p-2 h-auto"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-emerald-500/20">
            <div className="pt-4 space-y-2">
              {/* User Info */}
              <div className="flex items-center space-x-3 px-3 py-2 mb-4">
                <Avatar className="h-10 w-10 border-2 border-emerald-200">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt={user?.name || "User"} />
                  <AvatarFallback className="bg-emerald-500 text-white">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "F"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white">{user?.name || t('farmer.farmer')}</p>
                  <p className="text-xs text-emerald-100">{user?.email}</p>
                </div>
              </div>

              {/* Navigation Links */}
             

              {/* Mobile Actions */}
              <div className="pt-4 border-t border-emerald-500/20 space-y-2">
                <Link
                  href="/farmer/profile"
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">{t('farmer.profile')}</span>
                </Link>
                <Link
                  href="/farmer/settings"
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">{t('farmer.settings')}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-red-200 hover:text-red-100 hover:bg-red-500/20 transition-all duration-200 w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">{t('farmer.logout')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
