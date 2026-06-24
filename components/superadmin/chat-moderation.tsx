"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Flag, MessageSquare, Search, ShieldAlert, Ban, CheckCircle2, XCircle, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getChatReports,
  getAllConversationsForModeration,
  getConversationMessagesForModeration,
  resolveChatReport,
  dismissChatReport,
  suspendReportedUser,
} from "@/lib/actions/chat-moderation"

interface ChatReport {
  id: string
  conversationId: string
  messageId: string | null
  reason: string
  status: "open" | "resolved" | "dismissed"
  createdAt: string | Date
  resolvedAt: string | Date | null
  resolutionNote: string | null
  resolvedByName: string | null
  reporter: { id: string; name: string; email: string } | null
  reportedUser: { id: string; name: string; email: string; status: string } | null
}

interface ModerationConversation {
  id: string
  participants: { id: string; name: string; role: string }[]
  lastMessage: { content: string; createdAt: string | Date } | null
  isBlocked: boolean
  createdAt: string | Date
}

interface ModerationMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  createdAt: string | Date
  editedAt: string | Date | null
  deletedFor: string[]
}

interface ChatModerationProps {
  initialReports: ChatReport[]
  initialConversations: ModerationConversation[]
}

export default function ChatModeration({ initialReports, initialConversations }: ChatModerationProps) {
  const { toast } = useToast()
  const [reports, setReports] = useState<ChatReport[]>(initialReports)
  const [conversations, setConversations] = useState<ModerationConversation[]>(initialConversations)
  const [conversationSearch, setConversationSearch] = useState("")

  const [viewConversationId, setViewConversationId] = useState<string | null>(null)
  const [viewMessages, setViewMessages] = useState<ModerationMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [resolvingReport, setResolvingReport] = useState<ChatReport | null>(null)
  const [resolutionNote, setResolutionNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [suspendUserId, setSuspendUserId] = useState<string | null>(null)

  const loadAll = async () => {
    try {
      const [reportsData, conversationsData] = await Promise.all([
        getChatReports(),
        getAllConversationsForModeration(),
      ])
      setReports(reportsData as ChatReport[])
      setConversations(conversationsData as ModerationConversation[])
    } catch (error) {
      console.error("Error loading moderation data:", error)
      toast({ title: "Failed to load moderation data", variant: "destructive" })
    }
  }

  const openConversation = async (conversationId: string) => {
    setViewConversationId(conversationId)
    setLoadingMessages(true)
    try {
      const data = await getConversationMessagesForModeration(conversationId)
      setViewMessages(data as ModerationMessage[])
    } catch (error) {
      console.error("Error loading conversation:", error)
      toast({ title: "Failed to load conversation", variant: "destructive" })
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleResolve = async () => {
    if (!resolvingReport) return
    setSubmitting(true)
    try {
      await resolveChatReport(resolvingReport.id, resolutionNote)
      toast({ title: "Report resolved" })
      setResolvingReport(null)
      setResolutionNote("")
      await loadAll()
    } catch (error) {
      console.error("Error resolving report:", error)
      toast({ title: "Failed to resolve report", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDismiss = async (reportId: string) => {
    try {
      await dismissChatReport(reportId)
      toast({ title: "Report dismissed" })
      await loadAll()
    } catch (error) {
      console.error("Error dismissing report:", error)
      toast({ title: "Failed to dismiss report", variant: "destructive" })
    }
  }

  const handleSuspend = async () => {
    if (!suspendUserId) return
    try {
      await suspendReportedUser(suspendUserId)
      toast({ title: "User suspended" })
      setSuspendUserId(null)
      await loadAll()
    } catch (error) {
      console.error("Error suspending user:", error)
      toast({ title: "Failed to suspend user", variant: "destructive" })
    }
  }

  const openReports = reports.filter((r) => r.status === "open")
  const resolvedReports = reports.filter((r) => r.status !== "open")

  const filteredConversations = conversations.filter((c) => {
    if (!conversationSearch.trim()) return true
    const q = conversationSearch.toLowerCase()
    return (
      c.participants.some((p) => p.name?.toLowerCase().includes(q)) ||
      c.lastMessage?.content.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl">
          <ShieldAlert className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat Moderation</h1>
          <p className="text-sm text-gray-500">Review reports and oversee farmer-vet conversations</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">Open reports</p>
            <p className="text-2xl font-bold text-red-600">{openReports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">Resolved</p>
            <p className="text-2xl font-bold text-emerald-600">{resolvedReports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">Conversations</p>
            <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">Blocked pairs</p>
            <p className="text-2xl font-bold text-gray-900">{conversations.filter((c) => c.isBlocked).length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">
            <Flag className="h-4 w-4 mr-1.5" /> Reports
          </TabsTrigger>
          <TabsTrigger value="conversations">
            <MessageSquare className="h-4 w-4 mr-1.5" /> All conversations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-3 mt-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">No reports filed</CardContent>
            </Card>
          ) : (
            reports.map((r) => (
              <Card key={r.id} className={r.status === "open" ? "border-red-200" : ""}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {r.reporter?.name || "Unknown"} reported {r.reportedUser?.name || "Unknown"}
                        </p>
                        {r.status === "open" && <Badge className="bg-red-100 text-red-700 border-red-200">Open</Badge>}
                        {r.status === "resolved" && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Resolved</Badge>
                        )}
                        {r.status === "dismissed" && <Badge variant="outline">Dismissed</Badge>}
                        {r.reportedUser?.status === "suspended" && (
                          <Badge className="bg-gray-800 text-white">User suspended</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{r.reason}</p>
                      {r.resolutionNote && (
                        <p className="text-xs text-gray-400 mt-1">
                          Resolution: {r.resolutionNote} {r.resolvedByName ? `— ${r.resolvedByName}` : ""}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                      <Button size="sm" variant="ghost" onClick={() => openConversation(r.conversationId)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View chat
                      </Button>
                      {r.status === "open" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-700 hover:bg-emerald-50"
                            onClick={() => setResolvingReport(r)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-500 hover:bg-gray-50"
                            onClick={() => handleDismiss(r.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Dismiss
                          </Button>
                          {r.reportedUser && r.reportedUser.status !== "suspended" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => setSuspendUserId(r.reportedUser!.id)}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" /> Suspend user
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="conversations" className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by participant name or message content..."
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {filteredConversations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">No conversations found</CardContent>
            </Card>
          ) : (
            filteredConversations.map((c) => (
              <Card key={c.id} className="cursor-pointer hover:shadow-sm" onClick={() => openConversation(c.id)}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {c.participants.map((p) => p.name).join(" ↔ ")}
                      </p>
                      {c.isBlocked && <Badge className="bg-gray-800 text-white">Blocked</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 truncate max-w-md">
                      {c.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap">
                    {c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleDateString() : ""}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Conversation viewer */}
      <Dialog open={!!viewConversationId} onOpenChange={(open) => !open && setViewConversationId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conversation</DialogTitle>
            <DialogDescription>Decrypted message history for moderation review</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {loadingMessages ? (
              <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : viewMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No messages</div>
            ) : (
              viewMessages.map((m) => (
                <div key={m.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{m.senderName}</span>
                    <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</span>
                    {m.editedAt && <span className="text-xs text-gray-400">(edited)</span>}
                  </div>
                  <p className="text-gray-700">{m.content}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve dialog */}
      <Dialog open={!!resolvingReport} onOpenChange={(open) => !open && setResolvingReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve report</DialogTitle>
            <DialogDescription>Add an optional note describing the outcome</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Resolution note (optional)..."
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingReport(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? "Resolving..." : "Mark resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend confirm */}
      <AlertDialog open={!!suspendUserId} onOpenChange={(open) => !open && setSuspendUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend this user?</AlertDialogTitle>
            <AlertDialogDescription>
              The user will be unable to log in until reactivated from User Management.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} className="bg-red-600 hover:bg-red-700 text-white">
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
