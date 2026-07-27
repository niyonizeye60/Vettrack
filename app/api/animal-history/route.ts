export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { getAnimalById } from "@/lib/actions"

const DB = "ntdm_animal_hospital"

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!["doctor", "admin", "superadmin"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const animalId = searchParams.get("animalId")
    if (!animalId) return NextResponse.json({ error: "animalId required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const [animal, consultations, diseaseRecords, treatmentDoses] = await Promise.all([
      getAnimalById(animalId),
      db.collection("consultations").find({ animalId }).toArray(),
      db.collection("disease_records").find({ animalId }).toArray(),
      db.collection("treatment_doses").find({ animalId }).toArray(),
    ])

    // Resolve doctor names for the consultation subset, same defensive
    // string-or-ObjectId handling as getConsultations/getConsultationById.
    const doctorIds = [...new Set(consultations.map((c) => c.doctor).filter((id) => id && ObjectId.isValid(id)))]
    const doctors = doctorIds.length > 0
      ? await db.collection("users").find({ _id: { $in: doctorIds.map((id) => new ObjectId(id)) }, role: "doctor" }).toArray()
      : []
    const doctorMap = new Map(doctors.map((d) => [d._id.toString(), d.name]))

    const consultationEntries = consultations.map((c) => {
      const doctorId = c.doctor ? c.doctor.toString() : null
      return {
        type: "consultation" as const,
        id: c._id.toString(),
        date: c.date || (c.createdAt ? c.createdAt.toISOString() : null),
        time: c.time || null,
        createdAt: c.createdAt ? c.createdAt.toISOString() : null,
        status: (c.status || "").toLowerCase(),
        service: c.service || null,
        doctorId,
        doctorName: (doctorId && doctorMap.get(doctorId)) || null,
        feedback: c.feedback || null,
        diagnosis: c.diagnosis || null,
        symptomsObserved: c.symptomsObserved || null,
        treatmentGiven: c.treatmentGiven || null,
        medicationDosage: c.medicationDosage || null,
        followUpNeeded: c.followUpNeeded || false,
        followUpDate: c.followUpDate || null,
      }
    })

    const diseaseEntries = diseaseRecords.map((r) => ({
      type: "disease_record" as const,
      id: r._id.toString(),
      date: r.diagnosedDate || (r.createdAt ? r.createdAt.toISOString() : null),
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
      diseaseName: r.diseaseName,
      symptoms: r.symptoms || null,
      treatment: r.treatment || null,
      status: r.status || null,
      resolvedDate: r.resolvedDate || null,
      notes: r.notes || null,
      veterinarianName: r.veterinarianName || null,
      vetOrigin: r.vetOrigin || null,
    }))

    const treatmentDoseEntries = treatmentDoses.map((d) => ({
      type: "treatment_dose" as const,
      id: d._id.toString(),
      date: d.date || (d.createdAt ? d.createdAt.toISOString() : null),
      createdAt: d.createdAt ? d.createdAt.toISOString() : null,
      diseaseRecordId: d.diseaseRecordId || null,
      diseaseName: d.diseaseName || null,
      session: d.session || null,
      medicines: d.medicines || [],
      vetCost: d.vetCost || 0,
      totalCost: d.totalCost || 0,
      notes: d.notes || null,
    }))

    const timeline = [...consultationEntries, ...diseaseEntries, ...treatmentDoseEntries].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime()
      const dateB = new Date(b.date || b.createdAt || 0).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      animal,
      timeline,
      counts: {
        consultations: consultationEntries.length,
        diseaseRecords: diseaseEntries.length,
        treatmentDoses: treatmentDoseEntries.length,
      },
    })
  } catch (error) {
    console.error("Error fetching animal history:", error)
    return NextResponse.json({ error: "Failed to fetch animal history" }, { status: 500 })
  }
}
