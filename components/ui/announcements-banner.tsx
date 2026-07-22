"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Megaphone, AlertTriangle, Info, Shield, ChevronDown, ChevronUp } from "lucide-react"

interface Announcement {
  _id: string
  title: string
  content: string
  type: string
  priority: string
  createdAt: string
}

function priorityStyles(priority: string) {
  switch (priority) {
    case 'critical': return { border: 'border-l-red-500',    icon: 'bg-red-100',    iconColor: 'text-red-600',    badge: 'bg-red-50 text-red-700 border-red-200' }
    case 'high':     return { border: 'border-l-orange-400', icon: 'bg-orange-100', iconColor: 'text-orange-600', badge: 'bg-orange-50 text-orange-700 border-orange-200' }
    case 'normal':   return { border: 'border-l-blue-400',   icon: 'bg-blue-100',   iconColor: 'text-blue-600',   badge: 'bg-blue-50 text-blue-700 border-blue-200' }
    default:         return { border: 'border-l-gray-300',   icon: 'bg-gray-100',   iconColor: 'text-gray-500',   badge: 'bg-gray-50 text-gray-600 border-gray-200' }
  }
}

function typeIcon(type: string, className: string) {
  switch (type) {
    case 'maintenance': return <AlertTriangle className={className} />
    case 'security':    return <Shield className={className} />
    case 'feature':     return <Info className={className} />
    default:            return <Megaphone className={className} />
  }
}

function AnnouncementCard({
  announcement,
  onDismiss,
}: {
  announcement: Announcement
  onDismiss: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (el) setHasOverflow(el.scrollHeight > el.clientHeight + 2)
  }, [announcement.content])

  const ps = priorityStyles(announcement.priority)

  return (
    <Card className={`bg-white border border-gray-200 shadow-sm border-l-4 ${ps.border}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">

            {/* Priority icon pill */}
            <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${ps.icon}`}>
              {typeIcon(announcement.type, `h-4 w-4 ${ps.iconColor}`)}
            </div>

            <div className="flex-1 min-w-0">
              {/* Title + badges */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-semibold text-sm text-gray-900">{announcement.title}</h4>
                <Badge variant="outline" className={`text-xs ${ps.badge}`}>{announcement.priority}</Badge>
                <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">{announcement.type}</Badge>
              </div>

              {/* Collapsible WYSIWYG content */}
              <div
                ref={contentRef}
                className={`text-sm text-gray-600 leading-relaxed overflow-hidden transition-all duration-200
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5
                  [&_strong]:font-semibold [&_em]:italic [&_a]:underline [&_a]:text-green-700
                  [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500
                  [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-1
                  ${expanded ? "" : "line-clamp-3"}`}
                dangerouslySetInnerHTML={{ __html: announcement.content }}
              />

              {/* Show more / less */}
              {(hasOverflow || expanded) && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 transition-colors"
                >
                  {expanded
                    ? <><ChevronUp className="h-3 w-3" />Show less</>
                    : <><ChevronDown className="h-3 w-3" />Show more</>}
                </button>
              )}

              <p className="text-xs text-gray-400 mt-2">
                {new Date(announcement.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Dismiss */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(announcement._id)}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  useEffect(() => {
    fetchAnnouncements()
    const stored = localStorage.getItem('dismissedAnnouncements')
    if (stored) {
      const data = JSON.parse(stored)
      const now = Date.now()
      const valid = data.filter((item: any) => now - item.timestamp < 24 * 60 * 60 * 1000)
      setDismissedIds(valid.map((item: any) => item.id))
      localStorage.setItem('dismissedAnnouncements', JSON.stringify(valid))
    }
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements')
      const data = await res.json()
      if (data.success) setAnnouncements(data.announcements)
    } catch (error) {
      console.error("Error fetching announcements:", error)
    }
  }

  const dismissAnnouncement = (id: string) => {
    setDismissedIds(prev => [...prev, id])
    const stored = localStorage.getItem('dismissedAnnouncements')
    const data = stored ? JSON.parse(stored) : []
    data.push({ id, timestamp: Date.now() })
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(data))
  }

  const visible = announcements.filter(a => !dismissedIds.includes(a._id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-3">
      {visible.map(a => (
        <AnnouncementCard key={a._id} announcement={a} onDismiss={dismissAnnouncement} />
      ))}
    </div>
  )
}
