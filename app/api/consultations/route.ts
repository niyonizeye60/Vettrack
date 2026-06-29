export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { getConsultations } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const farmerId = searchParams.get('farmerId')

    // Staff can query any combination; farmers/doctors may only query their own records.
    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      if (currentUser.role === "farmer" && farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (currentUser.role === "doctor" && doctorId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (!farmerId && !doctorId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const consultations = await getConsultations(doctorId || undefined, farmerId || undefined)

    return NextResponse.json(consultations)
  } catch (error) {
    console.error("Consultations API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}