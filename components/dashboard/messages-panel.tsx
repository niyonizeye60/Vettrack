"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Send, Plus, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useLanguage } from "@/contexts/LanguageContext"

type Conversation = {
  id: string
  otherUser: {
    id: string
    name: string
    role: string
  }
  lastMessage?: {
    content: string
    createdAt: string
  }
  unreadCount: number
}

type Message = {
  id: string
  content: string
  senderId: string
  isMe: boolean
  createdAt: string
}

type User = {
  id: string
  name: string
  role: string
  specialization?: string
  location?: string
}

export function MessagesPanel() {
  const { t } = useLanguage()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)

  useEffect(() => {
    fetchConversations()
    fetchAvailableUsers()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  // Auto-refresh messages every 3 seconds
  useEffect(() => {
    if (selectedConversation) {
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.id)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedConversation])

  // Auto-refresh conversations every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/chat/conversations')
      const data = await response.json()
      if (response.ok) {
        setConversations(data.conversations)
        // Only auto-select first conversation on initial load
        if (data.conversations.length > 0 && !selectedConversation && loading) {
          setSelectedConversation(data.conversations[0])
        }
        // If we have a selected conversation, update it with fresh data
        if (selectedConversation && data.conversations.length > 0) {
          const updatedConversation = data.conversations.find((c: Conversation) => c.id === selectedConversation.id)
          if (updatedConversation) {
            setSelectedConversation(updatedConversation)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`)
      const data = await response.json()
      if (response.ok) {
        setMessages(data.messages)
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
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: userId })
      })
      const data = await response.json()
      if (response.ok) {
        setShowNewChat(false)
        fetchConversations()
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return
    
    setSending(true)
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage
        })
      })
      
      const data = await response.json()
      if (response.ok) {
        setMessages(prev => [...prev, data.message])
        setNewMessage("")
        fetchConversations() // Refresh to update last message
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
      {/* Conversations List */}
      <Card className="md:col-span-1 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <Input placeholder={t('farmer.searchMessages')} className="flex-1 mr-2" />
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
        <div className="overflow-y-auto h-[calc(100%-60px)]">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {t('farmer.noConversationsYet')}
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? "bg-primary/5" : ""
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-start space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {conversation.otherUser.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold truncate">{conversation.otherUser.name}</h4>
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
      <Card className="md:col-span-2 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>
                  {selectedConversation.otherUser.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{selectedConversation.otherUser.name}</h3>
                <p className="text-xs text-gray-500">
                  {selectedConversation.otherUser.role === 'doctor' ? t('farmer.veterinarian') : t('farmer.farmer')}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {t('farmer.noMessagesStart')}
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.isMe ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${message.isMe ? "text-primary-foreground/70" : "text-gray-500"}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  placeholder={t('farmer.typeMessage')}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="flex-1"
                  disabled={sending}
                />
                <Button onClick={handleSendMessage} size="icon" disabled={sending || !newMessage.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            {t('farmer.selectConversation')}
          </div>
        )}
      </Card>
    </div>
  )
}
