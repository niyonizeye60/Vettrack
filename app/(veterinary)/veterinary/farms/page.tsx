export const dynamic = "force-dynamic"

import { getCurrentUser } from "@/lib/actions/auth"
import { redirect } from "next/navigation"
import { listFarmsForVet } from "@/lib/farm-access"
import FarmsPageClient from "./farms-page-client"

export default async function VeterinaryFarmsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "doctor") {
    redirect("/login")
  }

  const farms = await listFarmsForVet(currentUser._id.toString())

  return <FarmsPageClient farms={JSON.parse(JSON.stringify(farms))} />
}
