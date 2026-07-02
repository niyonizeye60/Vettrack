"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Megaphone, AlertTriangle, Info, Shield } from "lucide-react"

interface Announcement {
  _id: string
  title: string
  content: string
  type: string
  priority: string
  createdAt: string
}

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  useEffect(() => {
    fetchAnnouncements()
    // Load dismissed announcements from localStorage with timestamp check
    const dismissed = localStorage.getItem('dismissedAnnouncements')
    if (dismissed) {
      const dismissedData = JSON.parse(dismissed)
      const now = Date.now()
      const validDismissed = dismissedData.filter((item: any) => 
        now - item.timestamp < 24 * 60 * 60 * 1000 // 24 hours
      )
      setDismissedIds(validDismissed.map((item: any) => item.id))
      // Update localStorage with valid dismissals only
      localStorage.setItem('dismissedAnnouncements', JSON.stringify(validDismissed))
    }
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements')
      const data = await response.json()
      if (data.success) {
        setAnnouncements(data.announcements)
      }
    } catch (error) {
      console.error("Error fetching announcements:", error)
    }
  }

  const dismissAnnouncement = (id: string) => {
    const newDismissed = [...dismissedIds, id]
    setDismissedIds(newDismissed)
    
    // Store with timestamp for 24-hour expiry
    const dismissed = localStorage.getItem('dismissedAnnouncements')
    const dismissedData = dismissed ? JSON.parse(dismissed) : []
    dismissedData.push({ id, timestamp: Date.now() })
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissedData))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return <AlertTriangle className="w-4 h-4" />
      case 'security': return <Shield className="w-4 h-4" />
      case 'feature': return <Info className="w-4 h-4" />
      default: return <Megaphone className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800'
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'normal': return 'bg-blue-50 border-blue-200 text-blue-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a._id))

  if (visibleAnnouncements.length === 0) return null

  return (
    <div className="space-y-3 mb-6">
      {visibleAnnouncements.map((announcement) => (
        <Card key={announcement._id} className={`${getPriorityColor(announcement.priority)} border-l-4`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">
                  {getTypeIcon(announcement.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{announcement.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {announcement.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {announcement.priority}
                    </Badge>
                  </div>
                  <div
                    className="text-sm text-gray-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-bold [&_em]:italic [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-current [&_blockquote]:pl-3 [&_blockquote]:opacity-80"
                    dangerouslySetInnerHTML={{ __html: announcement.content }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissAnnouncement(announcement._id)}
                className="h-6 w-6 p-0 hover:bg-gray-200"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}