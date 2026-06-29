export const dynamic = "force-dynamic";

import type { Metadata } from "next"
import { getConsultations } from "@/lib/actions"
import { getCurrentUser } from "@/lib/actions/auth"
import { redirect } from "next/navigation"
import ConsultationsContent from "./components/consultations-content"

export const metadata: Metadata = {
  title: "My Consultations - Farmer Dashboard",
  description: "Manage your veterinary consultations.",
}

export default async function FarmerConsultationsPage() {
  const currentUser = await getCurrentUser()
  
  // Redirect if not logged in or not a farmer
  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login")
  }

  // Get consultations for this farmer only
  const farmerId = currentUser._id.toString()
  const consultations = await getConsultations(undefined, farmerId)

  return <ConsultationsContent consultations={consultations} farmerId={farmerId} />
}
