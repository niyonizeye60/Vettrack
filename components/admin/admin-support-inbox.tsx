"use client"

import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser } from "@/lib/auth"
import { LifeBuoy, Loader2 } from "lucide-react"
import TicketThread from "@/components/support/ticket-thread"

interface TicketSummary {
  id: string
  subject: string
  status: "open" | "in_progress" | "resolved"
  requesterName: string
  requesterRole: string
  assignedTo: string | null
  assignedToName: string | null
  lastMessageAt: string
  unreadByAdmin: boolean
}

type Scope = "all" | "unassigned" | "mine"

function statusBadgeClass(status: string) {
  switch (status) {
    case "open": return "bg-blue-100 text-blue-800 border border-blue-200"
    case "in_progress": return "bg-yellow-100 text-yellow-800 border border-yellow-200"
    case "resolved": return "bg-green-100 text-green-800 border border-green-200"
    default: return "bg-gray-100 text-gray-800 border border-gray-200"
  }
}

export default function AdminSupportInbox() {
  const { t } = useLanguage()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scope, setScope] = useState<Scope>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const fetchTickets = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (scope !== "all") params.set("scope", scope)
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/support/tickets?${params.toString()}`)
      const json = await res.json()
      if (res.ok) setTickets(json.tickets)
    } catch (error) {
      console.error("Failed to load tickets:", error)
    } finally {
      setLoading(false)
    }
  }, [scope, statusFilter])

  useEffect(() => {
    getCurrentUser().then((u) => u && setCurrentUserId(u._id))
  }, [])

  useEffect(() => {
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

  const openCount = tickets.filter((tk) => tk.status !== "resolved").length
  const unassignedCount = tickets.filter((tk) => !tk.assignedTo).length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 rounded-lg p-4 sm:p-5">
          <p className="text-sm text-gray-500 font-medium">{t("admin.openTickets")}</p>
          <h3 className="text-2xl font-bold text-blue-600 mt-2">{openCount}</h3>
        </div>
        <div className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 rounded-lg p-4 sm:p-5">
          <p className="text-sm text-gray-500 font-medium">{t("support.unassignedTickets")}</p>
          <h3 className="text-2xl font-bold text-orange-600 mt-2">{unassignedCount}</h3>
        </div>
        <div className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 rounded-lg p-4 sm:p-5">
          <p className="text-sm text-gray-500 font-medium">{t("admin.resolved")}</p>
          <h3 className="text-2xl font-bold text-green-600 mt-2">{tickets.filter((tk) => tk.status === "resolved").length}</h3>
        </div>
      </div>

      <div className="border border-gray-200 shadow-sm rounded-lg overflow-hidden" style={{ height: "calc(100vh - 380px)", minHeight: 440 }}>
        <div className="flex h-full">
          {/* Ticket queue */}
          <div className={`w-full sm:w-96 flex-shrink-0 border-r border-gray-200 flex-col ${selectedId ? "hidden sm:flex" : "flex"}`}>
            <div className="p-3 border-b border-gray-200 flex gap-2">
              <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("support.allTickets")}</SelectItem>
                  <SelectItem value="unassigned">{t("support.unassignedTickets")}</SelectItem>
                  <SelectItem value="mine">{t("support.myTickets")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.status")}</SelectItem>
                  <SelectItem value="open">{t("support.statusOpen")}</SelectItem>
                  <SelectItem value="in_progress">{t("support.statusInProgress")}</SelectItem>
                  <SelectItem value="resolved">{t("support.statusResolved")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center p-6">
                  <LifeBuoy className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">{t("support.noAdminTickets")}</h3>
                  <p className="text-xs text-gray-500">{t("support.noAdminTicketsDesc")}</p>
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
                          {ticket.unreadByAdmin && <span className="h-2 w-2 rounded-full bg-green-600 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {ticket.requesterName} · {ticket.requesterRole}
                        </p>
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
                isAdmin
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
    </div>
  )
}
