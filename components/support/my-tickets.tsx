"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser } from "@/lib/auth"
import { LifeBuoy, Plus, Loader2 } from "lucide-react"
import TicketThread from "./ticket-thread"

interface TicketSummary {
  id: string
  subject: string
  status: "open" | "in_progress" | "resolved"
  lastMessageAt: string
  unreadByRequester: boolean
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "open": return "bg-blue-100 text-blue-800 border border-blue-200"
    case "in_progress": return "bg-yellow-100 text-yellow-800 border border-yellow-200"
    case "resolved": return "bg-green-100 text-green-800 border border-green-200"
    default: return "bg-gray-100 text-gray-800 border border-gray-200"
  }
}

export default function MyTickets() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("ticketId"))

  const [dialogOpen, setDialogOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchTickets = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const res = await fetch("/api/support/tickets")
      const json = await res.json()
      if (res.ok) {
        setTickets(json.tickets)
        setSelectedId((prev) => prev ?? json.tickets[0]?.id ?? null)
      }
    } catch (error) {
      console.error("Failed to load tickets:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getCurrentUser().then((u) => u && setCurrentUserId(u._id))
    fetchTickets()
    const interval = setInterval(() => fetchTickets({ silent: true }), 15000)
    return () => clearInterval(interval)
  }, [fetchTickets])

  const statusLabel = (status: string) => {
    if (status === "open") return t("support.statusOpen")
    if (status === "in_progress") return t("support.statusInProgress")
    if (status === "resolved") return t("support.statusResolved")
    return status
  }

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: t("support.subjectRequired"), variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "failed")

      toast({ title: t("support.ticketCreated"), description: t("support.ticketCreatedDesc") })
      setSubject("")
      setMessage("")
      setDialogOpen(false)
      setSelectedId(json.id)
      await fetchTickets({ silent: true })
    } catch (error) {
      toast({ title: t("support.createFailed"), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border border-gray-200 shadow-sm rounded-lg overflow-hidden" style={{ height: "calc(100vh - 220px)", minHeight: 480 }}>
      <div className="flex h-full">
        {/* Ticket list */}
        <div className={`w-full sm:w-80 flex-shrink-0 border-r border-gray-200 flex-col ${selectedId ? "hidden sm:flex" : "flex"}`}>
          <div className="p-4 border-b border-gray-200">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("support.newTicket")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("support.newTicket")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t("support.subject")}</label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={t("support.subjectPlaceholder")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t("support.message")}</label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t("support.messagePlaceholder")}
                      className="min-h-[120px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    {t("support.submitTicket")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center p-6">
                <LifeBuoy className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-gray-700 mb-1">{t("support.noTickets")}</h3>
                <p className="text-xs text-gray-500">{t("support.noTicketsDesc")}</p>
              </div>
            ) : (
              <ul>
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      onClick={() => setSelectedId(ticket.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                        selectedId === ticket.id ? "bg-green-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                        {ticket.unreadByRequester && <span className="h-2 w-2 rounded-full bg-green-600 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <Badge className={`text-[10px] px-1.5 py-0 ${statusBadgeClass(ticket.status)}`}>
                          {statusLabel(ticket.status)}
                        </Badge>
                        <span className="text-[10px] text-gray-400">
                          {new Date(ticket.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={`flex-1 min-w-0 ${selectedId ? "flex" : "hidden sm:flex"}`}>
          {selectedId && currentUserId ? (
            <TicketThread
              key={selectedId}
              ticketId={selectedId}
              currentUserId={currentUserId}
              isAdmin={false}
              onTicketChange={() => fetchTickets({ silent: true })}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              {t("support.selectTicket")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
