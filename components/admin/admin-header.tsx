"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Bell, Menu, Settings, LogOut, User, AlertCircle, CheckCircle, Clock, UserX, UserPlus, Calendar, Timer, TrendingDown, BarChart3, Target, FileText, Database, Shield } from "lucide-react"
import { logoutUser } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

interface AdminHeaderProps {
  onMenuClick: () => void
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    fetchNotifications()
    // Set up more frequent polling for real-time updates
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

  const markAllAsRead = async () => {
    // Optimistic update - mark all as read immediately
    const previousNotifications = notifications
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    
    try {
      const response = await fetch('/api/admin/notifications/read', {
        method: 'PATCH'
      })
      
      if (!response.ok) {
        // Revert optimistic update on failure
        setNotifications(previousNotifications)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      // Revert optimistic update on error
      setNotifications(previousNotifications)
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
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />
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

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Menu button and search */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold text-gray-900">{t('admin.dashboard')}</h1>
            <p className="text-sm text-gray-500">{t('admin.regionalManagementPortal')}</p>
          </div>
        </div>



        {/* Right side - Language switcher, notifications and profile */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {/* Notifications */}
          <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-500">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">{t('admin.notifications')}</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchNotifications}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    ↻
                  </button>
                  <a href="/admin/notifications" className="text-xs text-blue-600 hover:text-blue-800">
                    {t('admin.viewAll') || 'View All'}
                  </a>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-auto p-1"
                      onClick={markAllAsRead}
                    >
                      {t('admin.markAllRead')}
                    </Button>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    {t('admin.noNotifications')}
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <div 
                      key={notification._id || notification.id || index}
                      className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? (
                          notification.type === 'announcement' && notification.priority === 'critical' ? 'bg-red-50' :
                          notification.type === 'announcement' && notification.priority === 'high' ? 'bg-orange-50' :
                          notification.type === 'doctor_unavailable' || notification.type === 'response_time' ? 'bg-orange-50' :
                          'bg-blue-50'
                        ) : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification._id || notification.id)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            !notification.read ? 'text-gray-900' : 'text-gray-600'
                          }`}>{notification.title}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                        </div>
                        {!notification.read && (
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                            notification.type === 'announcement' && notification.priority === 'critical' ? 'bg-red-500' :
                            notification.type === 'announcement' && notification.priority === 'high' ? 'bg-orange-500' :
                            notification.type === 'doctor_unavailable' || notification.type === 'response_time' ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`} />
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
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-avatar.jpg" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{t('admin.adminUser')}</p>
                  <p className="text-xs text-gray-500">{t('admin.kigaliDistrict')}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('admin.myAccount')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                {t('admin.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                {t('admin.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('admin.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>


    </header>
  )
}