export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { getConsultations } from "@/lib/actions"
import { getCurrentUser } from "@/lib/actions/auth"
import { redirect } from "next/navigation"
import ClientWrapper from "../components/client-wrapper"
import AppointmentsPageClient from "./appointments-page-client"

export const metadata: Metadata = {
  title: "Appointments - Veterinary Dashboard",
  description: "Confirmed appointments with farmers.",
}

export default async function AppointmentsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "doctor") {
    redirect("/login")
  }

  const consultations = await getConsultations(currentUser._id.toString())

  // Only accepted and completed consultations are appointments
  const appointments = consultations.filter(c => c.status === "accepted" || c.status === "completed")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Split by date: upcoming = accepted with date >= today, past = completed or date < today
  const upcoming = appointments
    .filter(c => c.status === "accepted" && new Date(c.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time))

  const past = appointments
    .filter(c => c.status === "completed" || new Date(c.date) < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <ClientWrapper>
      <AppointmentsPageClient upcoming={upcoming} past={past} />
    </ClientWrapper>
  )
}
