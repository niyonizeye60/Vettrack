export const dynamicParams = true;
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getConsultations } from "@/lib/actions"
import { ObjectId, type Db } from "mongodb"

function latestDate(dates: (string | Date | undefined | null)[]): string | null {
  return dates.reduce((latest: string | null, d) => {
    if (!d) return latest
    const iso = new Date(d).toISOString()
    return !latest || iso > latest ? iso : latest
  }, null)
}

// Chat contacts are intentionally message-content-free: an admin auditing who
// a user has talked to doesn't need to read what was said, just who and when.
async function getChatContacts(db: Db, userId: string) {
  const conversations = await db.collection("conversations")
    .find({ participants: new ObjectId(userId) })
    .toArray()

  if (conversations.length === 0) return []

  const convIds = conversations.map((c) => c._id)
  const messageCounts = await db.collection("messages").aggregate([
    { $match: { conversationId: { $in: convIds }, deletedAt: null } },
    { $group: { _id: "$conversationId", count: { $sum: 1 } } },
  ]).toArray()
  const countByConvId = new Map(messageCounts.map((m) => [m._id.toString(), m.count as number]))

  const byOtherUser = new Map<string, { messageCount: number; lastMessageAt: string | null }>()
  for (const conv of conversations) {
    const otherId = (conv.participants as ObjectId[]).find((p) => p.toString() !== userId)?.toString()
    if (!otherId) continue
    const existing = byOtherUser.get(otherId) || { messageCount: 0, lastMessageAt: null }
    existing.messageCount += countByConvId.get(conv._id.toString()) || 0
    const convLast = conv.lastMessageAt || conv.createdAt
    existing.lastMessageAt = latestDate([existing.lastMessageAt, convLast])
    byOtherUser.set(otherId, existing)
  }

  const otherIds = [...byOtherUser.keys()]
  const otherUsers = await db.collection("users").find(
    { _id: { $in: otherIds.map((id) => new ObjectId(id)) } },
    { projection: { name: 1, email: 1, role: 1, district: 1, sector: 1, specialization: 1 } }
  ).toArray()

  return otherIds.map((id) => {
    const otherUser = otherUsers.find((u) => u._id.toString() === id)
    const stats = byOtherUser.get(id)!
    return {
      _id: id,
      name: otherUser?.name || "Unknown",
      role: otherUser?.role || null,
      email: otherUser?.email || null,
      district: otherUser?.district || null,
      sector: otherUser?.sector || null,
      specialization: otherUser?.specialization || null,
      messageCount: stats.messageCount,
      lastMessageAt: stats.lastMessageAt,
    }
  }).sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""))
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== "admin" || !ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const targetUser = await db.collection("users").findOne({
      _id: new ObjectId(params.id),
      role: { $in: ["farmer", "doctor"] },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { password, ...user } = targetUser
    const sanitizedUser = { ...user, _id: user._id.toString() }

    if (targetUser.role === "farmer") {
      const [animals, medicalHistory, consultations, chatContacts] = await Promise.all([
        db.collection("animals").find({ ownerId: params.id }).sort({ createdAt: -1 }).toArray(),
        db.collection("disease_records").find({ farmerId: params.id }).sort({ diagnosedDate: -1, createdAt: -1 }).toArray(),
        getConsultations(undefined, params.id),
        getChatContacts(db, params.id),
      ])

      const doctorIds = [...new Set(consultations.map((c: any) => c.doctorId).filter(Boolean))] as string[]
      const doctorUsers = doctorIds.length > 0
        ? await db.collection("users").find(
            { _id: { $in: doctorIds.map((id) => new ObjectId(id)) } },
            { projection: { name: 1, email: 1, phone: 1, specialization: 1 } }
          ).toArray()
        : []

      const contacts = doctorIds.map((id) => {
        const doctor = doctorUsers.find((d) => d._id.toString() === id)
        const related = consultations.filter((c: any) => c.doctorId === id)
        return {
          _id: id,
          name: doctor?.name || related[0]?.doctor || "Unknown",
          email: doctor?.email || null,
          phone: doctor?.phone || null,
          specialization: doctor?.specialization || null,
          consultationCount: related.length,
          lastConsultationAt: latestDate(related.map((c: any) => c.createdAt)),
        }
      }).sort((a, b) => (b.lastConsultationAt || "").localeCompare(a.lastConsultationAt || ""))

      return NextResponse.json({
        user: sanitizedUser,
        animals: animals.map((a) => ({ ...a, _id: a._id.toString() })),
        medicalHistory: medicalHistory.map((r) => ({ ...r, _id: r._id.toString() })),
        consultations,
        contacts,
        chatContacts,
      })
    }

    // Doctor: patients contacted, consultation history, and animals treated
    const [consultations, chatContacts] = await Promise.all([
      getConsultations(params.id, undefined),
      getChatContacts(db, params.id),
    ])

    const farmerIds = [...new Set(consultations.map((c: any) => c.farmerId).filter((id: string) => id && ObjectId.isValid(id)))] as string[]
    const farmerUsers = farmerIds.length > 0
      ? await db.collection("users").find(
          { _id: { $in: farmerIds.map((id) => new ObjectId(id)) } },
          { projection: { name: 1, email: 1, phone: 1, district: 1, sector: 1 } }
        ).toArray()
      : []

    const contacts = farmerIds.map((id) => {
      const farmer = farmerUsers.find((f) => f._id.toString() === id)
      const related = consultations.filter((c: any) => c.farmerId === id)
      return {
        _id: id,
        name: farmer?.name || related[0]?.fullName || "Unknown",
        email: farmer?.email || null,
        phone: farmer?.phone || related[0]?.phoneNumber || null,
        district: farmer?.district || null,
        sector: farmer?.sector || null,
        consultationCount: related.length,
        lastConsultationAt: latestDate(related.map((c: any) => c.createdAt)),
      }
    }).sort((a, b) => (b.lastConsultationAt || "").localeCompare(a.lastConsultationAt || ""))

    const animalsTreatedMap = new Map<string, any>()
    consultations.forEach((c: any) => {
      if (c.animalId && !animalsTreatedMap.has(c.animalId)) {
        animalsTreatedMap.set(c.animalId, { _id: c.animalId, name: c.animalName, type: c.animalType, breed: c.animalBreed })
      }
    })

    return NextResponse.json({
      user: sanitizedUser,
      consultations,
      contacts,
      chatContacts,
      animalsTreated: [...animalsTreatedMap.values()],
    })
  } catch (error) {
    console.error("Error fetching user details:", error)
    return NextResponse.json({ error: "Failed to fetch user details" }, { status: 500 })
  }
}
