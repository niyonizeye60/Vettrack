export const dynamic = "force-dynamic";

import type { Metadata } from "next"
import { getConsultations, getDoctorsList } from "@/lib/actions"
import { getCurrentUser } from "@/lib/actions/auth"
import { redirect } from "next/navigation"
import ConsultationsContent from "./components/consultations-content"

export const metadata: Metadata = {
  title: "My Consultations - Farmer Dashboard",
  description: "Manage your veterinary consultations.",
}

export default async function FarmerConsultationsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login")
  }

  const farmerId = currentUser._id.toString()
  const [consultations, doctors] = await Promise.all([
    getConsultations(undefined, farmerId),
    getDoctorsList(),
  ])

  return <ConsultationsContent consultations={consultations} doctors={doctors} farmerId={farmerId} />
}
