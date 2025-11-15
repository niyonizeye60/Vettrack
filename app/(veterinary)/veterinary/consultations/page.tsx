export const dynamic = "force-dynamic";

import type { Metadata } from "next"
import { getConsultations } from "@/lib/actions"
import { getCurrentUser } from "@/lib/actions/auth"
import { redirect } from "next/navigation"
import ClientWrapper from "../components/client-wrapper"
import ConsultationsPageClient from "./consultations-page-client"

export const metadata: Metadata = {
  title: "Consultation Management - Veterinary Dashboard",
  description: "Manage and respond to veterinary consultation requests.",
}

export default async function ConsultationManagementPage() {
  const currentUser = await getCurrentUser()
  
  // Redirect if not logged in or not a doctor
  if (!currentUser || currentUser.role !== "doctor") {
    redirect("/login")
  }

  const consultations = await getConsultations(currentUser._id.toString())

  return (
    <ClientWrapper>
      <ConsultationsPageClient consultations={consultations} />
    </ClientWrapper>
  )
} 