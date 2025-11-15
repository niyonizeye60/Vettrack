"use client"

import { Button } from "@/components/ui/button"
import { UserNav } from "@/app/(veterinary)/veterinary/components/user-nav"
import { Bell, Search, Menu, Stethoscope, Heart } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { getCurrentUser } from "@/lib/actions/auth"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface VeterinaryHeaderProps {
  onMenuClick: () => void
}

export function VeterinaryHeader({ onMenuClick }: VeterinaryHeaderProps) {
  const [showSearch, setShowSearch] = useState(false)
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationCount, setNotificationCount] = useState(0)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        if (userData?._id) {
          fetchNotifications(userData._id)
          const interval = setInterval(() => {
            fetchNotifications(userData._id)
          }, 3000)
          return () => clearInterval(interval)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      }
    }
    fetchUser()
  }, [])

  const fetchNotifications = async (userId: string) => {
    try {
      const [notificationsRes, announcementsRes] = await Promise.all([
        fetch(`/api/notifications?userId=${userId}&role=doctor`),
        fetch('/api/announcements')
      ])
      
      const notificationsData = await notificationsRes.json()
      const announcementsData = await announcementsRes.json()
      
      let allNotifications: any[] = []
      
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
    if (notificationId.startsWith('announcement-')) {
      return
    }
    
    try {
      await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' })
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      )
      setNotificationCount(prev => Math.max(0, prev - 1))
      
      if (user?._id) {
        setTimeout(() => fetchNotifications(user._id), 1000)
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 shadow-lg">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-white hover:bg-blue-500"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="hidden lg:flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {t('vet.dashboard')}
              </h1>
              <p className="text-xs text-blue-100">Professional Animal Care</p>
            </div>
          </div>
          
          <div className="lg:hidden flex items-center space-x-2">
            <Heart className="h-5 w-5 text-white" />
            <h1 className="text-lg font-semibold text-white">
              VetCare
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="hidden md:block">
            {showSearch ? (
              <Input
                placeholder={t('vet.searchPatients')}
                className="w-64 bg-white/10 border-white/20 text-white placeholder:text-blue-100"
                onBlur={() => setShowSearch(false)}
                autoFocus
              />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(true)}
                className="text-white hover:bg-blue-500"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
          </div>

          <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-blue-500">
            <Search className="h-5 w-5" />
          </Button>

          {/* Language Switcher */}
          <div className="text-white">
            <LanguageSwitcher />
          </div>

          {/* Notifications */}
          <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-white hover:bg-blue-500">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 hover:bg-red-500 text-xs flex items-center justify-center">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">{t('vet.notifications')}</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => user?._id && fetchNotifications(user._id)}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    ↻
                  </button>
                  <Link href="/veterinary/notifications" className="text-xs text-blue-600 hover:text-blue-800">
                    {t('vet.viewAll') || 'View All'}
                  </Link>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {t('vet.noNotifications') || 'No notifications'}
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

          <UserNav />
        </div>
      </div>
    </header>
  )
}