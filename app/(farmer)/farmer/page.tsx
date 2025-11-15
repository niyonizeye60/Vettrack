import type { Metadata } from "next"
import { getAnimals, getConsultations } from "@/lib/actions"
import { getCurrentUser } from "@/lib/actions/auth"
import { redirect } from "next/navigation"
import FarmerDashboardContent from "./components/farmer-dashboard-content"

export const metadata: Metadata = {
  title: "Farmer Dashboard - NTDM Animal Hospital",
  description: "Manage your animals, consultations, and more.",
}

export const dynamic = "force-dynamic"

export default async function FarmerDashboard() {
  const currentUser = await getCurrentUser()

  // Redirect if not logged in or not a farmer
  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login")
  }

  const userId = currentUser._id.toString()

  // Fetch farmer's animals
  const animals = await getAnimals(userId)

  // Fetch farmer's consultations
  const consultations = await getConsultations(undefined, userId)

  return (
    <FarmerDashboardContent 
      currentUser={currentUser}
      animals={animals}
      consultations={consultations}
    />
  )
}
