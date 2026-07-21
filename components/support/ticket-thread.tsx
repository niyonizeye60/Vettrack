"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/LanguageContext"
import { Loader2, Send, CheckCircle2, RotateCcw, UserCheck, ArrowLeft } from "lucide-react"

export interface SupportMessage {
  id: string
  senderId: string
  senderRole: string
  senderName: string
  content: string
  createdAt: string
}

export interface SupportTicketDetail {
  id: string
  subject: string
  status: "open" | "in_progress" | "resolved"
  requesterId: string
  requesterRole: string
  requesterName: string
  requesterPhone: string | null
  requesterEmail: string | null
  assignedTo: string | null
  assignedToName: string | null
  createdAt: string
  updatedAt: string
}

interface TicketThreadProps {
  ticketId: string
  currentUserId: string
  isAdmin: boolean
  onTicketChange?: () => void
  onBack?: () => void
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "open": return "bg-blue-100 text-blue-800 border border-blue-200"
    case "in_progress": return "bg-yellow-100 text-yellow-800 border border-yellow-200"
    case "resolved": return "bg-green-100 text-green-800 border border-green-200"
    default: return "bg-gray-100 text-gray-800 border border-gray-200"
  }
}

export default function TicketThread({ ticketId, currentUserId, isAdmin, onTicketChange, onBack }: TicketThreadProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchTicket = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`)
      const json = await res.json()
      if (res.ok) {
        setTicket(json.ticket)
        setMessages(json.messages)
      }
    } catch (error) {
      console.error("Failed to load ticket:", error)
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    fetchTicket()
    const interval = setInterval(() => fetchTicket({ silent: true }), 10000)
    return () => clearInterval(interval)
  }, [fetchTicket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const statusLabel = (status: string) => {
    if (status === "open") return t("support.statusOpen")
    if (status === "in_progress") return t("support.statusInProgress")
    if (status === "resolved") return t("support.statusResolved")
    return status
  }

  const handleSend = async () => {
    const trimmed = reply.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      })
      if (!res.ok) throw new Error("failed")
      setReply("")
      await fetchTicket({ silent: true })
      onTicketChange?.()
    } catch (error) {
      toast({ title: t("support.sendFailed"), variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const handleAction = async (action: "claim" | "resolve" | "reopen") => {
    setActionPending(true)
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error("failed")
      await fetchTicket({ silent: true })
      onTicketChange?.()
    } catch (error) {
      toast({ title: t("common.error"), variant: "destructive" })
    } finally {
      setActionPending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        {t("support.selectTicket")}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2">
            {onBack && (
              <Button variant="ghost" size="icon" className="md:hidden -ml-1 -mt-1 flex-shrink-0" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{ticket.subject}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("support.requestedBy")}: {ticket.requesterName} ({ticket.requesterRole})
              </p>
            </div>
          </div>
          <Badge className={statusBadgeClass(ticket.status)}>{statusLabel(ticket.status)}</Badge>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {ticket.assignedToName
              ? `${t("support.assignedTo")}: ${ticket.assignedToName}`
              : t("support.unassigned")}
          </p>

          {isAdmin && (
            <div className="flex gap-2">
              {!ticket.assignedTo && (
                <Button size="sm" variant="outline" disabled={actionPending} onClick={() => handleAction("claim")}>
                  <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                  {t("support.claim")}
                </Button>
              )}
              {ticket.status !== "resolved" ? (
                <Button size="sm" variant="outline" disabled={actionPending} onClick={() => handleAction("resolve")}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  {t("support.markResolved")}
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={actionPending} onClick={() => handleAction("reopen")}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  {t("support.reopen")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.map((message) => {
          const isMine = message.senderId === currentUserId
          return (
            <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMine ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-900"
              }`}>
                {!isMine && (
                  <p className="text-xs font-semibold mb-0.5 text-gray-500">{message.senderName}</p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-green-100" : "text-gray-400"}`}>
                  {new Date(message.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <div className="border-t border-gray-200 p-4 flex gap-2">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t("support.replyPlaceholder")}
          className="min-h-[44px] max-h-32 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button onClick={handleSend} disabled={sending || !reply.trim()} className="bg-green-600 hover:bg-green-700 self-end">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
