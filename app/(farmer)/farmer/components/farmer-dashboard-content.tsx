"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/LanguageContext"
import AnnouncementsBanner from "@/components/ui/announcements-banner"

import {
  PlusCircle, Calendar, FileText, Activity,
  MilkIcon as Cow, CheckCircle, XCircle, AlertCircle, ArrowRight,
} from "lucide-react"

interface FarmerDashboardContentProps {
  currentUser: { _id: string; name: string; role: string }
  animals: any[]
  consultations: any[]
}

export default function FarmerDashboardContent({
  currentUser,
  animals,
  consultations,
}: FarmerDashboardContentProps) {
  const { t } = useLanguage()

  const totalAnimals = animals.length
  const pendingRequests = consultations.filter((c) => c.status === "pending")
  const acceptedConsultations = consultations.filter((c) => c.status === "accepted")
  const rejectedConsultations = consultations.filter((c) => c.status === "rejected")

  type AnimalActivity = { type: "animal"; name: string; date: string; id: string }
  type ConsultationActivity = { type: "consultation"; service: string; date: string; id: string; status: string; doctor: string }
  type ActivityItem = AnimalActivity | ConsultationActivity

  const recentAnimals: AnimalActivity[] = animals
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map((animal) => ({ type: "animal" as const, name: animal.name, date: new Date(animal.createdAt).toLocaleDateString(), id: animal._id }))

  const recentConsultations: ConsultationActivity[] = consultations
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map((c) => ({ type: "consultation" as const, service: c.service, date: new Date(c.createdAt).toLocaleDateString(), id: c._id, status: c.status, doctor: c.doctor }))

  const recentActivity: ActivityItem[] = [...recentAnimals, ...recentConsultations]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="p-4 sm:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Announcements */}
        <AnnouncementsBanner />

        {/* Greeting */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {currentUser.name}
          </h1>
          <p className="text-green-600 font-medium text-sm mt-1">{t("farmer.farmer")}</p>
          <p className="text-gray-400 text-xs mt-0.5">{today}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t("farmer.animals")}</p>
                <Cow className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{totalAnimals}</h3>
              <p className="text-xs text-gray-400 mt-1">{t("farmer.registered")}</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t("farmer.pending")}</p>
                <AlertCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-orange-600 mt-2">{pendingRequests.length}</h3>
              <p className="text-xs text-gray-400 mt-1">{t("farmer.awaiting")}</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t("farmer.accepted")}</p>
                <CheckCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-green-600 mt-2">{acceptedConsultations.length}</h3>
              <p className="text-xs text-gray-400 mt-1">{t("farmer.confirmed")}</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t("farmer.rejected")}</p>
                <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-blue-600 mt-2">{rejectedConsultations.length}</h3>
              <p className="text-xs text-gray-400 mt-1">{t("farmer.declined")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white h-auto py-3 px-4 justify-between">
            <Link href="/farmer/animals?action=add" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">{t("farmer.registerAnimal")}</p>
                  <p className="text-xs text-green-100">{t("farmer.addNewLivestock")}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto py-3 px-4 border-gray-200 hover:border-green-600 hover:text-green-700 justify-between">
            <Link href="/farmer/consultations?action=add" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">{t("farmer.bookConsultation")}</p>
                  <p className="text-xs text-gray-400">{t("farmer.scheduleVisit")}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto py-3 px-4 border-gray-200 hover:border-green-600 hover:text-green-700 justify-between">
            <Link href="/farmer/consultations" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">{t("farmer.viewConsultations")}</p>
                  <p className="text-xs text-gray-400">{t("farmer.manageBookings")}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </Link>
          </Button>
        </div>

        {/* Recent activity */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base font-semibold text-gray-900">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                {t("farmer.recentActivity")}
              </div>
              <Badge variant="secondary" className="text-xs">{recentActivity.length} {t("farmer.items")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`mt-0.5 rounded-lg p-2 flex-shrink-0 ${activity.type === "animal" ? "bg-green-50" : "bg-sky-50"}`}>
                      {activity.type === "animal"
                        ? <Cow className="h-4 w-4 text-green-600" />
                        : <Calendar className="h-4 w-4 text-sky-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {activity.type === "animal" ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {t("farmer.animalRegistered")} <span className="text-green-600">{activity.name}</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{t("farmer.addedOn")} {activity.date}</p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              <span className="text-sky-700">{activity.service}</span> {t("farmer.consultation")}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${
                                activity.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200"
                                : activity.status === "accepted" ? "bg-green-50 text-green-700 border-green-200"
                                : activity.status === "rejected" ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                              }`}
                            >
                              {activity.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {activity.doctor && `Dr. ${activity.doctor} · `}{t("farmer.bookedOn")} {activity.date}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Activity className="h-9 w-9 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600">{t("farmer.noRecentActivity")}</p>
                <p className="text-xs text-gray-400 mt-1">{t("farmer.farmActivitiesAppear")}</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
