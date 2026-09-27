"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getCurrentUser } from "@/lib/actions/auth"

export interface FeedItem {
  id: string
  title: string
  /** Plain text for notifications; staff-authored HTML for announcements. */
  message: string
  createdAt: string
  read: boolean
  announcement: boolean
  actionUrl: string | null
}

const ANNOUNCEMENT_PREFIX = "announcement-"

/**
 * Fired after this tab changes read/dismissed state, so every feed on the page (the
 * bell and the notifications page each hold one) reloads instead of waiting a poll.
 */
const CHANGED_EVENT = "staff-notifications:changed"
const announceChange = () => window.dispatchEvent(new Event(CHANGED_EVENT))

/**
 * Announcements live in their own collection with no per-user read or dismissed
 * state, so a portal keeps that in the browser - otherwise a single announcement
 * would hold the unread badge up forever. Losing it (private window, cleared data)
 * only means an old announcement shows as unread again.
 */
function readIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeIdSet(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)))
  } catch {
    // Browser storage unavailable - the state just won't survive a reload.
  }
}

/**
 * One signed-in user's notifications and announcements, polled, for a staff-shell
 * portal. The bell and the notifications page both read it, so the two can't
 * disagree about what is unread.
 *
 * `onNew` fires for notifications that arrive after the first load - not for the
 * backlog already there when the page opened.
 */
export function useNotificationsFeed(
  role: string,
  { pollMs = 15000, onNew }: { pollMs?: number; onNew?: (items: FeedItem[]) => void } = {}
) {
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const seenIds = useRef<Set<string> | null>(null)
  const onNewRef = useRef(onNew)
  onNewRef.current = onNew

  const readKey = `${role}-read-announcements`
  const dismissedKey = `${role}-dismissed-announcements`

  const load = useCallback(
    async ({ silent = true } = {}) => {
      if (!silent) setRefreshing(true)
      try {
        const [notificationsRes, announcementsRes] = await Promise.all([
          // The API reads who is asking from the session; no ids go in the URL.
          fetch("/api/notifications"),
          fetch("/api/announcements"),
        ])
        const notificationsData = await notificationsRes.json()
        const announcementsData = await announcementsRes.json()

        const readAnnouncements = readIdSet(readKey)
        const dismissedAnnouncements = readIdSet(dismissedKey)

        const notifications: FeedItem[] = notificationsData.success
          ? (notificationsData.notifications ?? []).map((n: any) => ({
              id: n._id,
              title: n.title,
              message: n.message ?? "",
              createdAt: n.createdAt,
              read: !!n.read,
              announcement: false,
              actionUrl: n.actionUrl ?? null,
            }))
          : []

        const announcements: FeedItem[] = announcementsData.success
          ? (announcementsData.announcements ?? [])
              .map((a: any) => ({
                id: `${ANNOUNCEMENT_PREFIX}${a._id}`,
                title: a.title,
                message: a.content ?? "",
                createdAt: a.createdAt,
                read: false,
                announcement: true,
                actionUrl: null,
              }))
              .filter((a: FeedItem) => !dismissedAnnouncements.has(a.id))
              .map((a: FeedItem) => ({ ...a, read: readAnnouncements.has(a.id) }))
          : []

        const all = [...notifications, ...announcements].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        if (seenIds.current === null) {
          seenIds.current = new Set(all.map((item) => item.id))
        } else {
          const fresh = all.filter((item) => !item.read && !seenIds.current!.has(item.id))
          all.forEach((item) => seenIds.current!.add(item.id))
          if (fresh.length > 0) onNewRef.current?.(fresh)
        }

        setItems(all)
      } catch (error) {
        // Keep what is on screen; the next poll will try again.
        console.error("Error fetching notifications:", error)
      } finally {
        setRefreshing(false)
      }
    },
    [role, readKey, dismissedKey]
  )

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    getCurrentUser()
      .then(async (user) => {
        if (cancelled || !user?._id) return
        setUserId(String(user._id))
        await load()
        if (cancelled) return
        timer = setInterval(() => {
          // No point polling a tab nobody is looking at; it catches up on the next tick.
          if (document.visibilityState === "visible") load()
        }, pollMs)
      })
      .catch((error) => console.error("Error loading user for notifications:", error))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [load, pollMs])

  useEffect(() => {
    if (!userId) return
    const reload = () => load()
    window.addEventListener(CHANGED_EVENT, reload)
    return () => window.removeEventListener(CHANGED_EVENT, reload)
  }, [load, userId])

  const refresh = useCallback(() => {
    if (userId) return load({ silent: false })
  }, [load, userId])

  const setRead = (ids: string[], read: boolean) =>
    setItems((prev) => prev.map((item) => (ids.includes(item.id) ? { ...item, read } : item)))

  /** Save one item as read, without telling the other feeds - callers do that once. */
  const persistRead = useCallback(
    async (id: string) => {
      setRead([id], true)
      if (id.startsWith(ANNOUNCEMENT_PREFIX)) {
        const ids = readIdSet(readKey)
        ids.add(id)
        writeIdSet(readKey, ids)
        return
      }
      try {
        const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" })
        if (!res.ok) setRead([id], false)
      } catch {
        setRead([id], false)
      }
    },
    [readKey]
  )

  const markRead = useCallback(
    async (id: string) => {
      await persistRead(id)
      announceChange()
    },
    [persistRead]
  )

  const markAllRead = useCallback(async () => {
    const unread = items.filter((item) => !item.read)
    if (unread.length === 0) return
    setRead(unread.map((item) => item.id), true)

    const announcements = unread.filter((item) => item.announcement)
    if (announcements.length > 0) {
      const ids = readIdSet(readKey)
      announcements.forEach((item) => ids.add(item.id))
      writeIdSet(readKey, ids)
    }

    const notificationIds = unread.filter((item) => !item.announcement).map((item) => item.id)
    if (notificationIds.length > 0) {
      try {
        const res = await fetch("/api/notifications/mark-all-read", { method: "POST" })
        if (!res.ok) setRead(notificationIds, false)
      } catch {
        setRead(notificationIds, false)
      }
    }
    announceChange()
  }, [items, readKey])

  /** Hide one item from this user's feed. Superadmin can still see and restore notifications. */
  const dismiss = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id))
      if (id.startsWith(ANNOUNCEMENT_PREFIX)) {
        const ids = readIdSet(dismissedKey)
        ids.add(id)
        writeIdSet(dismissedKey, ids)
        announceChange()
        return
      }
      try {
        await fetch(`/api/notifications?id=${id}`, { method: "DELETE" })
      } catch {
        // It reappears on the next poll, which is the honest outcome of a failed delete.
      }
      announceChange()
    },
    [dismissedKey]
  )

  const unreadCount = items.filter((item) => !item.read).length

  return { userId, items, unreadCount, loading, refreshing, refresh, markRead, markAllRead, dismiss }
}

/** Announcement bodies are HTML; the bell shows a one-line text preview. */
export function toPlainText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}
