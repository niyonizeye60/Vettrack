export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "farmer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const farmerId = currentUser._id.toString()
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const [animals, consultations] = await Promise.all([
      db.collection("animals")
        .find({ ownerId: farmerId })
        .sort({ createdAt: -1 })
        .limit(20)
        .project({ _id: 1, name: 1, type: 1, status: 1, createdAt: 1, updatedAt: 1 })
        .toArray(),
      db.collection("consultations")
        .find({ farmerId })
        .sort({ createdAt: -1 })
        .limit(20)
        .project({ _id: 1, service: 1, status: 1, createdAt: 1, updatedAt: 1 })
        .toArray(),
    ])

    type ActivityItem = {
      id: string
      kind: "animal_registered" | "animal_updated" | "consultation_booked" | "consultation_status"
      title: string
      description: string
      date: string
    }

    const items: ActivityItem[] = []

    for (const a of animals) {
      items.push({
        id: `animal-created-${a._id}`,
        kind: "animal_registered",
        title: a.name,
        description: a.type,
        date: a.createdAt?.toISOString?.() ?? a.createdAt,
      })
      if (a.updatedAt && a.updatedAt.toString() !== a.createdAt?.toString()) {
        items.push({
          id: `animal-updated-${a._id}`,
          kind: "animal_updated",
          title: a.name,
          description: a.status ?? "",
          date: a.updatedAt?.toISOString?.() ?? a.updatedAt,
        })
      }
    }

    for (const c of consultations) {
      items.push({
        id: `consult-created-${c._id}`,
        kind: "consultation_booked",
        title: c.service,
        description: c.status,
        date: c.createdAt?.toISOString?.() ?? c.createdAt,
      })
      if (c.updatedAt && c.updatedAt.toString() !== c.createdAt?.toString()) {
        items.push({
          id: `consult-updated-${c._id}`,
          kind: "consultation_status",
          title: c.service,
          description: c.status,
          date: c.updatedAt?.toISOString?.() ?? c.updatedAt,
        })
      }
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ activity: items.slice(0, 20) })
  } catch (error) {
    console.error("Error fetching farmer activity:", error)
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 })
  }
}
