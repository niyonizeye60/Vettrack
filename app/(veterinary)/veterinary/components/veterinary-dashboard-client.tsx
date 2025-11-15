"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Stethoscope, Heart, ClipboardCheck, Mail, Clock, User, Phone } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import AnnouncementsBanner from "@/components/ui/announcements-banner"

interface VeterinaryDashboardClientProps {
  currentUser: any
  consultations: any[]
  pendingConsultations: any[]
  completedCases: any[]
  recentAppointments: any[]
  unreadMessages: number
  recentMessages: any[]
}

export default function VeterinaryDashboardClient({
  currentUser,
  consultations,
  pendingConsultations,
  completedCases,
  recentAppointments,
  unreadMessages,
  recentMessages
}: VeterinaryDashboardClientProps) {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* System Announcements */}
      <AnnouncementsBanner />
      
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dr. {currentUser.name}</h1>
            <p className="text-blue-600 font-medium">{t('vet.dashboard')}</p>
          </div>
        </div>
        <p className="text-gray-600 ml-14">{t('vet.monitorPractice')}</p>
      </div>

      {/* Clinical Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">{t('vet.pendingConsultations')}</CardTitle>
            <div className="p-2 bg-orange-100 rounded-full">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{pendingConsultations.length}</div>
            <p className="text-xs text-gray-500 mt-1">{t('vet.awaitingResponse')}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">{t('vet.totalConsultations')}</CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <Stethoscope className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{consultations.length}</div>
            <p className="text-xs text-gray-500 mt-1">{t('vet.allTimeCases')}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">{t('vet.completedCases')}</CardTitle>
            <div className="p-2 bg-green-100 rounded-full">
              <Heart className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completedCases.length}</div>
            <p className="text-xs text-gray-500 mt-1">{t('vet.successfullyTreated')}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">{t('vet.newMessages')}</CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{unreadMessages}</div>
            <p className="text-xs text-gray-500 mt-1">{t('vet.unreadMessages')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Clinical Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <ClipboardCheck className="h-5 w-5" />
              <CardTitle className="text-lg font-semibold">{t('vet.recentPatientCases')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentAppointments.length > 0 ? (
                recentAppointments.map((appointment) => (
                  <div key={appointment._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4 border-l-blue-400">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Heart className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{appointment.service}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <User className="h-3 w-3" />
                          <span>{appointment.fullName}</span>
                          <span>•</span>
                          <span>{appointment.date}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      appointment.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' :
                      appointment.status === 'accepted' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                      appointment.status === 'pending' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                      'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {appointment.status.toUpperCase()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('vet.noRecentCases')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <CardTitle className="text-lg font-semibold">{t('vet.patientCommunications')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentMessages.length > 0 ? (
                recentMessages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{message.initials}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-semibold text-gray-800">{message.senderName}</p>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 bg-white p-2 rounded border-l-2 border-l-purple-300">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('vet.noRecentMessages')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}