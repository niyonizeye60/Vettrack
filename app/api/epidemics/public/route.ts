export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"

const DB = "ntdm_animal_hospital"

// Public endpoint used by the home page epidemic map.
// Returns only cases that are public (confirmed or resolved) and strips any
// personally identifying info so visitors cannot see who reported a case.
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DB)
    // Only ACTIVE outbreaks are pinned on the public map: resolved or rejected
    // cases are removed from the map as soon as an admin changes their status.
    const records = await db
      .collection("epidemic_cases")
      .find({ status: { $nin: ["resolved", "rejected"] } })
      .sort({ reportedAt: -1 })
      .limit(500)
      .toArray()

    const cases = records.map((r) => ({
      _id: r._id.toString(),
      diseaseName: r.diseaseName,
      animalType: r.animalType || null,
      animalName: r.animalName || null,
      affectedCount: r.affectedCount || 1,
      severity: r.severity || "medium",
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      locationLabel: r.locationLabel || null,
      district: r.district || null,
      sector: r.sector || null,
      status: r.status,
      reportedAt: new Date(r.reportedAt || r.createdAt).toISOString(),
    }))

    return NextResponse.json({ cases })
  } catch (error) {
    console.error("Error fetching public epidemic cases:", error)
    return NextResponse.json({ cases: [] })
  }
}
