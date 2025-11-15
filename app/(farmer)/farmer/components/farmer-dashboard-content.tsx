"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/LanguageContext"
import AnnouncementsBanner from "@/components/ui/announcements-banner"

import {
  PlusCircle,
  Calendar,
  FileText,
  Activity,
  MilkIcon as Cow,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react"

interface FarmerDashboardContentProps {
  currentUser: {
    _id: string
    name: string
    role: string
  }
  animals: any[]
  consultations: any[]
}

export default function FarmerDashboardContent({ 
  currentUser, 
  animals, 
  consultations 
}: FarmerDashboardContentProps) {
  const { t } = useLanguage()

  // Calculate stats
  const totalAnimals = animals.length
  const pendingRequests = consultations.filter((c) => c.status === "pending")
  const acceptedConsultations = consultations.filter((c) => c.status === "accepted")
  const rejectedConsultations = consultations.filter((c) => c.status === "rejected")

  // Get recent activity (last 6 items - animals registered or consultations booked)
  const recentAnimals = animals
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map((animal) => ({
      type: "animal",
      name: animal.name,
      date: new Date(animal.createdAt).toLocaleDateString(),
      id: animal._id,
    }))

  const recentConsultations = consultations
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map((consultation) => ({
      type: "consultation",
      service: consultation.service,
      date: new Date(consultation.createdAt).toLocaleDateString(),
      id: consultation._id,
      status: consultation.status,
      doctor: consultation.doctor,
    }))

  // Combine and sort recent activity
  const recentActivity = [...recentAnimals, ...recentConsultations]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* System Announcements */}
        <AnnouncementsBanner />

        {/* Enhanced Header Section */}
        <div className="text-center space-y-3 py-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="bg-gradient-to-r from-emerald-500 to-sky-500 p-2 rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent">
              {t('farmer.dashboard')}
            </h1>
          </div>
          <p className="text-base text-slate-600 max-w-xl mx-auto">
            {t('farmer.welcomeBack')}, <span className="font-semibold text-emerald-700">{currentUser.name}</span>! {t('farmer.manageFarm')}
          </p>
        </div>

        {/* Compact Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Animals Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white transform hover:scale-[1.02] transition-all duration-300 hover:shadow-xl">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"></div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide">{t('farmer.animals')}</p>
                  <h3 className="text-2xl font-bold mt-1">{totalAnimals}</h3>
                  <p className="text-emerald-200 text-xs mt-1">{t('farmer.registered')}</p>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                  <Cow className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white transform hover:scale-[1.02] transition-all duration-300 hover:shadow-xl">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"></div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-xs font-medium uppercase tracking-wide">{t('farmer.pending')}</p>
                  <h3 className="text-2xl font-bold mt-1">{pendingRequests.length}</h3>
                  <p className="text-amber-200 text-xs mt-1">{t('farmer.awaiting')}</p>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accepted Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white transform hover:scale-[1.02] transition-all duration-300 hover:shadow-xl">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"></div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs font-medium uppercase tracking-wide">{t('farmer.accepted')}</p>
                  <h3 className="text-2xl font-bold mt-1">{acceptedConsultations.length}</h3>
                  <p className="text-green-200 text-xs mt-1">{t('farmer.confirmed')}</p>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rejected Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-rose-500 to-red-500 text-white transform hover:scale-[1.02] transition-all duration-300 hover:shadow-xl">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"></div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-rose-100 text-xs font-medium uppercase tracking-wide">{t('farmer.rejected')}</p>
                  <h3 className="text-2xl font-bold mt-1">{rejectedConsultations.length}</h3>
                  <p className="text-rose-200 text-xs mt-1">{t('farmer.declined')}</p>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compact Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            asChild
            className="group h-auto py-4 px-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-0"
          >
            <Link href="/farmer/animals/add" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold">{t('farmer.registerAnimal')}</span>
                  <p className="text-xs text-emerald-100 mt-0.5">{t('farmer.addNewLivestock')}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>

          <Button
            asChild
            className="group h-auto py-4 px-6 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-0"
          >
            <Link href="/farmer/consultations/new" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold">{t('farmer.bookConsultation')}</span>
                  <p className="text-xs text-sky-100 mt-0.5">{t('farmer.scheduleVisit')}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>

          <Button
            asChild
            className="group h-auto py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-0"
          >
            <Link href="/farmer/consultations" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold">{t('farmer.viewConsultations')}</span>
                  <p className="text-xs text-indigo-100 mt-0.5">{t('farmer.manageBookings')}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Enhanced Recent Activity */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-slate-50/80 to-gray-50/80 rounded-t-lg border-b border-gray-100">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="bg-gradient-to-r from-sky-500 to-indigo-500 p-2 rounded-lg shadow-sm">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-slate-700 to-gray-700 bg-clip-text text-transparent">
                {t('farmer.recentActivity')}
              </span>
              <Badge variant="secondary" className="ml-auto bg-slate-100 text-slate-700 border-slate-200">
                {recentActivity.length} {t('farmer.items')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-50/50 to-gray-50/50 border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-200"
                  >
                    <div
                      className={`mt-0.5 rounded-xl p-2.5 shadow-sm ${
                        activity.type === "animal"
                          ? "bg-gradient-to-r from-emerald-400 to-green-500"
                          : "bg-gradient-to-r from-sky-400 to-blue-500"
                      }`}
                    >
                      {activity.type === "animal" ? (
                        <Cow className="h-4 w-4 text-white" />
                      ) : (
                        <Calendar className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {activity.type === "animal" ? (
                        <div>
                          <p className="font-medium text-slate-900 truncate">
                            {t('farmer.animalRegistered')} <span className="text-emerald-700 font-semibold">{activity.name}</span>
                          </p>
                          <p className="text-sm text-slate-500 mt-1">{t('farmer.addedOn')} {activity.date}</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-900 truncate">
                              <span className="text-sky-700 font-semibold">{activity.service}</span> {t('farmer.consultation')}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${
                                activity.status === "pending"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : activity.status === "accepted"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : activity.status === "rejected"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-sky-50 text-sky-700 border-sky-200"
                              }`}
                            >
                              {activity.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 mt-1 truncate">
                            {activity.doctor && `Dr. ${activity.doctor} • `}{t('farmer.bookedOn')} {activity.date}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gradient-to-r from-slate-100 to-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Activity className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 text-lg font-medium">{t('farmer.noRecentActivity')}</p>
                <p className="text-slate-400 text-sm mt-1">{t('farmer.farmActivitiesAppear')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}