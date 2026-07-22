"use server"

import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"

async function requireStaff() {
  const user = await getCurrentUser()
  if (!user || !["admin", "superadmin"].includes(user.role)) {
    throw new Error("Unauthorized")
  }
  return user
}

const DB = "ntdm_animal_hospital"

export async function getConsultationOversightData() {
  await requireStaff()
  const client = await clientPromise
  const db = client.db(DB)

  const consultations = await db.collection("consultations")
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()

  const doctorIds = [...new Set(consultations.map((c) => c.doctor).filter((id) => id && ObjectId.isValid(id)))]
  const farmerIds = [...new Set(consultations.map((c) => c.farmerId).filter((id) => id && ObjectId.isValid(id)))]

  const [doctors, farmers] = await Promise.all([
    doctorIds.length
      ? db.collection("users").find({ _id: { $in: doctorIds.map((id) => new ObjectId(id)) } }, { projection: { name: 1 } }).toArray()
      : [],
    farmerIds.length
      ? db.collection("users").find({ _id: { $in: farmerIds.map((id) => new ObjectId(id)) } }, { projection: { name: 1, district: 1, sector: 1 } }).toArray()
      : [],
  ])

  const doctorMap = new Map(doctors.map((d) => [d._id.toString(), d.name as string]))
  const farmerMap = new Map(farmers.map((f) => [f._id.toString(), f]))

  const items = consultations.map((c) => {
    const farmer = c.farmerId ? farmerMap.get(c.farmerId) : null
    return {
      id: c._id.toString(),
      farmerName: farmer?.name || c.fullName || "Unknown",
      district: farmer?.district || null,
      sector: farmer?.sector || null,
      doctorName: doctorMap.get(c.doctor) || "Unassigned",
      service: c.service,
      animalName: c.animalName || null,
      date: c.date,
      time: c.time,
      status: (c.status || "pending").toLowerCase(),
      createdAt: c.createdAt,
    }
  })

  const counts = { pending: 0, accepted: 0, rejected: 0, completed: 0 }
  for (const item of items) {
    if (item.status in counts) counts[item.status as keyof typeof counts]++
  }

  return { items, counts }
}

export async function getDiseaseOversightData() {
  await requireStaff()
  const client = await clientPromise
  const db = client.db(DB)

  const records = await db.collection("disease_records")
    .find({})
    .sort({ diagnosedDate: -1, createdAt: -1 })
    .limit(200)
    .toArray()

  const farmerIds = [...new Set(records.map((r) => r.farmerId).filter((id) => id && ObjectId.isValid(id)))]
  const farmers = farmerIds.length
    ? await db.collection("users").find({ _id: { $in: farmerIds.map((id) => new ObjectId(id)) } }, { projection: { name: 1, district: 1, sector: 1 } }).toArray()
    : []
  const farmerMap = new Map(farmers.map((f) => [f._id.toString(), f]))

  const items = records.map((r) => {
    const farmer = r.farmerId ? farmerMap.get(r.farmerId) : null
    return {
      id: r._id.toString(),
      farmerId: r.farmerId as string,
      farmerName: farmer?.name || "Unknown",
      district: farmer?.district || null,
      sector: farmer?.sector || null,
      animalName: r.animalName || null,
      diseaseName: r.diseaseName as string,
      status: (r.status || "Active") as string,
      diagnosedDate: r.diagnosedDate,
      resolvedDate: r.resolvedDate || null,
      veterinarianName: r.veterinarianName || null,
    }
  })

  const counts = { Active: 0, "Under Treatment": 0, Resolved: 0 }
  for (const item of items) {
    if (item.status in counts) counts[item.status as keyof typeof counts]++
  }

  // Outbreak signal: same disease currently active/under-treatment across
  // multiple distinct farmers - the one thing worth flagging to an officer
  // covering many farms at once.
  const activeFarmersByDisease = new Map<string, Set<string>>()
  for (const item of items) {
    if (item.status === "Resolved") continue
    if (!activeFarmersByDisease.has(item.diseaseName)) activeFarmersByDisease.set(item.diseaseName, new Set())
    activeFarmersByDisease.get(item.diseaseName)!.add(item.farmerId)
  }
  const trending = Array.from(activeFarmersByDisease.entries())
    .filter(([, farmerSet]) => farmerSet.size >= 2)
    .map(([diseaseName, farmerSet]) => ({ diseaseName, farmerCount: farmerSet.size }))
    .sort((a, b) => b.farmerCount - a.farmerCount)

  return { items, counts, trending }
}
