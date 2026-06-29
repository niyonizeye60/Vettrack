"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { MessageSquare } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { deleteConsultation } from "@/lib/actions"

interface ConsultationDetailContentProps {
  consultation: any
  doctorName: string
  farmerId: string
}

export default function ConsultationDetailContent({ consultation, doctorName, farmerId }: ConsultationDetailContentProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const result = await deleteConsultation(consultation._id, farmerId)
      if (result.success) {
        router.push("/farmer/consultations")
        router.refresh()
      } else {
        toast({ title: t('farmer.actionFailed'), variant: "destructive" })
        setDeleting(false)
        setDeleteOpen(false)
      }
    } catch (error) {
      console.error("Error deleting consultation:", error)
      toast({ title: t('farmer.actionFailed'), variant: "destructive" })
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case "pending":
        return t('farmer.pending')
      case "accepted":
        return t('farmer.accepted')
      case "rejected":
        return t('farmer.rejected')
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('farmer.consultationDetails')}</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/farmer/consultations">{t('farmer.backToAllConsultations')}</Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('farmer.consultationFor')}</CardTitle>
          <div className="mt-1">
            <Badge className={getStatusColor(consultation.status)}>
              {getStatusText(consultation.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {consultation.feedback && (
            <Alert className="mb-6" variant={consultation.status === "rejected" ? "destructive" : "default"}>
              <MessageSquare className="h-4 w-4" />
              <AlertTitle>
                {consultation.status === "accepted" ? t('farmer.acceptedWithFeedback') : 
                 consultation.status === "rejected" ? t('farmer.rejectedWithFeedback') : 
                 consultation.status === "completed" ? t('farmer.completedWithFeedback') : ""}
              </AlertTitle>
              <AlertDescription>
                {consultation.feedback}
              </AlertDescription>
            </Alert>
          )}
          
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('farmer.fullName')}</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.fullName}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('farmer.phoneNumber')}</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.phoneNumber}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('farmer.service')}</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.service}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('farmer.doctor')}</dt>
              <dd className="mt-1 text-sm text-gray-900">{doctorName}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('farmer.date')}</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.date}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('farmer.time')}</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.time}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('farmer.type')}</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.type}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('farmer.status')}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <Badge className={getStatusColor(consultation.status)}>
                  {getStatusText(consultation.status)}
                </Badge>
              </dd>
            </div>
            
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-gray-500">{t('farmer.createdAt')}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(consultation.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </CardContent>
        {consultation.status === "pending" && (
          <CardFooter className="flex justify-end space-x-4 pt-4 border-t">
            <Button asChild variant="secondary" size="lg">
              <Link href={`/farmer/consultations/${consultation._id}/edit`}>
                {t('farmer.editConsultation')}
              </Link>
            </Button>
            <Button variant="destructive" size="lg" onClick={() => setDeleteOpen(true)}>
              {t('farmer.deleteConsultation')}
            </Button>
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
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