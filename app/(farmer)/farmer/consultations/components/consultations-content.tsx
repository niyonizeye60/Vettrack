"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bell, Eye, MessageSquare, Pencil, Plus, Stethoscope, Trash2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { deleteConsultation } from "@/lib/actions"
import AddConsultationForm from "@/components/dashboard/add-consultation-form"
import EditConsultationForm from "@/components/dashboard/edit-consultation-form"

interface Doctor {
  _id: string
  name: string
  email: string
  specialization: string
  phone: string
}

interface ConsultationsContentProps {
  consultations: any[]
  doctors: Doctor[]
  farmerId: string
  openAdd?: boolean
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-right text-gray-800">{value}</span>
    </div>
  )
}

export default function ConsultationsContent({ consultations, doctors, farmerId, openAdd }: ConsultationsContentProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()

  const [addOpen, setAddOpen] = useState(openAdd ?? false)
  const [editConsultation, setEditConsultation] = useState<any | null>(null)
  const [detailConsultation, setDetailConsultation] = useState<any | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "accepted": return "bg-green-100 text-green-800"
      case "rejected": return "bg-red-100 text-red-800"
      case "completed": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case "pending": return t('farmer.pending')
      case "accepted": return t('farmer.accepted')
      case "rejected": return t('farmer.rejected')
      default: return status
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const result = await deleteConsultation(deleteId, farmerId)
      if (!result.success) {
        toast({ title: t('farmer.actionFailed'), variant: "destructive" })
      }
      router.refresh()
    } catch {
      toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('farmer.myConsultations')}</h1>
            <p className="text-sm text-gray-500">{t('farmer.consultationHistory')}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          {t('farmer.newConsultation')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('farmer.consultationHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {consultations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>{t('farmer.noConsultationsYet')}</p>
              <p className="mt-2">
                <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                  {t('farmer.bookAConsultation')}
                </Button>
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('farmer.service')}</TableHead>
                  <TableHead>{t('farmer.doctor')}</TableHead>
                  <TableHead>{t('farmer.date')}</TableHead>
                  <TableHead>{t('farmer.time')}</TableHead>
                  <TableHead>{t('farmer.type')}</TableHead>
                  <TableHead>{t('farmer.status')}</TableHead>
                  <TableHead>{t('farmer.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((consultation) => (
                  <TableRow key={consultation._id}>
                    <TableCell>{consultation.service}</TableCell>
                    <TableCell>{consultation.doctor || "-"}</TableCell>
                    <TableCell>{consultation.date}</TableCell>
                    <TableCell>{consultation.time}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{consultation.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(consultation.status)}>
                        {getStatusText(consultation.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-emerald-50"
                          title={t('farmer.viewDetails')}
                          onClick={() => setDetailConsultation(consultation)}
                        >
                          <Eye className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                        {consultation.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-emerald-50"
                              title={t('farmer.edit')}
                              onClick={() => setEditConsultation(consultation)}
                            >
                              <Pencil className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-red-50"
                              title={t('farmer.delete')}
                              onClick={() => setDeleteId(consultation._id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Consultation Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => !open && setAddOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('farmer.newConsultation')}</DialogTitle>
          </DialogHeader>
          <AddConsultationForm
            doctors={doctors}
            farmerId={farmerId}
            onSuccess={() => { setAddOpen(false); router.refresh() }}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Consultation Dialog */}
      <Dialog open={!!editConsultation} onOpenChange={(open) => !open && setEditConsultation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('farmer.editConsultation')}</DialogTitle>
          </DialogHeader>
          {editConsultation && (
            <EditConsultationForm
              consultation={editConsultation}
              doctors={doctors}
              farmerId={farmerId}
              onSuccess={() => { setEditConsultation(null); router.refresh() }}
              onCancel={() => setEditConsultation(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailConsultation} onOpenChange={(open) => !open && setDetailConsultation(null)}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600" />
              {t('farmer.consultationFor')}
            </DialogTitle>
          </DialogHeader>

          {detailConsultation && (
            <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-2">
              {detailConsultation.feedback && (
                <Alert variant={detailConsultation.status === "rejected" ? "destructive" : "default"}>
                  <MessageSquare className="h-4 w-4" />
                  <AlertTitle>
                    {detailConsultation.status === "accepted" ? t('farmer.acceptedWithFeedback') :
                     detailConsultation.status === "rejected" ? t('farmer.rejectedWithFeedback') :
                     detailConsultation.status === "completed" ? t('farmer.completedWithFeedback') : ""}
                  </AlertTitle>
                  <AlertDescription>{detailConsultation.feedback}</AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg p-4 space-y-1 bg-white">
                <DetailRow label={t('farmer.fullName')} value={detailConsultation.fullName} />
                <DetailRow label={t('farmer.phoneNumber')} value={detailConsultation.phoneNumber} />
                <DetailRow label={t('farmer.service')} value={detailConsultation.service} />
                <DetailRow label={t('farmer.doctor')} value={detailConsultation.doctor || "-"} />
                <DetailRow label={t('farmer.date')} value={detailConsultation.date} />
                <DetailRow label={t('farmer.time')} value={detailConsultation.time} />
                <DetailRow label={t('farmer.type')} value={detailConsultation.type} />
                <DetailRow
                  label={t('farmer.status')}
                  value={
                    <Badge className={getStatusColor(detailConsultation.status)}>
                      {getStatusText(detailConsultation.status)}
                    </Badge>
                  }
                />
                <DetailRow
                  label={t('farmer.createdAt')}
                  value={new Date(detailConsultation.createdAt).toLocaleString()}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('farmer.deleteConsultationConfirm')}. {t('farmer.deleteConsultationConfirmDesc')}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? t('farmer.deletingConsultation') : t('farmer.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
