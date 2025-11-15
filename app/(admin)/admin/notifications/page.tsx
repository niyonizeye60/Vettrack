"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, Check, ArrowLeft, AlertCircle, CheckCircle, Clock, UserX, UserPlus, Calendar, Timer, TrendingDown, BarChart3, Target, FileText, Database, Shield, Settings } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser } from "@/lib/actions/auth"
import Link from "next/link"

interface Notification {
  _id: string
  id?: string
  title: string
  message: string
  type: string
  priority?: string
  read: boolean
  createdAt: string
  time?: string
}

export default function AdminNotificationsPage() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        if (userData?.role === 'admin') {
          await fetchNotifications()
          // Set up real-time polling
          const interval = setInterval(() => {
            fetchNotifications()
          }, 10000) // Poll every 10 seconds
          
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

  const fetchNotifications = async () => {
    try {
      const [adminNotificationsRes, announcementsRes] = await Promise.all([
        fetch('/api/admin/notifications'),
        fetch('/api/announcements')
      ])
      
      let allNotifications: Notification[] = []
      
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
            type: 'announcement',
            priority: a.priority,
            read: false,
            createdAt: a.createdAt
          }))
          allNotifications = [...allNotifications, ...announcementNotifications]
        }
      }
      
      // Sort by creation date
      allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setNotifications(allNotifications)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

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
      case 'urgent': return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning': return <Clock className="h-5 w-5 text-yellow-500" />
      case 'doctor_unavailable': return <UserX className="h-5 w-5 text-orange-500" />
      case 'new_user': return <UserPlus className="h-5 w-5 text-green-500" />
      case 'consultation_status': return <CheckCircle className="h-5 w-5 text-blue-500" />
      case 'appointment_conflict': return <Calendar className="h-5 w-5 text-red-500" />
      case 'response_time': return <Timer className="h-5 w-5 text-yellow-500" />
      case 'daily_summary': return <BarChart3 className="h-5 w-5 text-purple-500" />
      case 'activity_anomaly': return <TrendingDown className="h-5 w-5 text-orange-500" />
      case 'quality_alert': return <Target className="h-5 w-5 text-red-500" />
      case 'policy_update': return <FileText className="h-5 w-5 text-blue-500" />
      case 'maintenance_scheduled': return <Settings className="h-5 w-5 text-gray-500" />
      case 'backup_status': return <Database className="h-5 w-5 text-green-500" />
      case 'compliance_deadline': return <Shield className="h-5 w-5 text-orange-500" />
      default: return <CheckCircle className="h-5 w-5 text-blue-500" />
    }
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
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('admin.back') || 'Back'}
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="h-6 w-6" />
                {t('admin.notifications') || 'Notifications'}
              </h1>
              <p className="text-gray-600">{notifications.length} {t('admin.totalNotifications')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={fetchNotifications} 
              variant="ghost" 
              size="sm"
            >
              ↻ {t('admin.refresh') || 'Refresh'}
            </Button>
            {notifications.some(n => !n.read && !n._id.startsWith('announcement-')) && (
              <Button onClick={markAllAsRead} variant="outline" size="sm">
                <Check className="h-4 w-4 mr-2" />
                {t('admin.markAllRead') || 'Mark All Read'}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('admin.noNotifications') || 'No Notifications'}</h3>
                <p className="text-gray-600">You have no notifications at this time.</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card 
                key={notification._id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
                }`}
                onClick={() => !notification.read && markAsRead(notification._id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getNotificationIcon(notification.type)}
                      <CardTitle className={`text-lg ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notification.title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.priority && (
                        <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {notification.type}
                      </Badge>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-3">{notification.message}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{new Date(notification.createdAt).toLocaleString()}</span>
                    <span className={notification.read ? 'text-green-600' : 'text-blue-600'}>
                      {notification.read ? 'Read' : 'Unread'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}