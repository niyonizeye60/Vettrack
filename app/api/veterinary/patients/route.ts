export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getConsultations } from "@/lib/actions"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { DEVICES } from "@/lib/tracking/store"

// Returns the vet's patients (farmers they have consultations with), flagging
// which ones have a tracking collar registered so the client can guide the vet.
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const consultations = await getConsultations(currentUser._id)

    // Dedupe consultations down to unique patients (farmers).
    const patientMap = new Map<string, { id: string; name: string; phone: string }>()
    for (const c of consultations) {
      if (!c.farmerId || patientMap.has(c.farmerId)) continue
      patientMap.set(c.farmerId, { id: c.farmerId, name: c.fullName, phone: c.phoneNumber })
    }

    const farmerIds = [...patientMap.keys()].filter((id) => ObjectId.isValid(id))

    // Which of those farmers have a tracking collar registered?
    const configured = new Set<string>()
    if (farmerIds.length > 0) {
      const client = await clientPromise
      const db = client.db("ntdm_animal_hospital")
      const farmerIdsWithDevices = await db
        .collection(DEVICES)
        .distinct("farmerId", { farmerId: { $in: farmerIds }, status: "active" })
      farmerIdsWithDevices.forEach((id) => configured.add(String(id)))
    }

    const patients = [...patientMap.values()]
      .map((p) => ({ ...p, hasTracking: configured.has(p.id) }))
      // Trackable patients first, then alphabetical.
      .sort((a, b) =>
        Number(b.hasTracking) - Number(a.hasTracking) || a.name.localeCompare(b.name)
      )

    return NextResponse.json({ patients })
  } catch (error) {
    console.error("Error fetching vet patients:", error)
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 })
  }
}
