"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Flag, MessageSquare, Search, ShieldAlert, Ban, CheckCircle2, XCircle, Eye, RotateCcw, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getChatReports,
  getAllConversationsForModeration,
  getConversationMessagesForModeration,
  resolveChatReport,
  dismissChatReport,
  suspendReportedUser,
  restoreModerationMessage,
  permanentlyDeleteModerationMessage,
  restoreAllDeletedMessages,
  permanentlyDeleteAllDeletedMessages,
} from "@/lib/actions/chat-moderation"

import { useLanguage } from "@/contexts/LanguageContext"
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
  deletedAt: string | Date | null
  deletedByName: string | null
}

interface ChatModerationProps {
  initialReports: ChatReport[]
  initialConversations: ModerationConversation[]
}

export default function ChatModeration({ initialReports, initialConversations }: ChatModerationProps) {
  const { t } = useLanguage()
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
  const [restoringMessageId, setRestoringMessageId] = useState<string | null>(null)
  const [permanentDeleteMessageId, setPermanentDeleteMessageId] = useState<string | null>(null)
  const [restoringAll, setRestoringAll] = useState(false)
  const [permanentDeleteAllOpen, setPermanentDeleteAllOpen] = useState(false)
  const [permanentDeletingAll, setPermanentDeletingAll] = useState(false)

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
      toast({ title: t("chatMod.failedToLoadModerationData"), variant: "destructive" })
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
      toast({ title: t("chatMod.failedToLoadConversation"), variant: "destructive" })
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleResolve = async () => {
    if (!resolvingReport) return
    setSubmitting(true)
    try {
      await resolveChatReport(resolvingReport.id, resolutionNote)
      toast({ title: t("chatMod.reportResolved") })
      setResolvingReport(null)
      setResolutionNote("")
      await loadAll()
    } catch (error) {
      console.error("Error resolving report:", error)
      toast({ title: t("chatMod.failedToResolveReport"), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDismiss = async (reportId: string) => {
    try {
      await dismissChatReport(reportId)
      toast({ title: t("chatMod.reportDismissed") })
      await loadAll()
    } catch (error) {
      console.error("Error dismissing report:", error)
      toast({ title: t("chatMod.failedToDismissReport"), variant: "destructive" })
    }
  }

  const handleSuspend = async () => {
    if (!suspendUserId) return
    try {
      await suspendReportedUser(suspendUserId)
      toast({ title: t("chatMod.userSuspended") })
      setSuspendUserId(null)
      await loadAll()
    } catch (error) {
      console.error("Error suspending user:", error)
      toast({ title: t("chatMod.failedToSuspendUser"), variant: "destructive" })
    }
  }

  const handleRestoreMessage = async (messageId: string) => {
    setRestoringMessageId(messageId)
    try {
      await restoreModerationMessage(messageId)
      toast({ title: t("chatMod.messageRestored") })
      if (viewConversationId) await openConversation(viewConversationId)
    } catch (error) {
      console.error("Error restoring message:", error)
      toast({ title: t("chatMod.failedToRestoreMessage"), variant: "destructive" })
    } finally {
      setRestoringMessageId(null)
    }
  }

  const handlePermanentlyDeleteMessage = async () => {
    if (!permanentDeleteMessageId) return
    const messageId = permanentDeleteMessageId
    setPermanentDeleteMessageId(null)
    try {
      await permanentlyDeleteModerationMessage(messageId)
      toast({ title: t("chatMod.messagePermanentlyDeleted") })
      setViewMessages((prev) => prev.filter((m) => m.id !== messageId))
      await loadAll()
    } catch (error) {
      console.error("Error permanently deleting message:", error)
      toast({ title: t("chatMod.failedToDeleteMessage"), variant: "destructive" })
    }
  }

  const handleRestoreAllMessages = async () => {
    if (!viewConversationId) return
    setRestoringAll(true)
    try {
      await restoreAllDeletedMessages(viewConversationId)
      toast({ title: t("chatMod.allDeletedMessagesRestored") })
      await openConversation(viewConversationId)
    } catch (error) {
      console.error("Error restoring all messages:", error)
      toast({ title: t("chatMod.failedToRestoreMessages"), variant: "destructive" })
    } finally {
      setRestoringAll(false)
    }
  }

  const handlePermanentlyDeleteAllMessages = async () => {
    if (!viewConversationId) return
    setPermanentDeletingAll(true)
    try {
      await permanentlyDeleteAllDeletedMessages(viewConversationId)
      toast({ title: t("chatMod.allDeletedMessagesPermanentlyRemoved") })
      setViewMessages((prev) => prev.filter((m) => !m.deletedAt))
      await loadAll()
    } catch (error) {
      console.error("Error permanently deleting all messages:", error)
      toast({ title: t("chatMod.failedToDeleteMessages"), variant: "destructive" })
    } finally {
      setPermanentDeletingAll(false)
      setPermanentDeleteAllOpen(false)
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 flex-shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("chatMod.chatModeration")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("chatMod.reviewReportsAndOverseeFarmerVet")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">{t("chatMod.openReports")}</p>
            <p className="text-2xl font-bold text-red-600">{openReports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">{t("chatMod.resolved")}</p>
            <p className="text-2xl font-bold text-emerald-600">{resolvedReports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">{t("chatMod.conversations")}</p>
            <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">{t("chatMod.blockedPairs")}</p>
            <p className="text-2xl font-bold text-gray-900">{conversations.filter((c) => c.isBlocked).length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">
            <Flag className="h-4 w-4 mr-1.5" /> {t("chatMod.reports")}
          </TabsTrigger>
          <TabsTrigger value="conversations">
            <MessageSquare className="h-4 w-4 mr-1.5" /> {t("chatMod.allConversations")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-3 mt-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">{t("chatMod.noReportsFiled")}</CardContent>
            </Card>
          ) : (
            reports.map((r) => (
              <Card key={r.id} className={r.status === "open" ? "border-red-200" : ""}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {t("chatMod.reported").replace("{reporter}", r.reporter?.name || t("chatMod.unknown")).replace("{user}", r.reportedUser?.name || t("chatMod.unknown"))}
                        </p>
                        {r.status === "open" && <Badge className="bg-red-100 text-red-700 border-red-200">{t("chatMod.open")}</Badge>}
                        {r.status === "resolved" && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{t("chatMod.resolved")}</Badge>
                        )}
                        {r.status === "dismissed" && <Badge variant="outline">{t("chatMod.dismissed")}</Badge>}
                        {r.reportedUser?.status === "suspended" && (
                          <Badge className="bg-gray-800 text-white">{t("chatMod.userSuspended")}</Badge>
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
                        <Eye className="h-3.5 w-3.5 mr-1" /> {t("chatMod.viewChat")}
                      </Button>
                      {r.status === "open" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-700 hover:bg-emerald-50"
                            onClick={() => setResolvingReport(r)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t("chatMod.resolve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-500 hover:bg-gray-50"
                            onClick={() => handleDismiss(r.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> {t("chatMod.dismiss")}
                          </Button>
                          {r.reportedUser && r.reportedUser.status !== "suspended" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => setSuspendUserId(r.reportedUser!.id)}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" /> {t("chatMod.suspendUser")}
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
              placeholder={t("chatMod.searchByParticipantNameOrMessage")}
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {filteredConversations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">{t("chatMod.noConversationsFound")}</CardContent>
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
                      {c.isBlocked && <Badge className="bg-gray-800 text-white">{t("chatMod.blocked")}</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 truncate max-w-md">
                      {c.lastMessage?.content || t("chatMod.noMessagesYet")}
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
            <DialogTitle>{t("chatMod.conversation")}</DialogTitle>
            <DialogDescription>{t("chatMod.decryptedMessageHistoryForModerationReview")}</DialogDescription>
          </DialogHeader>
          {viewMessages.some((m) => m.deletedAt) && (
            <div className="flex gap-2 pb-2 border-b border-gray-100">
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                disabled={restoringAll}
                onClick={handleRestoreAllMessages}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {restoringAll ? t("chatMod.restoring") : t("chatMod.restoreAllDeleted")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setPermanentDeleteAllOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {t("chatMod.deleteAllPermanently")}
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {loadingMessages ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="text-sm space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : viewMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">{t("chatMod.noMessages")}</div>
            ) : (
              viewMessages.map((m) => (
                <div key={m.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{m.senderName}</span>
                    <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</span>
                    {m.editedAt && <span className="text-xs text-gray-400">(edited)</span>}
                    {m.deletedAt && (
                      <Badge variant="outline" className="text-red-600 border-red-200">
                        Deleted{m.deletedByName ? ` by ${m.deletedByName}` : ""}
                      </Badge>
                    )}
                  </div>
                  <p className={m.deletedAt ? "text-gray-400 italic" : "text-gray-700"}>{m.content}</p>
                  {m.deletedAt && (
                    <div className="flex gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
                        disabled={restoringMessageId === m.id}
                        onClick={() => handleRestoreMessage(m.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {restoringMessageId === m.id ? t("chatMod.restoring") : t("chatMod.restore")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => setPermanentDeleteMessageId(m.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {t("chatMod.deletePermanently")}
                      </Button>
                    </div>
                  )}
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
            <DialogTitle>{t("chatMod.resolveReport")}</DialogTitle>
            <DialogDescription>{t("chatMod.addAnOptionalNoteDescribingThe")}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("chatMod.resolutionNoteOptional")}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingReport(null)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleResolve} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? t("chatMod.resolving") : t("chatMod.markResolved")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirm */}
      <AlertDialog open={!!permanentDeleteMessageId} onOpenChange={(open) => !open && setPermanentDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chatMod.permanentlyDeleteThisMessage")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chatMod.thisRemovesTheMessageFromThe")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentlyDeleteMessage} className="bg-red-600 hover:bg-red-700 text-white">
              {t("chatMod.deletePermanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete all confirm */}
      <AlertDialog open={permanentDeleteAllOpen} onOpenChange={(open) => !permanentDeletingAll && setPermanentDeleteAllOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chatMod.permanentlyDeleteAllDeletedMessages")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chatMod.deleteAllDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={permanentDeletingAll}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentlyDeleteAllMessages} disabled={permanentDeletingAll}
              className="bg-red-600 hover:bg-red-700 text-white">
              {permanentDeletingAll ? t("common.deleting") : t("chatMod.deleteAllPermanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend confirm */}
      <AlertDialog open={!!suspendUserId} onOpenChange={(open) => !open && setSuspendUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chatMod.suspendThisUser")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chatMod.theUserWillBeUnableTo")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} className="bg-red-600 hover:bg-red-700 text-white">
              {t("chatMod.suspend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
