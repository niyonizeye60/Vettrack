"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Stethoscope, ClipboardCheck, Mail, Clock,
  CheckCircle, ArrowRight, Check, X, User, Phone
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { updateConsultationStatus } from "@/lib/actions"
import AnnouncementsBanner from "@/components/ui/announcements-banner"

interface VeterinaryDashboardClientProps {
  currentUser: any
  consultations: any[]
  pendingConsultations: any[]
  acceptedConsultations: any[]
  completedCases: any[]
  unreadMessages: number
  recentMessages: any[]
}

export default function VeterinaryDashboardClient({
  currentUser,
  consultations,
  pendingConsultations,
  acceptedConsultations,
  completedCases,
  unreadMessages,
  recentMessages,
}: VeterinaryDashboardClientProps) {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [pending, setPending] = useState(pendingConsultations.slice(0, 5))
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleQuickAction = async (id: string, action: "accept" | "reject") => {
    setLoadingId(id)
    try {
      const newStatus = action === "accept" ? "accepted" : "rejected"
      const result = await updateConsultationStatus(id, newStatus)
      if (result.success) {
        setPending(prev => prev.filter(c => c._id !== id))
        toast({
          title: action === "accept" ? t("vet.consultationAccepted") : t("vet.consultationRejected"),
          description: action === "accept" ? t("vet.consultationAcceptedDesc") : t("vet.consultationRejectedDesc"),
          variant: action === "accept" ? "default" : "destructive",
        })
      } else {
        throw new Error(result.error || "Failed")
      }
    } catch {
      toast({ title: t("common.error") || "Error", description: t("vet.statusUpdateFailed"), variant: "destructive" })
    } finally {
      setLoadingId(null)
    }
  }

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="p-4 sm:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Announcements */}
        <AnnouncementsBanner />

        {/* Greeting */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Dr. {currentUser.name}
          </h1>
          <p className="text-green-600 font-medium text-sm mt-1">{t('vet.veterinarian')}</p>
          <p className="text-gray-400 text-xs mt-0.5">{today}</p>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

          {/* Pending — black */}
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t('vet.pendingConsultations')}</p>
                <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{pendingConsultations.length}</h3>
              <p className="text-xs text-gray-400 mt-1">{t('vet.awaitingResponse')}</p>
            </CardContent>
          </Card>

          {/* Accepted / In Progress — green */}
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t('vet.activeCases')}</p>
                <Stethoscope className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-green-600 mt-2">{acceptedConsultations.length}</h3>
              <p className="text-xs text-gray-400 mt-1">{t('vet.inProgress')}</p>
            </CardContent>
          </Card>

          {/* Completed — blue */}
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t('vet.completedCases')}</p>
                <CheckCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-blue-600 mt-2">{completedCases.length}</h3>
              <p className="text-xs text-gray-400 mt-1">{t('vet.successfullyTreated')}</p>
            </CardContent>
          </Card>

          {/* Messages — orange */}
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t('vet.newMessages')}</p>
                <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-orange-600 mt-2">{unreadMessages}</h3>
              <p className="text-xs text-gray-400 mt-1">{t('vet.unreadMessages')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Requires Action */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <ClipboardCheck className="h-5 w-5 text-green-600" />
                  {t('vet.requiresAction')}
                  {pending.length > 0 && (
                    <Badge className="bg-green-600 text-white text-xs px-1.5 py-0 h-5">
                      {pending.length}
                    </Badge>
                  )}
                </CardTitle>
                <Link href="/veterinary/consultations" className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                  {t('vet.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {pending.length > 0 ? (
                <div className="space-y-2">
                  {pending.map((consultation) => (
                    <div
                      key={consultation._id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150 gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">{consultation.fullName}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span className="truncate">{consultation.service}</span>
                            {consultation.phoneNumber && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5 flex-shrink-0">
                                  <Phone className="h-2.5 w-2.5" />
                                  {consultation.phoneNumber}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-white text-xs"
                          disabled={loadingId === consultation._id}
                          onClick={() => handleQuickAction(consultation._id, "accept")}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {t('vet.accept')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-red-600 border-red-200 hover:bg-red-50 text-xs"
                          disabled={loadingId === consultation._id}
                          onClick={() => handleQuickAction(consultation._id, "reject")}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          {t('vet.reject')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <ClipboardCheck className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">{t('vet.noPendingConsultations')}</p>
                  <p className="text-gray-400 text-xs mt-1">{t('vet.allCaughtUp')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Mail className="h-5 w-5 text-violet-500" />
                  {t('vet.recentMessages')}
                  {unreadMessages > 0 && (
                    <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0 h-5">
                      {unreadMessages}
                    </Badge>
                  )}
                </CardTitle>
                <Link href="/veterinary/messages" className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                  {t('vet.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {recentMessages.length > 0 ? (
                <div className="space-y-2">
                  {recentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-colors duration-150 ${
                        message.unread ? "bg-green-50/60 hover:bg-green-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-green-700">{message.initials}</span>
                        </div>
                        {message.unread && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${message.unread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                            {message.senderName}
                          </p>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 truncate ${message.unread ? "text-gray-700" : "text-gray-400"}`}>
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">{t('vet.noRecentMessages')}</p>
                  <p className="text-gray-400 text-xs mt-1">{t('vet.noMessagesYet')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
