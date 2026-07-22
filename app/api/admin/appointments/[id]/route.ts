export const dynamicParams = true;
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { updateConsultation, updateConsultationStatus } from "@/lib/actions"
import { ObjectId } from "mongodb"

const DB = "ntdm_animal_hospital"

// PATCH: admin edits an appointment's schedule and/or status. Status changes
// go through updateConsultationStatus so the farmer gets the same in-app
// notification they'd get from a vet action; date/time go through
// updateConsultation, re-sending the other fields unchanged so they aren't
// wiped out by the $set.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "admin" || !ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { status, date, time } = await request.json()

    const client = await clientPromise
    const db = client.db(DB)
    const existing = await db.collection("consultations").findOne({ _id: new ObjectId(params.id) })
    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    if ((date && date !== existing.date) || (time && time !== existing.time)) {
      const formData = new FormData()
      formData.set("fullName", existing.fullName || "")
      formData.set("phoneNumber", existing.phoneNumber || "")
      formData.set("service", existing.service || "")
      formData.set("doctor", existing.doctor || "")
      formData.set("date", date || existing.date)
      formData.set("time", time || existing.time)
      formData.set("type", existing.type || "")
      await updateConsultation(params.id, formData)
    }

    if (status && status !== (existing.status || "").toLowerCase()) {
      await updateConsultationStatus(params.id, status)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating admin appointment:", error)
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 })
  }
}
