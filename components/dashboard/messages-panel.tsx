"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Send, Plus, Loader2, Search, Archive, ArchiveRestore, MoreVertical,
  Pencil, Trash2, Check, CheckCheck, Ban, Flag, ArrowLeft, X, CheckSquare, Square
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

function canEditMessage(message: Message): boolean {
  return Date.now() - new Date(message.createdAt).getTime() <= EDIT_WINDOW_MS
}

export function MessagesPanel() {
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

  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [submittingReport, setSubmittingReport] = useState(false)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([])
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastTypingSentAtRef = useRef(0)
  const conversationListRef = useRef<HTMLDivElement>(null)
  const userScrolledRef = useRef(false)

  // Derived from conversations + selectedConversationId so it always reflects the
  // latest poll without re-triggering effects keyed on conversation identity.
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null

  useEffect(() => {
    fetchConversations()
    fetchAvailableUsers()
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [showArchived])

  useEffect(() => {
    if (selectedConversationId) {
      // Clear the previous conversation's messages immediately so switching
      // chats never briefly shows the old thread while the new one loads.
      setMessages([])
      setMessagesLoading(true)
      fetchMessages(selectedConversationId).finally(() => setMessagesLoading(false))
    } else {
      setMessages([])
      setOtherUserPresence(null)
      setTypingUsers([])
    }
  }, [selectedConversationId])

  // Auto-refresh messages while a conversation is open
  useEffect(() => {
    if (selectedConversationId) {
      const interval = setInterval(() => {
        fetchMessages(selectedConversationId)
      }, MESSAGES_POLL_MS)
      return () => clearInterval(interval)
    }
  }, [selectedConversationId])

  // Auto-refresh conversation list ONLY when no conversation is selected (browsing mode)
  useEffect(() => {
    if (selectedConversationId) return // Don't poll when a conversation is open
    const interval = setInterval(() => {
      fetchConversations()
    }, CONVERSATIONS_POLL_MS)
    return () => clearInterval(interval)
  }, [showArchived, selectedConversationId])

  // Auto-scroll to the latest message ONLY if user hasn't manually scrolled up
  useEffect(() => {
    if (userScrolledRef.current) return // Don't auto-scroll if user is reading older messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  // Reset scroll tracking when conversation changes
  useEffect(() => {
    userScrolledRef.current = false
  }, [selectedConversationId])

  // Debounced "search all messages"
  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/chat/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        if (response.ok) {
          setSearchResults(data.results)
        }
      } catch (error) {
        console.error('Error searching messages:', error)
      } finally {
        setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const fetchConversations = async () => {
    try {
      const response = await fetch(`/api/chat/conversations?includeArchived=${showArchived}`)
      const data = await response.json()
      if (response.ok) {
        setConversations(data.conversations)
        setLoadError(false)
        return data.conversations as Conversation[]
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      if (loading) {
        setLoadError(true)
      }
    } finally {
      setLoading(false)
    }
    return []
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`)
      const data = await response.json()
      if (response.ok) {
        setMessages(data.messages)
        setOtherUserPresence(data.otherUserPresence)
        setTypingUsers(data.typingUsers || [])
      } else if (response.status === 404) {
        // Conversation vanished (e.g. it expired with no messages ever sent) - close it
        setSelectedConversationId(null)
        fetchConversations()
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/chat/users')
      const data = await response.json()
      if (response.ok) {
        setAvailableUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const startNewConversation = async (userId: string) => {
    setActionError("")
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: userId })
      })
      const data = await response.json()
      if (response.ok) {
        setShowNewChat(false)
        setShowArchived(false)
        await fetchConversations()
        setSelectedConversationId(data.conversationId)
      } else {
        setActionError(t('farmer.failedToStartConversation'))
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      setActionError(t('farmer.failedToStartConversation'))
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId || sending) return

    setSending(true)
    setActionError("")
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversationId,
          content: newMessage
        })
      })

      const data = await response.json()
      if (response.ok) {
        setMessages(prev => [...prev, data.message])
        setNewMessage("")
        fetchConversations() // Refresh to update last message
      } else {
        setActionError(t('farmer.messageSendFailed'))
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setActionError(t('farmer.messageSendFailed'))
    } finally {
      setSending(false)
    }
  }

  const handleTypingChange = (value: string) => {
    setNewMessage(value)
    if (!selectedConversationId) return
    const now = Date.now()
    if (now - lastTypingSentAtRef.current > TYPING_THROTTLE_MS) {
      lastTypingSentAtRef.current = now
      fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversationId })
      }).catch(() => {})
    }
  }

  const startEditingMessage = (message: Message) => {
    if (!canEditMessage(message)) {
      setActionError(t('farmer.editWindowExpired'))
      return
    }
    setEditingMessageId(message.id)
    setEditingContent(message.content)
  }

  const cancelEditingMessage = () => {
    setEditingMessageId(null)
    setEditingContent("")
  }

  const saveEditedMessage = async () => {
    if (!editingMessageId || !editingContent.trim()) return
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: editingMessageId, content: editingContent })
      })
      const data = await response.json()
      if (response.ok) {
        setMessages(prev => prev.map(m => m.id === editingMessageId ? data.message : m))
        cancelEditingMessage()
      } else {
        setActionError(t('farmer.messageEditFailed'))
      }
    } catch (error) {
      console.error('Error editing message:', error)
      setActionError(t('farmer.messageEditFailed'))
    }
  }

  const handleDeleteMessage = async () => {
    if (!deleteMessageId) return
    const messageId = deleteMessageId
    setDeleteMessageId(null)
    try {
      const response = await fetch(`/api/chat/messages?messageId=${messageId}`, { method: 'DELETE' })
      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId))
        fetchConversations()
      } else {
        setActionError(t('farmer.messageDeleteFailed'))
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      setActionError(t('farmer.messageDeleteFailed'))
    }
  }

  const handleArchiveToggle = async (conversation: Conversation) => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          action: conversation.isArchived ? "unarchive" : "archive"
        })
      })
      if (response.ok) {
        if (!conversation.isArchived) {
          setSelectedConversationId(null)
        }
        fetchConversations()
      } else {
        toast({ title: t('farmer.actionFailed'), variant: "destructive" })
      }
    } catch (error) {
      console.error('Error toggling archive:', error)
      toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    }
  }

  const handleBlockToggle = async (conversation: Conversation) => {
    try {
      const response = await fetch('/api/chat/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          action: conversation.isBlocked ? "unblock" : "block"
        })
      })
      if (response.ok) {
        toast({
          title: conversation.isBlocked ? t('farmer.conversationUnblocked') : t('farmer.conversationBlocked')
        })
        fetchConversations()
      } else {
        toast({ title: t('farmer.actionFailed'), variant: "destructive" })
      }
    } catch (error) {
      console.error('Error toggling block:', error)
      toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    }
  }

  const toggleSelectMode = () => {
    setSelectMode(prev => !prev)
    setSelectedConversationIds([])
  }

  const toggleConversationSelected = (conversationId: string) => {
    setSelectedConversationIds(prev =>
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    )
  }

  const confirmRemoveSelected = async () => {
    if (selectedConversationIds.length === 0) return
    setRemoving(true)
    try {
      const results = await Promise.all(
        selectedConversationIds.map(id =>
          fetch(`/api/chat/conversations?conversationId=${id}`, { method: 'DELETE' })
        )
      )
      const removedIds = selectedConversationIds.filter((_, i) => results[i].ok)
      if (removedIds.length > 0) {
        setConversations(prev => prev.filter(c => !removedIds.includes(c.id)))
        if (selectedConversationId && removedIds.includes(selectedConversationId)) {
          setSelectedConversationId(null)
        }
        toast({ title: t('farmer.conversationsRemoved') })
      }
      if (removedIds.length < selectedConversationIds.length) {
        toast({ title: t('farmer.actionFailed'), variant: "destructive" })
      }
    } catch (error) {
      console.error('Error removing conversations:', error)
      toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    } finally {
      setRemoving(false)
      setRemoveConfirmOpen(false)
      setSelectMode(false)
      setSelectedConversationIds([])
    }
  }

  const submitReport = async () => {
    if (!selectedConversationId || !reportReason.trim() || submittingReport) return
    setSubmittingReport(true)
    try {
      const response = await fetch('/api/chat/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversationId, reason: reportReason })
      })
      if (response.ok) {
        toast({ title: t('farmer.reportSubmitted') })
        setReportDialogOpen(false)
        setReportReason("")
      } else {
        toast({ title: t('farmer.actionFailed'), variant: "destructive" })
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    } finally {
      setSubmittingReport(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString()
    }
  }

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

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
    return conversations.filter((c) =>
      c.otherUser.name?.toLowerCase().includes(query) ||
      c.lastMessage?.content?.toLowerCase().includes(query)
    )
  }, [conversations, searchQuery])

  const isOtherOnline = selectedConversationId
    ? (otherUserPresence?.isOnline ?? selectedConversation?.otherUser.isOnline ?? false)
    : false
  const isTyping = typingUsers.length > 0

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
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

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {actionError && <p className="text-sm text-red-500 flex-shrink-0">{actionError}</p>}
      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
      {/* Conversations List */}
      <Card className={`flex-1 min-h-0 overflow-hidden flex flex-col ${selectedConversationId ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b space-y-2 flex-shrink-0">
          {selectMode ? (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {selectedConversationIds.length > 0
                  ? `${selectedConversationIds.length} ${t('farmer.selected')}`
                  : t('farmer.selectConversations')}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="destructive"
                  disabled={selectedConversationIds.length === 0}
                  title={t('farmer.removeFromChat')}
                  onClick={() => setRemoveConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={toggleSelectMode}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="relative flex-1 mr-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('farmer.searchMessages')}
                  className="pl-9 rounded-full bg-gray-50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                size="icon"
                variant="outline"
                className="mr-2"
                title={t('farmer.selectConversations')}
                disabled={conversations.length === 0}
                onClick={toggleSelectMode}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={showArchived ? "default" : "outline"}
                className="mr-2"
                title={t('farmer.archived')}
                onClick={() => { setShowArchived(prev => !prev); setSelectedConversationId(null) }}
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('farmer.startNewConversation')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableUsers.map(user => (
                      <div
                        key={user.id}
                        className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                        onClick={() => startNewConversation(user.id)}
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">
                          {user.role === 'doctor' ? `Dr. ${user.specialization}` : user.location}
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {!selectMode && searchQuery.trim() && (
            <div className="border rounded-md max-h-56 overflow-y-auto bg-white shadow-sm">
              <div className="px-3 py-2 text-xs text-gray-500 border-b">
                {searching ? t('farmer.searching') : `${t('farmer.searchResultsFor')} "${searchQuery.trim()}"`}
              </div>
              {!searching && searchResults.length === 0 && (
                <div className="px-3 py-3 text-sm text-gray-400">{t('farmer.noSearchResults')}</div>
              )}
              {searchResults.map((result) => (
                <div
                  key={result.messageId}
                  className="px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    setSelectedConversationId(result.conversationId)
                    setSearchQuery("")
                  }}
                >
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
        <div className="overflow-y-auto flex-1" ref={conversationListRef}>
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {showArchived ? t('farmer.noArchivedConversations') : t('farmer.noConversationsYet')}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectMode
                    ? selectedConversationIds.includes(conversation.id) ? "bg-primary/5" : ""
                    : selectedConversationId === conversation.id ? "bg-primary/5" : ""
                }`}
                onClick={() =>
                  selectMode
                    ? toggleConversationSelected(conversation.id)
                    : setSelectedConversationId(conversation.id)
                }
              >
                <div className="flex items-start space-x-3">
                  {selectMode && (
                    <div className="pt-2 text-gray-400">
                      {selectedConversationIds.includes(conversation.id) ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </div>
                  )}
                  <div className="relative flex-shrink-0">
                    <Avatar>
                      <AvatarImage src={conversation.otherUser.image ?? undefined} alt={conversation.otherUser.name} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                        {conversation.otherUser.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.otherUser.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold truncate flex items-center gap-1">
                        {conversation.otherUser.name}
                        {conversation.isBlocked && <Ban className="h-3 w-3 text-red-500" />}
                      </h4>
                      <div className="flex items-center">
                        {conversation.unreadCount > 0 && (
                          <Badge className="mr-2 bg-primary text-white">{conversation.unreadCount}</Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {conversation.lastMessage ? formatTime(conversation.lastMessage.createdAt) : ''}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage?.content || t('farmer.noMessagesYet')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Messages */}
      <Card className={`flex-[2] min-h-0 flex flex-col ${selectedConversationId ? "flex" : "hidden md:flex"}`}>
        {selectedConversation ? (
          <>
            <div className="p-4 border-b flex items-center justify-between space-x-3 flex-shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden -ml-2"
                  onClick={() => setSelectedConversationId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="relative flex-shrink-0">
                  <Avatar>
                    <AvatarImage src={selectedConversation.otherUser.image ?? undefined} alt={selectedConversation.otherUser.name} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                      {selectedConversation.otherUser.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isOtherOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{selectedConversation.otherUser.name}</h3>
                  <p className="text-xs text-gray-500 truncate">
                    {isTyping
                      ? <span className="italic text-primary">{t('farmer.typing')}</span>
                      : isOtherOnline
                        ? t('farmer.online')
                        : (selectedConversation.otherUser.role === 'doctor' ? t('farmer.veterinarian') : t('farmer.farmer'))}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedConversationId(null)}>
                      <X className="mr-2 h-4 w-4" />
                      {t('farmer.closeChat')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleArchiveToggle(selectedConversation)}>
                      {selectedConversation.isArchived ? (
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                      ) : (
                        <Archive className="mr-2 h-4 w-4" />
                      )}
                      {selectedConversation.isArchived ? t('farmer.unarchiveConversation') : t('farmer.archiveConversation')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBlockToggle(selectedConversation)}>
                      <Ban className="mr-2 h-4 w-4" />
                      {selectedConversation.isBlocked ? t('farmer.unblockUser') : t('farmer.blockUser')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setReportDialogOpen(true)} className="text-red-600 focus:text-red-600">
                      <Flag className="mr-2 h-4 w-4" />
                      {t('farmer.reportUser')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex"
                  title={t('farmer.closeChat')}
                  onClick={() => setSelectedConversationId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto p-4 space-y-4"
              onScroll={(e) => {
                const target = e.target as HTMLDivElement
                const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100
                userScrolledRef.current = !isAtBottom
              }}
            >
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : messageItems.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {t('farmer.noMessagesStart')}
                </div>
              ) : (
                messageItems.map((item) => {
                  if (item.kind === 'date') {
                    return (
                      <div key={item.key} className="flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">
                          {item.label}
                        </span>
                      </div>
                    )
                  }
                  const message = item.message
                  return (
                  <div key={item.key} className={`group flex ${message.isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`relative max-w-[80%] p-3 rounded-lg ${
                        message.isMe ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {editingMessageId === message.id ? (
                        <div className="space-y-2 min-w-[200px]">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="text-sm text-gray-900 bg-white"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end space-x-1">
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
                          {message.isMe && (
                            <div className="absolute -top-3 right-1 hidden group-hover:flex bg-white border rounded shadow-sm">
                              {canEditMessage(message) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-gray-600"
                                  title={t('common.edit')}
                                  onClick={() => startEditingMessage(message)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-600"
                                title={t('common.delete')}
                                onClick={() => setDeleteMessageId(message.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${message.isMe ? "justify-end" : "justify-start"}`}>
                            <span className={`text-xs ${message.isMe ? "text-primary-foreground/70" : "text-gray-500"}`}>
                              {formatTime(message.createdAt)}
                              {message.editedAt && ` - ${t('farmer.edited')}`}
                            </span>
                            {message.isMe && (
                              message.status === "read" ? (
                                <CheckCheck className="h-3 w-3 text-blue-300" />
                              ) : message.status === "delivered" ? (
                                <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                              ) : (
                                <Check className="h-3 w-3 text-primary-foreground/70" />
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {selectedConversation.isBlocked ? (
              <div className="p-4 border-t text-center text-sm text-gray-500 flex-shrink-0">
                {t('farmer.conversationBlockedNotice')}
              </div>
            ) : (
              <div className="p-4 border-t flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder={t('farmer.typeMessage')}
                    value={newMessage}
                    onChange={(e) => handleTypingChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="flex-1 rounded-full bg-gray-50"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    className="rounded-full flex-shrink-0"
                    disabled={sending || !newMessage.trim()}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            {t('farmer.selectConversation')}
          </div>
        )}
      </Card>
      </div>

      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
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

      <AlertDialog open={removeConfirmOpen} onOpenChange={(open) => !removing && setRemoveConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.removeFromChat')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('farmer.removeConversationsConfirm').replace('{count}', String(selectedConversationIds.length))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveSelected}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : t('farmer.removeFromChat')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('farmer.reportUser')}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t('farmer.reportReasonPlaceholder')}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={4}
          />
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
