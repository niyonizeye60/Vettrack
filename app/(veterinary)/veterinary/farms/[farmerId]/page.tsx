export const dynamicParams = true
export const dynamic = "force-dynamic"

import { getCurrentUser } from "@/lib/actions/auth"
import { redirect, notFound } from "next/navigation"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getActiveGrant } from "@/lib/farm-access"
import { viewableModules } from "@/lib/permissions"
import FarmDetailClient from "./farm-detail-client"

const DB = "ntdm_animal_hospital"

export default async function VeterinaryFarmDetailPage({
  params,
}: {
  params: { farmerId: string }
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "doctor") {
    redirect("/login")
  }

  const { farmerId } = params
  if (!ObjectId.isValid(farmerId)) notFound()

  // The grant is the gate. Without it this page renders nothing about the farm -
  // and because it is read on every request, a revoked vet loses the page instantly.
  const grant = await getActiveGrant(currentUser._id.toString(), farmerId)
  if (!grant) {
    return <FarmDetailClient revoked />
  }

  const client = await clientPromise
  const db = client.db(DB)

  // Projected to identity only - never the farmer's email, phone or account details.
  // The animal list the record forms need is fetched client-side from the guarded
  // /api/farm-animals endpoint, which re-checks the grant.
  const farmer = await db.collection("users").findOne(
    { _id: new ObjectId(farmerId), role: "farmer" },
    { projection: { name: 1, district: 1, sector: 1 } }
  )
  if (!farmer) notFound()

  return (
    <FarmDetailClient
      farm={{
        farmerId,
        farmerName: farmer.name || "",
        district: farmer.district || "",
        sector: farmer.sector || "",
      }}
      permissions={JSON.parse(JSON.stringify(grant.permissions))}
      updateOwnOnly={grant.updateOwnOnly}
      modules={viewableModules(grant.permissions)}
      vetId={currentUser._id.toString()}
      vetName={currentUser.name || ""}
    />
  )
}
