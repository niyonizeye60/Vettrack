"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Send, Plus, Loader2, Search, Archive, ArchiveRestore, MoreVertical,
  Pencil, Trash2, Check, CheckCheck, Ban, Flag, ArrowLeft, X, CheckSquare, Square,
  User, MessageSquare, Eye, Mail, Phone, MapPin, Award, Clock,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"

type Conversation = {
  id: string
  otherUser: {
    id: string
    name: string
    role: string
    image?: string | null
    isOnline: boolean
  }
  lastMessage?: {
    content: string
    isDeleted?: boolean
    createdAt: string
  }
  unreadCount: number
  updatedAt: string
  isArchived: boolean
  isBlocked: boolean
}

type Message = {
  id: string
  content: string
  senderId: string
  isMe: boolean
  isDeleted?: boolean
  createdAt: string
  readAt: string | null
  editedAt: string | null
  status: "sent" | "delivered" | "read"
}

type User = {
  id: string
  name: string
  role: string
  specialization?: string
  location?: string
  image?: string | null
  email?: string
  phone?: string
  licenseNumber?: string
  bio?: string
  availability?: { days?: string[]; hours?: { start?: string; end?: string } }
}

type SearchResult = {
  messageId: string
  conversationId: string
  content: string
  createdAt: string
  otherUserName: string
}

const MESSAGES_POLL_MS = 1200
const CONVERSATIONS_POLL_MS = 3000
const TYPING_THROTTLE_MS = 2000
const SEARCH_DEBOUNCE_MS = 300
const EDIT_WINDOW_MS = 15 * 60 * 1000
const MESSAGE_HOVER_ACTIONS_MS = 3000

function canEditMessage(message: Message): boolean {
  return Date.now() - new Date(message.createdAt).getTime() <= EDIT_WINDOW_MS
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function buildTheme(variant: "default" | "vet") {
  if (variant === "vet") {
    return {
      card:            "border border-gray-200 shadow-sm",
      searchInput:     "pl-9 bg-white",
      msgInput:        "flex-1 bg-white",
      sendBtn:         "flex-shrink-0 bg-green-600 hover:bg-green-700 text-white",
      newChatBtn:      "bg-green-600 hover:bg-green-700 text-white",
      archiveActive:   "bg-green-600 hover:bg-green-700 text-white",
      selectedConv:    "bg-green-50",
      unreadBadge:     "bg-green-600 text-white",
      avatarFallback:  "bg-green-100 text-green-700 font-medium",
      sentBubble:      "bg-green-600 text-white",
      sentTime:        "text-white/70",
      readTick:        "text-blue-200",
      otherTick:       "text-white/70",
      selectIcon:      "text-green-600",
      typingText:      "italic text-green-600",
      convAvatar:      "vet",   // renders amber User icon pill instead of Avatar
    } as const
  }
  return {
    card:            "",
    searchInput:     "pl-9 rounded-full bg-gray-50",
    msgInput:        "flex-1 rounded-full bg-gray-50",
    sendBtn:         "rounded-full flex-shrink-0",
    newChatBtn:      "",
    archiveActive:   "",
    selectedConv:    "bg-primary/5",
    unreadBadge:     "bg-primary text-white",
    avatarFallback:  "bg-emerald-100 text-emerald-700 font-medium",
    sentBubble:      "bg-primary text-primary-foreground",
    sentTime:        "text-primary-foreground/70",
    readTick:        "text-blue-300",
    otherTick:       "text-primary-foreground/70",
    selectIcon:      "text-primary",
    typingText:      "italic text-primary",
    convAvatar:      "default",
  } as const
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface MessagesPanelProps {
  variant?: "default" | "vet"
}

export function MessagesPanel({ variant = "default" }: MessagesPanelProps) {
  const th = buildTheme(variant)
  const { t } = useLanguage()
  const { toast } = useToast()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [viewingProfile, setViewingProfile] = useState<User | null>(null)
  const [actionError, setActionError] = useState("")
  const [loadError, setLoadError] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const [otherUserPresence, setOtherUserPresence] = useState<{ isOnline: boolean } | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)

  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [submittingReport, setSubmittingReport] = useState(false)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([])
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const [messageSelectMode, setMessageSelectMode] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([])
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastTypingSentAtRef = useRef(0)
  const conversationListRef = useRef<HTMLDivElement>(null)
  const userScrolledRef = useRef(false)
  const hoverHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Bumped on every fetchMessages/fetchConversations call (and whenever the
  // open chat is closed). Each in-flight request captures the value at the
  // moment it was sent; when it resolves, it only applies its data if it's
  // still the most recent one issued. Network responses can arrive out of
  // order (especially under production latency/jitter), so without this a
  // slow response for a conversation the user already navigated away from
  // can land after the fresh one and silently overwrite it.
  const messagesRequestIdRef = useRef(0)
  const conversationsRequestIdRef = useRef(0)

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null
  const searchParams = useSearchParams()

  useEffect(() => { fetchConversations(); fetchAvailableUsers() }, [])
  useEffect(() => { fetchConversations() }, [showArchived])

  // Deep-link support: /messages?conversationId=... (used by dashboard "recent
  // messages" links and chat notifications) opens straight into that thread.
  useEffect(() => {
    const conversationId = searchParams.get('conversationId')
    if (conversationId) setSelectedConversationId(conversationId)
  }, [searchParams])

  useEffect(() => {
    setMessageSelectMode(false)
    setSelectedMessageIds([])
    if (selectedConversationId) {
      setMessages([])
      setMessagesLoading(true)
      fetchMessages(selectedConversationId).finally(() => setMessagesLoading(false))
    } else {
      // No new fetch is being issued, so nothing below will invalidate a
      // request still in flight for the conversation that was just closed -
      // bump the token ourselves so its response gets ignored instead of
      // reopening the chat it belonged to.
      messagesRequestIdRef.current++
      setMessages([])
      setOtherUserPresence(null)
      setTypingUsers([])
    }
  }, [selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) return
    const interval = setInterval(() => fetchMessages(selectedConversationId), MESSAGES_POLL_MS)
    return () => clearInterval(interval)
  }, [selectedConversationId])

  useEffect(() => {
    if (selectedConversationId) return
    const interval = setInterval(() => fetchConversations(), CONVERSATIONS_POLL_MS)
    return () => clearInterval(interval)
  }, [showArchived, selectedConversationId])

  useEffect(() => {
    if (userScrolledRef.current) return
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  useEffect(() => { userScrolledRef.current = false }, [selectedConversationId])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) { setSearchResults([]); setSearching(false); return }
    setSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (res.ok) setSearchResults(data.results)
      } catch { /* ignore */ } finally { setSearching(false) }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  // ─── API calls ────────────────────────────────────────────────────────────
  const fetchConversations = async () => {
    const requestId = ++conversationsRequestIdRef.current
    try {
      const res = await fetch(`/api/chat/conversations?includeArchived=${showArchived}`)
      const data = await res.json()
      if (requestId !== conversationsRequestIdRef.current) return []
      if (res.ok) { setConversations(data.conversations); setLoadError(false); return data.conversations as Conversation[] }
    } catch { if (loading) setLoadError(true) } finally { setLoading(false) }
    return []
  }

  const fetchMessages = async (conversationId: string) => {
    const requestId = ++messagesRequestIdRef.current
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`)
      const data = await res.json()
      // A newer request (switching conversations, the next poll tick, or
      // closing the chat) was issued after this one - even if this response
      // happens to arrive last, it's stale and must not overwrite what's
      // currently selected.
      if (requestId !== messagesRequestIdRef.current) return
      if (res.ok) {
        setMessages(data.messages)
        setOtherUserPresence(data.otherUserPresence)
        setTypingUsers(data.typingUsers || [])
      } else if (res.status === 404) {
        setSelectedConversationId(null)
        fetchConversations()
      }
    } catch { /* ignore */ }
  }

  const fetchAvailableUsers = async () => {
    try {
      const res = await fetch('/api/chat/users')
      const data = await res.json()
      if (res.ok) setAvailableUsers(data.users)
    } catch { /* ignore */ }
  }

  const startNewConversation = async (userId: string) => {
    setActionError("")
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: userId })
      })
      const data = await res.json()
      if (res.ok) {
        setShowNewChat(false); setViewingProfile(null); setShowArchived(false)
        await fetchConversations()
        setSelectedConversationId(data.conversationId)
      } else { setActionError(t('farmer.failedToStartConversation')) }
    } catch { setActionError(t('farmer.failedToStartConversation')) }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId || sending) return
    setSending(true); setActionError("")
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversationId, content: newMessage })
      })
      const data = await res.json()
      if (res.ok) { setMessages(prev => [...prev, data.message]); setNewMessage(""); fetchConversations() }
      else setActionError(t('farmer.messageSendFailed'))
    } catch { setActionError(t('farmer.messageSendFailed')) } finally { setSending(false) }
  }

  const handleTypingChange = (value: string) => {
    setNewMessage(value)
    if (!selectedConversationId) return
    const now = Date.now()
    if (now - lastTypingSentAtRef.current > TYPING_THROTTLE_MS) {
      lastTypingSentAtRef.current = now
      fetch('/api/chat/typing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversationId })
      }).catch(() => {})
    }
  }

  const handleMessageMouseEnter = (messageId: string) => {
    if (hoverHideTimeoutRef.current) clearTimeout(hoverHideTimeoutRef.current)
    setHoveredMessageId(messageId)
    hoverHideTimeoutRef.current = setTimeout(() => setHoveredMessageId(null), MESSAGE_HOVER_ACTIONS_MS)
  }

  useEffect(() => () => { if (hoverHideTimeoutRef.current) clearTimeout(hoverHideTimeoutRef.current) }, [])

  const startEditingMessage = (message: Message) => {
    if (!canEditMessage(message)) { setActionError(t('farmer.editWindowExpired')); return }
    setEditingMessageId(message.id); setEditingContent(message.content)
  }
  const cancelEditingMessage = () => { setEditingMessageId(null); setEditingContent("") }

  const saveEditedMessage = async () => {
    if (!editingMessageId || !editingContent.trim()) return
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: editingMessageId, content: editingContent })
      })
      const data = await res.json()
      if (res.ok) { setMessages(prev => prev.map(m => m.id === editingMessageId ? data.message : m)); cancelEditingMessage() }
      else setActionError(t('farmer.messageEditFailed'))
    } catch { setActionError(t('farmer.messageEditFailed')) }
  }

  const handleDeleteMessage = async () => {
    if (!deleteMessageId) return
    const messageId = deleteMessageId; setDeleteMessageId(null)
    try {
      const res = await fetch(`/api/chat/messages?messageId=${messageId}`, { method: 'DELETE' })
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: "", isDeleted: true } : m))
        fetchConversations()
      }
      else setActionError(t('farmer.messageDeleteFailed'))
    } catch { setActionError(t('farmer.messageDeleteFailed')) }
  }

  const enterMessageSelectMode = () => { cancelEditingMessage(); setMessageSelectMode(true) }
  const exitMessageSelectMode = () => { setMessageSelectMode(false); setSelectedMessageIds([]) }
  const toggleMessageSelected = (id: string) =>
    setSelectedMessageIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const confirmBulkDeleteMessages = async () => {
    if (selectedMessageIds.length === 0) return
    setBulkDeleting(true)
    try {
      const ids = selectedMessageIds
      const results = await Promise.all(
        ids.map(id => fetch(`/api/chat/messages?messageId=${id}`, { method: 'DELETE' }))
      )
      const deletedIds = ids.filter((_, i) => results[i].ok)
      if (deletedIds.length > 0) {
        setMessages(prev => prev.map(m => deletedIds.includes(m.id) ? { ...m, content: "", isDeleted: true } : m))
        fetchConversations()
      }
      if (deletedIds.length < ids.length) toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    } catch { toast({ title: t('farmer.actionFailed'), variant: "destructive" }) }
    finally { setBulkDeleting(false); setBulkDeleteConfirmOpen(false); exitMessageSelectMode() }
  }

  const handleArchiveToggle = async (conversation: Conversation) => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversation.id, action: conversation.isArchived ? "unarchive" : "archive" })
      })
      if (res.ok) { if (!conversation.isArchived) setSelectedConversationId(null); fetchConversations() }
      else toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    } catch { toast({ title: t('farmer.actionFailed'), variant: "destructive" }) }
  }

  const handleBlockToggle = async (conversation: Conversation) => {
    try {
      const res = await fetch('/api/chat/block', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversation.id, action: conversation.isBlocked ? "unblock" : "block" })
      })
      if (res.ok) {
        toast({ title: conversation.isBlocked ? t('farmer.conversationUnblocked') : t('farmer.conversationBlocked') })
        fetchConversations()
      } else toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    } catch { toast({ title: t('farmer.actionFailed'), variant: "destructive" }) }
  }

  const toggleSelectMode = () => { setSelectMode(prev => !prev); setSelectedConversationIds([]) }
  const toggleConversationSelected = (id: string) =>
    setSelectedConversationIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const confirmRemoveSelected = async () => {
    if (selectedConversationIds.length === 0) return
    setRemoving(true)
    try {
      const results = await Promise.all(
        selectedConversationIds.map(id => fetch(`/api/chat/conversations?conversationId=${id}`, { method: 'DELETE' }))
      )
      const removedIds = selectedConversationIds.filter((_, i) => results[i].ok)
      if (removedIds.length > 0) {
        setConversations(prev => prev.filter(c => !removedIds.includes(c.id)))
        if (selectedConversationId && removedIds.includes(selectedConversationId)) setSelectedConversationId(null)
        toast({ title: t('farmer.conversationsRemoved') })
      }
      if (removedIds.length < selectedConversationIds.length)
        toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    } catch { toast({ title: t('farmer.actionFailed'), variant: "destructive" }) }
    finally { setRemoving(false); setRemoveConfirmOpen(false); setSelectMode(false); setSelectedConversationIds([]) }
  }

  const submitReport = async () => {
    if (!selectedConversationId || !reportReason.trim() || submittingReport) return
    setSubmittingReport(true)
    try {
      const res = await fetch('/api/chat/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversationId, reason: reportReason })
      })
      if (res.ok) { toast({ title: t('farmer.reportSubmitted') }); setReportDialogOpen(false); setReportReason("") }
      else toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    } catch { toast({ title: t('farmer.actionFailed'), variant: "destructive" }) }
    finally { setSubmittingReport(false) }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const diffInHours = (Date.now() - date.getTime()) / (1000 * 60 * 60)
    return diffInHours < 24
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString()
  }

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return t('farmer.today')
    if (date.toDateString() === yesterday.toDateString()) return t('farmer.yesterday')
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  }

  const messageItems = useMemo(() => {
    const items: ({ kind: 'date'; key: string; label: string } | { kind: 'message'; key: string; message: Message })[] = []
    let lastDateKey: string | null = null
    for (const message of messages) {
      const dateKey = new Date(message.createdAt).toDateString()
      if (dateKey !== lastDateKey) {
        items.push({ kind: 'date', key: `date-${dateKey}`, label: formatDateDivider(message.createdAt) })
        lastDateKey = dateKey
      }
      items.push({ kind: 'message', key: message.id, message })
    }
    return items
  }, [messages])

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter(c =>
      c.otherUser.name?.toLowerCase().includes(query) ||
      c.lastMessage?.content?.toLowerCase().includes(query)
    )
  }, [conversations, searchQuery])

  const isOtherOnline = selectedConversationId
    ? (otherUserPresence?.isOnline ?? selectedConversation?.otherUser.isOnline ?? false)
    : false
  const isTyping = typingUsers.length > 0

  // ─── Conversation avatar — farmer icon for vet variant ────────────────────
  const ConvAvatar = ({ conv, size = "md" }: { conv: Conversation; size?: "sm" | "md" }) => {
    if (th.convAvatar === "vet") {
      return (
        <div className="relative flex-shrink-0">
          <div className={`bg-amber-100 rounded-lg flex items-center justify-center ${size === "sm" ? "p-1.5" : "p-2"}`}>
            <User className={`text-amber-600 ${size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
          </div>
          {conv.otherUser.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
          )}
        </div>
      )
    }
    return (
      <div className="relative flex-shrink-0">
        <Avatar className={size === "sm" ? "h-9 w-9" : undefined}>
          <AvatarImage src={conv.otherUser.image ?? undefined} alt={conv.otherUser.name} />
          <AvatarFallback className={th.avatarFallback}>
            {conv.otherUser.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        {conv.otherUser.isOnline && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
        )}
      </div>
    )
  }

  // ─── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full min-h-0 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
          <Card className={`flex-1 min-h-0 overflow-hidden flex flex-col ${th.card} animate-pulse`}>
            <div className="p-3 border-b border-gray-100 flex-shrink-0">
              <div className="h-9 bg-gray-200 rounded-md" />
            </div>
            <div className="flex-1 overflow-hidden p-2 space-y-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className={`hidden md:flex flex-[2] min-h-0 flex-col ${th.card} animate-pulse`}>
            <div className="p-3 border-b border-gray-100 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-200" />
              <div className="h-3.5 bg-gray-200 rounded w-32" />
            </div>
            <div className="flex-1 p-4 space-y-3">
              <div className="h-10 bg-gray-200 rounded-2xl w-1/2" />
              <div className="h-10 bg-gray-200 rounded-2xl w-2/3 ml-auto" />
              <div className="h-10 bg-gray-200 rounded-2xl w-1/3" />
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (loadError && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <p className="text-sm text-red-500">{t('farmer.failedToLoadConversations')}</p>
        <Button size="sm" onClick={() => { setLoadError(false); fetchConversations() }}>
          {t('farmer.retry')}
        </Button>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {actionError && <p className="text-sm text-red-500 flex-shrink-0">{actionError}</p>}
      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

        {/* ── Conversations list ──────────────────────────────────────────── */}
        <Card className={`flex-1 min-h-0 overflow-hidden flex flex-col ${th.card} ${selectedConversationId ? "hidden md:flex" : "flex"}`}>

          {/* Header / search bar */}
          <div className="p-3 border-b border-gray-100 space-y-2 flex-shrink-0">
            {selectMode ? (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {selectedConversationIds.length > 0
                    ? `${selectedConversationIds.length} ${t('farmer.selected')}`
                    : t('farmer.selectConversations')}
                </span>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="destructive" disabled={selectedConversationIds.length === 0}
                    title={t('farmer.removeFromChat')} onClick={() => setRemoveConfirmOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={toggleSelectMode}>{t('common.cancel')}</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder={t('farmer.searchMessages')} className={th.searchInput}
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Button size="icon" variant="outline" title={t('farmer.selectConversations')}
                  disabled={conversations.length === 0} onClick={toggleSelectMode}>
                  <CheckSquare className="h-4 w-4" />
                </Button>
                <Button size="icon"
                  variant={showArchived ? "default" : "outline"}
                  className={showArchived ? th.archiveActive : ""}
                  title={t('farmer.archived')}
                  onClick={() => { setShowArchived(prev => !prev); setSelectedConversationId(null) }}>
                  <Archive className="h-4 w-4" />
                </Button>
                <Dialog open={showNewChat} onOpenChange={(open) => { setShowNewChat(open); if (!open) setViewingProfile(null) }}>
                  <DialogTrigger asChild>
                    <Button size="icon" className={th.newChatBtn} title={t('farmer.startNewConversation')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    {viewingProfile ? (
                      <>
                        <DialogHeader>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="-ml-2 h-7 w-7"
                              onClick={() => setViewingProfile(null)}>
                              <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <DialogTitle>{t('farmer.vetProfile')}</DialogTitle>
                          </div>
                        </DialogHeader>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 flex-shrink-0">
                              <AvatarImage src={viewingProfile.image ?? undefined} alt={viewingProfile.name} />
                              <AvatarFallback className={`text-lg ${th.avatarFallback}`}>
                                {viewingProfile.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-base text-gray-900 truncate">
                                {viewingProfile.role === 'doctor' ? `Dr. ${viewingProfile.name}` : viewingProfile.name}
                              </h3>
                              {viewingProfile.specialization && (
                                <Badge variant="secondary" className="mt-1">{viewingProfile.specialization}</Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            {viewingProfile.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span className="truncate">{viewingProfile.email}</span>
                              </div>
                            )}
                            {viewingProfile.phone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span>{viewingProfile.phone}</span>
                              </div>
                            )}
                            {viewingProfile.location && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span>{viewingProfile.location}</span>
                              </div>
                            )}
                            {viewingProfile.licenseNumber && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Award className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span>{t('farmer.licenseNumber')}: {viewingProfile.licenseNumber}</span>
                              </div>
                            )}
                            {viewingProfile.availability?.hours?.start && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span>
                                  {viewingProfile.availability.days?.length ? `${viewingProfile.availability.days.join(', ')} · ` : ''}
                                  {viewingProfile.availability.hours.start} - {viewingProfile.availability.hours.end}
                                </span>
                              </div>
                            )}
                          </div>

                          {viewingProfile.bio && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('farmer.about')}</h4>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingProfile.bio}</p>
                            </div>
                          )}
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setViewingProfile(null)}>{t('common.close')}</Button>
                          <Button className={th.newChatBtn} onClick={() => startNewConversation(viewingProfile.id)}>
                            <Send className="h-4 w-4 mr-2" />{t('farmer.sendMessage')}
                          </Button>
                        </DialogFooter>
                      </>
                    ) : (
                      <>
                        <DialogHeader>
                          <DialogTitle>{t('farmer.startNewConversation')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {availableUsers.map(user => (
                            <div key={user.id}
                              className="flex items-center gap-2 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                              <button type="button" className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                onClick={() => setViewingProfile(user)}>
                                {th.convAvatar === "vet" && !user.image ? (
                                  <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
                                    <User className="h-4 w-4 text-amber-600" />
                                  </div>
                                ) : (
                                  <Avatar className="h-9 w-9 flex-shrink-0">
                                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                                    <AvatarFallback className={th.avatarFallback}>
                                      {user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-gray-800 truncate">{user.name}</p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {user.role === 'doctor' ? (user.specialization ? `Dr. · ${user.specialization}` : 'Veterinarian') : (user.location ?? 'Farmer')}
                                  </p>
                                </div>
                              </button>
                              <Button size="icon" variant="ghost" className="flex-shrink-0" title={t('farmer.viewProfile')}
                                onClick={() => setViewingProfile(user)}>
                                <Eye className="h-4 w-4 text-gray-500" />
                              </Button>
                              <Button size="icon" className={`flex-shrink-0 ${th.newChatBtn}`} title={t('farmer.sendMessage')}
                                onClick={() => startNewConversation(user.id)}>
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Inline search results */}
            {!selectMode && searchQuery.trim() && (
              <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto bg-white shadow-sm">
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                  {searching ? t('farmer.searching') : `${t('farmer.searchResultsFor')} "${searchQuery.trim()}"`}
                </div>
                {!searching && searchResults.length === 0 && (
                  <div className="px-3 py-3 text-sm text-gray-400">{t('farmer.noSearchResults')}</div>
                )}
                {searchResults.map(result => (
                  <div key={result.messageId}
                    className="px-3 py-2 border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => { setSelectedConversationId(result.conversationId); setSearchQuery("") }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate">{result.otherUserName}</span>
                      <span className="text-xs text-gray-400">{formatTime(result.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{result.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversation rows */}
          <div className="overflow-y-auto flex-1" ref={conversationListRef}>
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-gray-100 rounded-full w-10 h-10 mx-auto mb-2 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  {showArchived ? t('farmer.noArchivedConversations') : t('farmer.noConversationsYet')}
                </p>
              </div>
            ) : filteredConversations.map(conv => {
              const isSelected = selectMode
                ? selectedConversationIds.includes(conv.id)
                : selectedConversationId === conv.id
              return (
                <div key={conv.id}
                  className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors duration-150 ${isSelected ? th.selectedConv : ""}`}
                  onClick={() => selectMode ? toggleConversationSelected(conv.id) : setSelectedConversationId(conv.id)}>
                  <div className="flex items-start gap-3">
                    {selectMode && (
                      <div className="pt-1 text-gray-400">
                        {isSelected
                          ? <CheckSquare className={`h-4 w-4 ${th.selectIcon}`} />
                          : <Square className="h-4 w-4" />}
                      </div>
                    )}
                    <ConvAvatar conv={conv} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <h4 className="font-semibold text-sm text-gray-800 truncate flex items-center gap-1">
                          {conv.otherUser.name}
                          {conv.isBlocked && <Ban className="h-3 w-3 text-red-500 flex-shrink-0" />}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {conv.unreadCount > 0 && (
                            <Badge className={`text-xs px-1.5 py-0 h-4 min-w-[1rem] ${th.unreadBadge}`}>{conv.unreadCount}</Badge>
                          )}
                          <span className="text-xs text-gray-400">
                            {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''}
                          </span>
                        </div>
                      </div>
                      <p className={`text-xs mt-0.5 truncate ${conv.unreadCount > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                        {conv.lastMessage
                          ? (conv.lastMessage.isDeleted ? t('farmer.messageDeleted') : conv.lastMessage.content)
                          : t('farmer.noMessagesYet')}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── Messages pane ───────────────────────────────────────────────── */}
        <Card className={`flex-[2] min-h-0 flex flex-col ${th.card} ${selectedConversationId ? "flex" : "hidden md:flex"}`}>
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="p-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
                {messageSelectMode ? (
                  <>
                    <span className="text-sm font-medium text-gray-700">
                      {selectedMessageIds.length > 0
                        ? `${selectedMessageIds.length} ${t('farmer.selected')}`
                        : t('farmer.selectMessages')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="destructive" disabled={selectedMessageIds.length === 0}
                        title={t('farmer.deleteSelectedMessages')} onClick={() => setBulkDeleteConfirmOpen(true)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={exitMessageSelectMode}>{t('common.cancel')}</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <Button variant="ghost" size="icon" className="md:hidden -ml-1"
                        onClick={() => setSelectedConversationId(null)}>
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <ConvAvatar conv={selectedConversation} />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 truncate">{selectedConversation.otherUser.name}</h3>
                        <p className="text-xs truncate">
                          {isTyping
                            ? <span className={th.typingText}>{t('farmer.typing')}</span>
                            : isOtherOnline
                              ? <span className="text-green-600">{t('farmer.online')}</span>
                              : <span className="text-gray-400">
                                  {selectedConversation.otherUser.role === 'doctor' ? t('farmer.veterinarian') : t('farmer.farmer')}
                                </span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedConversationId(null)}>
                            <X className="mr-2 h-4 w-4" />{t('farmer.closeChat')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={enterMessageSelectMode}
                            disabled={!messages.some(m => m.isMe && !m.isDeleted)}>
                            <CheckSquare className="mr-2 h-4 w-4" />{t('farmer.selectMessages')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleArchiveToggle(selectedConversation)}>
                            {selectedConversation.isArchived
                              ? <><ArchiveRestore className="mr-2 h-4 w-4" />{t('farmer.unarchiveConversation')}</>
                              : <><Archive className="mr-2 h-4 w-4" />{t('farmer.archiveConversation')}</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBlockToggle(selectedConversation)}>
                            <Ban className="mr-2 h-4 w-4" />
                            {selectedConversation.isBlocked ? t('farmer.unblockUser') : t('farmer.blockUser')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setReportDialogOpen(true)} className="text-red-600 focus:text-red-600">
                            <Flag className="mr-2 h-4 w-4" />{t('farmer.reportUser')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="icon" className="hidden md:inline-flex"
                        title={t('farmer.closeChat')} onClick={() => setSelectedConversationId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Message thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3"
                onScroll={(e) => {
                  const t = e.target as HTMLDivElement
                  userScrolledRef.current = t.scrollHeight - t.scrollTop - t.clientHeight >= 100
                }}>
                {messagesLoading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-10 bg-gray-200 rounded-2xl w-1/2" />
                    <div className="h-10 bg-gray-200 rounded-2xl w-2/3 ml-auto" />
                    <div className="h-10 bg-gray-200 rounded-2xl w-1/3" />
                    <div className="h-10 bg-gray-200 rounded-2xl w-1/2 ml-auto" />
                  </div>
                ) : messageItems.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-8">{t('farmer.noMessagesStart')}</div>
                ) : messageItems.map(item => {
                  if (item.kind === 'date') {
                    return (
                      <div key={item.key} className="flex items-center justify-center py-1">
                        <span className="text-xs font-medium text-gray-400 tracking-wide uppercase bg-gray-50 px-2 py-0.5 rounded-full">
                          {item.label}
                        </span>
                      </div>
                    )
                  }
                  const msg = item.message
                  const selectable = messageSelectMode && msg.isMe && !msg.isDeleted
                  const isSelected = selectedMessageIds.includes(msg.id)
                  return (
                    <div key={item.key} className={`flex items-center gap-2 ${msg.isMe ? "justify-end" : "justify-start"} ${messageSelectMode && !selectable ? "opacity-50" : ""}`}
                      onMouseEnter={() => !messageSelectMode && handleMessageMouseEnter(msg.id)}
                      onClick={() => selectable && toggleMessageSelected(msg.id)}>
                      {selectable && (
                        isSelected
                          ? <CheckSquare className={`h-4 w-4 flex-shrink-0 ${th.selectIcon}`} />
                          : <Square className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      )}
                      <div className={`relative max-w-[78%] px-3 py-2 rounded-2xl ${selectable ? "cursor-pointer" : ""} ${
                        isSelected ? "ring-2 ring-offset-1 ring-primary" : ""
                      } ${
                        msg.isDeleted
                          ? "bg-gray-50 text-gray-400 border border-gray-100 rounded-bl-sm"
                          : msg.isMe
                            ? `${th.sentBubble} rounded-br-sm`
                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}>
                        {msg.isDeleted ? (
                          <p className="text-sm italic">{t('farmer.messageDeleted')}</p>
                        ) : editingMessageId === msg.id ? (
                          <div className="space-y-2 min-w-[200px]">
                            <Textarea value={editingContent} onChange={e => setEditingContent(e.target.value)}
                              className="text-sm text-gray-900 bg-white" rows={2} autoFocus />
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditingMessage}>
                                <X className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEditedMessage}>
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {msg.isMe && !messageSelectMode && hoveredMessageId === msg.id && (
                              <div className="absolute -top-7 right-0 flex bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                {canEditMessage(msg) && (
                                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-none text-gray-600"
                                    title={t('common.edit')} onClick={() => startEditingMessage(msg)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-none text-red-500"
                                  title={t('common.delete')} onClick={() => setDeleteMessageId(msg.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-0.5 ${msg.isMe ? "justify-end" : "justify-start"}`}>
                              <span className={`text-xs ${msg.isMe ? th.sentTime : "text-gray-400"}`}>
                                {formatTime(msg.createdAt)}{msg.editedAt && ` · edited`}
                              </span>
                              {msg.isMe && (
                                msg.status === "read"
                                  ? <CheckCheck className={`h-3 w-3 ${th.readTick}`} />
                                  : msg.status === "delivered"
                                    ? <CheckCheck className={`h-3 w-3 ${th.otherTick}`} />
                                    : <Check className={`h-3 w-3 ${th.otherTick}`} />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              {selectedConversation.isBlocked ? (
                <div className="p-4 border-t border-gray-100 text-center text-sm text-gray-500 flex-shrink-0">
                  {t('farmer.conversationBlockedNotice')}
                </div>
              ) : (
                <div className="p-3 border-t border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Input placeholder={t('farmer.typeMessage')} value={newMessage}
                      onChange={e => handleTypingChange(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                      className={th.msgInput} disabled={sending} />
                    <Button onClick={handleSendMessage} size="icon" className={th.sendBtn}
                      disabled={sending || !newMessage.trim()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8">
              <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">{t('farmer.selectConversation')}</p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Dialogs (unchanged logic) ──────────────────────────────────────── */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={open => !open && setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('farmer.deleteMessageConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-red-600 hover:bg-red-700 text-white">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={open => !bulkDeleting && setBulkDeleteConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('farmer.deleteMessagesConfirm').replace('{count}', String(selectedMessageIds.length))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDeleteMessages} disabled={bulkDeleting}
              className="bg-red-600 hover:bg-red-700 text-white">
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeConfirmOpen} onOpenChange={open => !removing && setRemoveConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.removeFromChat')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('farmer.removeConversationsConfirm').replace('{count}', String(selectedConversationIds.length))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveSelected} disabled={removing}
              className="bg-red-600 hover:bg-red-700 text-white">
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : t('farmer.removeFromChat')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('farmer.reportUser')}</DialogTitle></DialogHeader>
          <Textarea placeholder={t('farmer.reportReasonPlaceholder')} value={reportReason}
            onChange={e => setReportReason(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={submitReport} disabled={!reportReason.trim() || submittingReport}>
              {submittingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : t('farmer.submitReport')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
