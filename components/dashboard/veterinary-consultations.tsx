"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { updateConsultationStatus } from "@/lib/actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, CheckCircle, XCircle, ClipboardCheck, User, Phone, Check, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Consultation {
  _id: string
  fullName: string
  phoneNumber: string
  service: string
  date: string
  time: string
  type: string
  status: string
  createdAt: string
  doctor: any
  feedback?: string
}

export default function VeterinaryConsultations({ consultations }: { consultations: Consultation[] }) {
  const router = useRouter()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [feedback, setFeedback] = useState("")
  const [actionType, setActionType] = useState<"accept" | "reject" | "complete" | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)

  const handleStatusUpdate = async (id: string, newStatus: string, feedbackText?: string) => {
    setIsUpdating(true)
    setLoadingId(id)
    try {
      const result = await updateConsultationStatus(id, newStatus, feedbackText || undefined)
      if (result.success) {
        setSelectedConsultation(null)
        setFeedback("")
        setActionType(null)
        toast({ title: t("vet.statusUpdated") })
        router.refresh()
      } else {
        toast({ title: t("common.error") || "Error", description: t("vet.statusUpdateFailed"), variant: "destructive" })
      }
    } catch {
      toast({ title: t("common.error") || "Error", description: t("vet.statusUpdateFailed"), variant: "destructive" })
    } finally {
      setIsUpdating(false)
      setLoadingId(null)
    }
  }

  const openDetails = (c: Consultation) => { setSelectedConsultation(c); setIsDetailsDialogOpen(true) }
  const initiateAction = (c: Consultation, type: "accept" | "reject" | "complete") => {
    setSelectedConsultation(c)
    setActionType(type)
    setIsDetailsDialogOpen(false)
    setIsFeedbackDialogOpen(true)
  }
  const submitFeedback = () => {
    if (!selectedConsultation || !actionType) return
    const newStatus = actionType === "accept" ? "accepted" : actionType === "reject" ? "rejected" : "completed"
    handleStatusUpdate(selectedConsultation._id, newStatus, feedback)
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending:   "bg-amber-50 text-amber-700 border border-amber-200",
      accepted:  "bg-blue-50 text-blue-700 border border-blue-200",
      rejected:  "bg-red-50 text-red-700 border border-red-200",
      completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    }
    const labels: Record<string, string> = {
      pending:   t("vet.pending"),
      accepted:  t("vet.accepted"),
      rejected:  t("vet.rejected"),
      completed: t("vet.completed"),
    }
    return <Badge className={map[status] ?? "bg-gray-50 text-gray-700 border border-gray-200"}>{labels[status] ?? status}</Badge>
  }

  const pending   = consultations.filter(c => c.status === "pending")
  const accepted  = consultations.filter(c => c.status === "accepted")
  const rejected  = consultations.filter(c => c.status === "rejected")
  const completed = consultations.filter(c => c.status === "completed")

  const ActionButtons = ({ c, size = "sm" }: { c: Consultation; size?: "sm" | "default" }) => (
    <>
      {c.status === "pending" && (
        <>
          <Button
            size={size}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isUpdating}
            onClick={() => initiateAction(c, "accept")}
          >
            <Check className="h-3.5 w-3.5 mr-1" />{t("vet.accept")}
          </Button>
          <Button
            size={size}
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={isUpdating}
            onClick={() => initiateAction(c, "reject")}
          >
            <X className="h-3.5 w-3.5 mr-1" />{t("vet.reject")}
          </Button>
        </>
      )}
      {c.status === "accepted" && (
        <Button
          size={size}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={isUpdating}
          onClick={() => initiateAction(c, "complete")}
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1" />{t("vet.markComplete")}
        </Button>
      )}
    </>
  )

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
        <ClipboardCheck className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-gray-500 text-sm font-medium">{t("vet.noConsultations")}</p>
    </div>
  )

  // Mobile card — matches dashboard "Requires Action" row style
  const MobileCard = ({ c }: { c: Consultation }) => (
    <div className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors duration-150 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
            <User className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 text-sm truncate">{c.fullName}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <Phone className="h-2.5 w-2.5" />
              <span>{c.phoneNumber}</span>
            </div>
          </div>
        </div>
        {statusBadge(c.status)}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-8">
        <span className="text-gray-400">{t("vet.service")}</span>
        <span className="text-gray-700 font-medium">{c.service}</span>
        <span className="text-gray-400">{t("vet.consultType")}</span>
        <span className="text-gray-700 truncate">{c.type}</span>
        <span className="text-gray-400">{t("vet.date")}</span>
        <span className="text-gray-700">{c.date} {c.time}</span>
      </div>
      <div className="flex gap-2 pl-8 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => openDetails(c)}>
          {t("vet.viewDetails")}
        </Button>
        <ActionButtons c={c} size="sm" />
      </div>
    </div>
  )

  // Desktop table
  const ConsultationTable = ({ list }: { list: Consultation[] }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="w-[200px] font-semibold text-gray-600">{t("vet.farmer")}</TableHead>
            <TableHead className="w-[130px] font-semibold text-gray-600">{t("vet.service")}</TableHead>
            <TableHead className="w-[130px] font-semibold text-gray-600">{t("vet.consultType")}</TableHead>
            <TableHead className="w-[130px] font-semibold text-gray-600">{t("vet.date")}</TableHead>
            <TableHead className="w-[110px] font-semibold text-gray-600">{t("vet.status")}</TableHead>
            <TableHead className="w-[220px] font-semibold text-gray-600">{t("vet.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((c) => (
            <TableRow key={c._id} className="hover:bg-gray-50/80 transition-colors duration-150">
              {/* Farmer */}
              <TableCell className="w-[200px]">
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                    <User className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{c.fullName}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Phone className="h-2.5 w-2.5" />
                      <span>{c.phoneNumber}</span>
                    </div>
                  </div>
                </div>
              </TableCell>
              {/* Service */}
              <TableCell className="w-[130px] text-sm text-gray-700">{c.service}</TableCell>
              {/* Consult Type */}
              <TableCell className="w-[130px] text-sm text-gray-600">{c.type}</TableCell>
              {/* Date */}
              <TableCell className="w-[130px]">
                <p className="text-sm text-gray-700">{c.date}</p>
                <p className="text-xs text-gray-400">{c.time}</p>
              </TableCell>
              {/* Status */}
              <TableCell className="w-[110px]">{statusBadge(c.status)}</TableCell>
              {/* Actions */}
              <TableCell className="w-[220px]">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => openDetails(c)}>
                    {t("vet.view")}
                  </Button>
                  <ActionButtons c={c} size="sm" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderTab = (list: Consultation[]) => {
    if (list.length === 0) return <EmptyState />
    return (
      <>
        <div className="md:hidden space-y-2">{list.map(c => <MobileCard key={c._id} c={c} />)}</div>
        <div className="hidden md:block"><ConsultationTable list={list} /></div>
      </>
    )
  }

  return (
    <>
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <ClipboardCheck className="h-5 w-5 text-green-600" />
            {t("vet.consultationRequests")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="w-full sm:w-auto bg-gray-100/80">
              <TabsTrigger value="pending" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                {t("vet.pending")}
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs px-1.5 h-4 ml-0.5">{pending.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="accepted" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
                <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                {t("vet.accepted")}
                <Badge className="bg-blue-100 text-blue-700 border-0 text-xs px-1.5 h-4 ml-0.5">{accepted.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                {t("vet.rejected")}
                <Badge className="bg-red-100 text-red-700 border-0 text-xs px-1.5 h-4 ml-0.5">{rejected.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white">
                <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" />
                {t("vet.completed")}
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs px-1.5 h-4 ml-0.5">{completed.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending"   className="mt-4">{renderTab(pending)}</TabsContent>
            <TabsContent value="accepted"  className="mt-4">{renderTab(accepted)}</TabsContent>
            <TabsContent value="rejected"  className="mt-4">{renderTab(rejected)}</TabsContent>
            <TabsContent value="completed" className="mt-4">{renderTab(completed)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-11/12">
          <DialogHeader>
            <DialogTitle>{t("vet.consultationDetails")}</DialogTitle>
            <DialogDescription>{t("vet.viewDetailsDesc")}</DialogDescription>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-3 py-3">
              {[
                { label: t("vet.farmer"),      value: selectedConsultation.fullName },
                { label: t("vet.phoneNumber"), value: selectedConsultation.phoneNumber },
                { label: t("vet.service"),      value: selectedConsultation.service },
                { label: t("vet.consultType"), value: selectedConsultation.type },
                { label: t("vet.date"),        value: `${selectedConsultation.date} ${selectedConsultation.time}` },
              ].map(({ label, value }) => (
                <div key={label} className="grid grid-cols-3 gap-4 text-sm">
                  <p className="font-semibold text-gray-500">{label}</p>
                  <p className="col-span-2 text-gray-900 break-words">{value}</p>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <p className="font-semibold text-gray-500">{t("vet.status")}</p>
                <div className="col-span-2">{statusBadge(selectedConsultation.status)}</div>
              </div>
              {selectedConsultation.feedback && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <p className="font-semibold text-gray-500">{t("vet.feedback")}</p>
                  <p className="col-span-2 text-gray-900 break-words">{selectedConsultation.feedback}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedConsultation?.status === "pending" && (
              <>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => initiateAction(selectedConsultation, "accept")}>
                  <Check className="h-4 w-4 mr-1.5" />{t("vet.accept")}
                </Button>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => initiateAction(selectedConsultation, "reject")}>
                  <X className="h-4 w-4 mr-1.5" />{t("vet.reject")}
                </Button>
              </>
            )}
            {selectedConsultation?.status === "accepted" && (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => initiateAction(selectedConsultation, "complete")}>
                <CheckCircle className="h-4 w-4 mr-1.5" />{t("vet.markComplete")}
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline">{t("vet.close")}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={isFeedbackDialogOpen} onOpenChange={(open) => { if (!open) { setFeedback(""); setActionType(null) } setIsFeedbackDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[500px] w-11/12">
          <DialogHeader>
            <DialogTitle>
              {actionType === "accept" ? t("vet.acceptConsultation") : actionType === "reject" ? t("vet.rejectConsultation") : t("vet.markConsultationComplete")}
            </DialogTitle>
            <DialogDescription>{t("vet.provideFeedback")}</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label htmlFor="feedback" className="mb-2 block text-sm font-medium">{t("vet.feedbackForFarmer")}</Label>
            <Textarea
              id="feedback"
              placeholder={t("vet.feedbackPlaceholder")}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              className={actionType === "accept" ? "bg-green-600 hover:bg-green-700" : actionType === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}
              onClick={() => { submitFeedback(); setIsFeedbackDialogOpen(false) }}
              disabled={isUpdating}
            >
              {isUpdating ? "…" : t("vet.submit")}
            </Button>
            <Button variant="outline" onClick={() => { setIsFeedbackDialogOpen(false); setFeedback(""); setActionType(null) }}>
              {t("vet.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
