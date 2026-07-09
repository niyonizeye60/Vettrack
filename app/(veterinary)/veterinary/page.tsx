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

  return (
    <VeterinaryDashboardClient
      currentUser={currentUser}
      consultations={consultations}
      pendingConsultations={pendingConsultations}
      acceptedConsultations={acceptedConsultations}
      completedCases={completedCases}
      unreadMessages={unreadMessages}
      recentMessages={recentMessages}
    />
  )
}
