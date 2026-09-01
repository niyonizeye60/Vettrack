export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

const DB = "ntdm_animal_hospital"
const AUDIT = "vet_audit_logs"

const MAX_LIMIT = 200

// The farmer's transparency feed: everything veterinarians have done on this farm.
// Scoped hard to the caller's own farm - there is no farmerId parameter, so one
// farmer can never read another's trail, and a vet cannot read it at all.
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (currentUser.role !== "farmer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const query: Record<string, unknown> = { farmerId: currentUser._id }

    const vetId = searchParams.get("vetId")
    if (vetId) query.vetId = vetId

    const moduleKey = searchParams.get("module")
    if (moduleKey) query.module = moduleKey

    const from = searchParams.get("from")
    const to = searchParams.get("to")
    if (from || to) {
      const range: Record<string, Date> = {}
      if (from) range.$gte = new Date(from)
      if (to) {
        // `to` is a date-only string from the filter UI; include the whole day.
        const end = new Date(to)
        end.setHours(23, 59, 59, 999)
        range.$lte = end
      }
      query.createdAt = range
    }

    const limit = Math.min(Number(searchParams.get("limit")) || 100, MAX_LIMIT)

    const client = await clientPromise
    const db = client.db(DB)
    const entries = await db
      .collection(AUDIT)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json({
      entries: entries.map((e) => ({ ...e, _id: e._id.toString() })),
    })
  } catch (error) {
    console.error("Error loading vet audit log:", error)
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 })
  }
}
