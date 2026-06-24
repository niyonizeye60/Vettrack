"use client"

import { Button } from "@/components/ui/button"
import { UserNav } from "@/app/(veterinary)/veterinary/components/user-nav"
import { Bell, Search, Menu, Stethoscope, Heart, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { getCurrentUser } from "@/lib/actions/auth"
import { useToast } from "@/hooks/use-toast"
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat"
import { playChatNotificationSound } from "@/lib/notification-sound"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NOTIFICATIONS_POLL_MS = 10000
const SEARCH_DEBOUNCE_MS = 300

interface PatientResult {
  id: string
  name: string
  phone: string
}

interface AppointmentResult {
  id: string
  fullName: string
  service: string
  date: string
  status: string
}

interface VeterinaryHeaderProps {
  onMenuClick: () => void
}

export function VeterinaryHeader({ onMenuClick }: VeterinaryHeaderProps) {
  const router = useRouter()
  const [showSearch, setShowSearch] = useState(false)
  const { t } = useLanguage()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationCount, setNotificationCount] = useState(0)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const seenChatNotificationIds = useRef<Set<string> | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ patients: PatientResult[]; appointments: AppointmentResult[] } | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined

    async function fetchUser() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        if (userData?._id) {
          const userId = userData._id.toString()
          fetchNotifications(userId)
          intervalId = setInterval(() => {
            fetchNotifications(userId)
          }, NOTIFICATIONS_POLL_MS)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      }
    }
    fetchUser()

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  // Debounced live search across this doctor's patients and appointments
  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) {
      setSearchResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/veterinary/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        if (response.ok) setSearchResults(data)
      } catch (error) {
        console.error('Error searching:', error)
      } finally {
        setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const closeSearch = () => {
    setShowSearch(false)
    setSearchQuery("")
    setSearchResults(null)
  }

  const goToPatient = (patient: PatientResult) => {
    closeSearch()
    router.push(`/veterinary/patients?q=${encodeURIComponent(patient.name)}`)
  }

  const goToAppointment = (appointment: AppointmentResult) => {
    closeSearch()
    router.push(`/veterinary/appointments?q=${encodeURIComponent(appointment.fullName)}`)
  }

  const renderSearchResults = () => {
    if (!searchQuery.trim()) return null
    const hasResults = (searchResults?.patients.length || 0) > 0 || (searchResults?.appointments.length || 0) > 0
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white text-gray-900 rounded-md shadow-lg border max-h-80 overflow-y-auto z-50">
        {searching ? (
          <div className="p-4 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : !hasResults ? (
          <div className="p-4 text-center text-sm text-gray-400">{t('vet.noResultsFound')}</div>
        ) : (
          <>
            {searchResults!.patients.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">{t('vet.patients')}</div>
                {searchResults!.patients.map(patient => (
                  <div
                    key={patient.id}
                    className="px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goToPatient(patient)}
                  >
                    <p className="text-sm font-medium truncate">{patient.name}</p>
                    <p className="text-xs text-gray-500 truncate">{patient.phone}</p>
                  </div>
                ))}
              </div>
            )}
            {searchResults!.appointments.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">{t('vet.appointments')}</div>
                {searchResults!.appointments.map(appointment => (
                  <div
                    key={appointment.id}
                    className="px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goToAppointment(appointment)}
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium truncate">{appointment.fullName}</p>
                      <Badge variant="outline" className="text-xs ml-2 shrink-0">{appointment.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{appointment.service}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

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
          type: 'notification',
          rawType: n.type
        }))

        const chatNotifications: typeof formattedNotifications = formattedNotifications.filter(
          (n: typeof formattedNotifications[number]) => n.rawType === 'chat'
        )
        if (seenChatNotificationIds.current === null) {
          seenChatNotificationIds.current = new Set(chatNotifications.map((n: typeof formattedNotifications[number]) => n._id))
        } else {
          const newChatNotifications = chatNotifications.filter(
            (n: typeof formattedNotifications[number]) => !seenChatNotificationIds.current!.has(n._id)
          )
          newChatNotifications.forEach((n: typeof formattedNotifications[number]) => toast({ title: n.title, description: n.message }))
          if (newChatNotifications.length > 0) playChatNotificationSound()
          chatNotifications.forEach((n: typeof formattedNotifications[number]) => seenChatNotificationIds.current!.add(n._id))
        }

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

    // Optimistic update - mark as read immediately
    setNotifications(prev =>
      prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
    )
    setNotificationCount(prev => Math.max(0, prev - 1))

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

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 shadow-lg">
      <PresenceHeartbeat />
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
          <div className="hidden md:block relative">
            {showSearch ? (
              <Input
                placeholder={t('vet.searchPatients')}
                className="w-64 bg-white/10 border-white/20 text-white placeholder:text-blue-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                onBlur={closeSearch}
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
            {showSearch && renderSearchResults()}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-blue-500"
            onClick={() => showSearch ? closeSearch() : setShowSearch(true)}
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">{t('vet.search')}</span>
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

      {showSearch && (
        <div className="md:hidden px-4 pb-3 relative">
          <Input
            placeholder={t('vet.searchPatients')}
            className="w-full bg-white/10 border-white/20 text-white placeholder:text-blue-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && closeSearch()}
            onBlur={closeSearch}
            autoFocus
          />
          {renderSearchResults()}
        </div>
      )}
    </header>
  )
}