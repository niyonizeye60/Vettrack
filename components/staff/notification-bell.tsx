"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Megaphone, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { useNotificationsFeed, toPlainText, type FeedItem } from "./use-notifications-feed"

/**
 * The bell for a staff-shell portal, passed to StaffHeader's `notifications` slot.
 *
 * Opening an item marks it read and follows its link - a review decision links to the
 * page where the seller acts on it. Items that arrive while the portal is open also
 * pop up as a toast, since the bell alone is easy to miss.
 */
export default function NotificationBell({ role, viewAllHref }: { role: string; viewAllHref: string }) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const { items, unreadCount, refresh, markRead } = useNotificationsFeed(role, {
    onNew: (fresh) => fresh.slice(0, 3).forEach((item) => toast({ title: item.title, description: preview(item) })),
  })

  const openItem = (item: FeedItem) => {
    if (!item.read) markRead(item.id)
    if (item.actionUrl) {
      setOpen(false)
      router.push(item.actionUrl)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2" aria-label={t("notifications.title")}>
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
          <h3 className="font-semibold text-sm">{t("notifications.title")}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => refresh()} className="text-gray-500 hover:text-gray-700" aria-label={t("notifications.refresh")}>
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <Link href={viewAllHref} onClick={() => setOpen(false)} className="text-xs text-green-600 hover:text-green-800">
              {t("notifications.viewAll")}
            </Link>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">{t("notifications.empty")}</div>
          ) : (
            items.slice(0, 20).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                  !item.read ? "bg-green-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {item.announcement ? (
                    <Megaphone className={`h-3.5 w-3.5 mt-1 flex-shrink-0 ${!item.read ? "text-violet-600" : "text-gray-300"}`} />
                  ) : (
                    <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!item.read ? "bg-green-500" : "bg-gray-300"}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${!item.read ? "text-gray-900" : "text-gray-600"}`}>{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{preview(item)}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Notifications are plain text already; only announcement HTML needs flattening. */
function preview(item: FeedItem) {
  return item.announcement ? toPlainText(item.message) : item.message
}
