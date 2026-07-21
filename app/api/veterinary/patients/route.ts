export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getConsultations } from "@/lib/actions"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

// Returns the vet's patients (farmers they have consultations with), flagging
// which ones have a tracking channel configured so the client can guide the vet.
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

    const farmerObjectIds = [...patientMap.keys()]
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id))

    // Which of those farmers have actually set up a tracking channel?
    const configured = new Set<string>()
    if (farmerObjectIds.length > 0) {
      const client = await clientPromise
      const db = client.db("ntdm_animal_hospital")
      const configs = await db.collection("trackingConfigs")
        .find({
          userId: { $in: farmerObjectIds },
          role: "farmer",
          channelId: { $nin: [null, ""] },
        })
        .project({ userId: 1 })
        .toArray()
      configs.forEach((cfg) => configured.add(cfg.userId.toString()))
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
