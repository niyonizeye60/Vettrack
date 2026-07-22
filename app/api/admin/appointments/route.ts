export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { bookConsultation } from "@/lib/actions"
import { ObjectId } from "mongodb"

const DB = "ntdm_animal_hospital"

// GET: every consultation (the real "appointment" record farmers book and vets
// action), plus the doctor/farmer rosters needed to render and schedule them.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const [consultations, doctors, farmers] = await Promise.all([
      db.collection("consultations").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("users").find({ role: "doctor" }).toArray(),
      db.collection("users").find({ role: "farmer" }).toArray(),
    ])

    const doctorMap = new Map(doctors.map((d) => [d._id.toString(), d]))

    const appointments = consultations.map((c) => {
      const doctorId = c.doctor ? c.doctor.toString() : null
      const doctor = doctorId ? doctorMap.get(doctorId) : null
      return {
        id: c._id.toString(),
        fullName: c.fullName,
        phoneNumber: c.phoneNumber,
        service: c.service,
        date: c.date,
        time: c.time,
        type: c.type,
        status: (c.status || "pending").toLowerCase(),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt || null,
        doctorId,
        doctorName: doctor?.name || null,
        farmerId: c.farmerId || null,
        feedback: c.feedback || null,
        animalName: c.animalName || null,
        animalType: c.animalType || null,
        animalBreed: c.animalBreed || null,
      }
    })

    return NextResponse.json({
      appointments,
      doctors: doctors.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        email: d.email,
        specialization: d.specialization || "",
        phone: d.phone || "",
        status: d.status || "active",
      })),
      farmers: farmers.map((f) => ({
        id: f._id.toString(),
        name: f.name,
        phone: f.phone || "",
      })),
    })
  } catch (error) {
    console.error("Error fetching admin appointments:", error)
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
  }
}

// POST: admin schedules a new appointment on behalf of a farmer. Reuses the
// same bookConsultation action farmers use themselves, so the doctor gets the
// identical in-app notification + email as a farmer-initiated booking.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { farmerId, doctorId, service, date, time, type } = await request.json()

    if (!farmerId || !doctorId || !service || !date || !time || !type || !ObjectId.isValid(farmerId)) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DB)
    const farmer = await db.collection("users").findOne({ _id: new ObjectId(farmerId), role: "farmer" })
    if (!farmer) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 })
    }

    const formData = new FormData()
    formData.set("fullName", farmer.name || "")
    formData.set("phoneNumber", farmer.phone || "")
    formData.set("service", service)
    formData.set("doctor", doctorId)
    formData.set("date", date)
    formData.set("time", time)
    formData.set("type", type)

    const result = await bookConsultation(formData, farmerId)
    if (!result.success) {
      return NextResponse.json({ error: "Failed to schedule appointment" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error scheduling admin appointment:", error)
    return NextResponse.json({ error: "Failed to schedule appointment" }, { status: 500 })
  }
}
