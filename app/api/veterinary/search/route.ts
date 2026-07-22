export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getConsultations } from "@/lib/actions"

const MAX_RESULTS = 6

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') || '').trim().toLowerCase()
    if (!query) {
      return NextResponse.json({ patients: [], appointments: [] })
    }

    const consultations = await getConsultations(currentUser._id)

    // Patients are derived from this doctor's consultations grouped by farmer,
    // same logic as the patients page - there is no separate "patients" collection.
    const patientMap = new Map<string, { id: string; name: string; phone: string }>()
    for (const c of consultations) {
      if (!c.farmerId || patientMap.has(c.farmerId)) continue
      patientMap.set(c.farmerId, { id: c.farmerId, name: c.fullName, phone: c.phoneNumber })
    }

    const patients = Array.from(patientMap.values())
      .filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query)
      )
      .slice(0, MAX_RESULTS)

    const appointments = consultations
      .filter(c =>
        c.fullName?.toLowerCase().includes(query) ||
        c.phoneNumber?.toLowerCase().includes(query) ||
        c.service?.toLowerCase().includes(query) ||
        c.status?.toLowerCase().includes(query)
      )
      .slice(0, MAX_RESULTS)
      .map(c => ({
        id: c._id,
        fullName: c.fullName,
        service: c.service,
        date: c.date,
        status: c.status
      }))

    return NextResponse.json({ patients, appointments })
  } catch (error) {
    console.error("Error searching patients/appointments:", error)
    return NextResponse.json({ error: "Failed to search" }, { status: 500 })
  }
}
