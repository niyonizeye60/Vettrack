export const dynamic = "force-dynamic"

import { getCurrentUser } from "@/lib/actions/auth"
import { getConsultations } from "@/lib/actions"
import { getRecentMessagesData } from "@/lib/actions/veterinary-dashboard"
import { redirect } from "next/navigation"
import VeterinaryDashboardClient from "./components/veterinary-dashboard-client"

export default async function VeterinaryDashboard() {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "doctor") {
    redirect("/login")
  }

  const consultations = await getConsultations(currentUser._id.toString())
  const pendingConsultations = consultations.filter(c => c.status === "pending")
  const acceptedConsultations = consultations.filter(c => c.status === "accepted")
  const completedCases = consultations.filter(c => c.status === "completed")

  const { unreadMessages, recentMessages } = await getRecentMessagesData()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingAppointments = acceptedConsultations
    .filter(c => new Date(c.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time))
    .slice(0, 4)

  const missedAppointments = acceptedConsultations
    .filter(c => new Date(c.date) < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const recentPatients: typeof consultations = []
  const seenAnimals = new Set<string>()
  for (const c of consultations
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) {
    if (!c.animalName) continue
    const key = c.animalId || `${c.farmerId}-${c.animalName}`
    if (seenAnimals.has(key)) continue
    seenAnimals.add(key)
    recentPatients.push(c)
    if (recentPatients.length === 4) break
  }

  return (
    <VeterinaryDashboardClient
      currentUser={currentUser}
      consultations={consultations}
      pendingConsultations={pendingConsultations}
      acceptedConsultations={acceptedConsultations}
      completedCases={completedCases}
      unreadMessages={unreadMessages}
      recentMessages={recentMessages}
      upcomingAppointments={upcomingAppointments}
      missedAppointments={missedAppointments}
      recentPatients={recentPatients}
    />
  )
}
