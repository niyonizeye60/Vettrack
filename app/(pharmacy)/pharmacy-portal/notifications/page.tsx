"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, Check, Trash2, RefreshCw, Loader2, Megaphone, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { useNotificationsFeed, type FeedItem } from "@/components/staff/use-notifications-feed"

/**
 * Everything the pharmacy has been told: review decisions on its drugs, changes staff
 * made to a live listing, and announcements.
 */
export default function PharmacyNotificationsPage() {
  const { t } = useLanguage()
  const { items, unreadCount, loading, refreshing, refresh, markRead, markAllRead, dismiss } =
    useNotificationsFeed("pharmacy")
  const [tab, setTab] = useState<"all" | "unread">("all")
  const [dismissTarget, setDismissTarget] = useState<FeedItem | null>(null)

  const visible = tab === "unread" ? items.filter((item) => !item.read) : items

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("notifications.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("pharmacy.notificationsDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={refreshing} onClick={() => refresh()}>
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            {t("notifications.refresh")}
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" onClick={() => markAllRead()}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
        <TabsList>
          <TabsTrigger value="all">
            {t("common.all")} ({items.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            {t("notifications.unread")} ({unreadCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <Card>
          <CardContent className="p-0 divide-y divide-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 flex items-start gap-4">
                <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="bg-gray-100 rounded-full w-14 h-14 mx-auto mb-4 flex items-center justify-center">
              <Bell className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">{t("notifications.empty")}</p>
            <p className="text-gray-400 text-sm mt-1">{t("notifications.emptyDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-gray-100">
            {visible.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 p-4 ${!item.read ? "border-l-2 border-l-green-500 bg-green-50/30" : ""}`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${item.announcement ? "bg-violet-100" : "bg-green-100"}`}>
                  {item.announcement ? (
                    <Megaphone className="h-4 w-4 text-violet-600" />
                  ) : (
                    <Bell className="h-4 w-4 text-green-700" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${!item.read ? "text-gray-900" : "text-gray-600"}`}>
                      {item.title}
                      {!item.read && <span className="inline-block ml-2 h-2 w-2 rounded-full bg-orange-500 align-middle" />}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!item.read && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-600 hover:bg-green-50"
                          title={t("notifications.markAsRead")}
                          onClick={() => markRead(item.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title={t("notifications.dismiss")}
                        onClick={() => setDismissTarget(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {item.announcement ? (
                    // Announcement bodies are rich text written by staff in the content editor.
                    <div
                      className="text-sm text-gray-600 mt-1 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold [&_em]:italic [&_a]:underline [&_a]:text-green-700 [&_p]:mb-1"
                      dangerouslySetInnerHTML={{ __html: item.message }}
                    />
                  ) : (
                    // Plain text on purpose: these messages quote the drug's name and the
                    // reviewer's note, which are typed by people and must not render as HTML.
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{item.message}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    {item.actionUrl && (
                      <Link
                        href={item.actionUrl}
                        onClick={() => !item.read && markRead(item.id)}
                        className="inline-flex items-center gap-1 font-medium text-green-700 hover:text-green-800"
                      >
                        {t("notifications.open")}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!dismissTarget} onOpenChange={(next) => !next && setDismissTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notifications.dismissTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("notifications.dismissConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (dismissTarget) dismiss(dismissTarget.id)
                setDismissTarget(null)
              }}
            >
              {t("notifications.dismiss")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
