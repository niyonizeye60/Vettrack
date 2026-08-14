export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"

const DB = "ntdm_animal_hospital"

/**
 * Promote a calf into the main animals herd.
 *
 * A calf that has grown up needs to be a row in `animals` to be inseminated, milked,
 * sold or given disease records - but its vaccination history must come with it, or
 * the booster schedule silently restarts and the farm looks unvaccinated.
 *
 * What moves and what stays is deliberate:
 *   - vaccination_records are re-pointed at the new animal. A vaccination protects the
 *     living beast, so the history belongs wherever that beast now lives.
 *   - calf_weights and calf_expenses stay on the calf. They are a record of the
 *     rearing period, and calf_expenses already feeds "Calf Rearing Costs" in the
 *     general report - re-pointing them would rewrite periods already reported.
 *   - The calf row itself is kept, marked graduated and linked to the new animal,
 *     rather than deleted, so that rearing history stays reachable.
 *
 * There are no transactions in this codebase, so the calf is claimed atomically up
 * front and the claim is released if the animal insert fails. That makes a
 * double-submit impossible to turn into two animals, which is the failure that would
 * actually corrupt the herd.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, calfId, type, animalClass, breed, earTagId, insuranceId, weight, price } = body

    if (!farmerId || !calfId) return NextResponse.json({ error: "farmerId and calfId required" }, { status: 400 })
    if (!ObjectId.isValid(calfId)) return NextResponse.json({ error: "Invalid calf" }, { status: 400 })
    if (!type) return NextResponse.json({ error: "Animal type required" }, { status: 400 })

    // Graduating is herd management, not clinical work: same owner-or-staff rule as
    // the rest of /api/calves, and deliberately not delegated to a veterinarian.
    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    // Claim the calf atomically. The graduatedAt guard means a second concurrent
    // request matches nothing and is rejected before any animal is created.
    // Driver v6 returns the document itself here, not a { value } wrapper.
    const calf = await db.collection("calves").findOneAndUpdate(
      { _id: new ObjectId(calfId), farmerId, graduatedAt: { $exists: false } },
      { $set: { graduatedAt: new Date() } },
      { returnDocument: "before" }
    )
    if (!calf) {
      const exists = await db.collection("calves").findOne({ _id: new ObjectId(calfId), farmerId })
      return exists
        ? NextResponse.json({ error: "This calf has already been moved to your animals" }, { status: 409 })
        : NextResponse.json({ error: "Calf not found on this farm" }, { status: 404 })
    }

    try {
      const owner = await db.collection("users").findOne({ _id: new ObjectId(farmerId) })

      const animal = {
        name: calf.name,
        type,
        breed: breed || calf.breed || null,
        district: owner?.district || null,
        sector: owner?.sector || null,
        class: animalClass || null,
        ownerName: owner?.name || null,
        phoneNumber: owner?.phone || null,
        price: price ? Number(price) : 0,
        weight: weight ? Number(weight) : null,
        // Born on this farm - the vocabulary the animal form already uses.
        acquisitionType: "born",
        earTagId: earTagId || null,
        insuranceId: insuranceId || null,
        gender: calf.gender || null,
        lactationStatus: type === "cow" && calf.gender === "female" ? "dry" : null,
        birthDate: calf.birthDate || null,
        motherAnimalId: calf.motherAnimalId || null,
        motherName: calf.motherName || null,
        // Provenance, so the animal can always be traced back to its rearing history.
        graduatedFromCalfId: calfId,
        createdAt: new Date(),
        ownerId: farmerId,
        status: "Healthy",
        owner: { _id: farmerId, name: owner?.name || null },
      }

      const result = await db.collection("animals").insertOne(animal)
      const animalId = result.insertedId.toString()

      // The whole point of the exercise: the vaccination history follows the beast.
      const moved = await db.collection("vaccination_records").updateMany(
        { farmerId, subjectType: "calf", subjectId: calfId },
        { $set: { subjectType: "animal", subjectId: animalId } }
      )

      await db.collection("calves").updateOne(
        { _id: new ObjectId(calfId) },
        { $set: { status: "graduated", graduatedToAnimalId: animalId, updatedAt: new Date() } }
      )

      await db.collection("users").updateOne(
        { _id: new ObjectId(farmerId) },
        { $push: { animals: result.insertedId } } as any
      )

      await logActivity(
        currentUser._id,
        "livestock.calf_graduated",
        `${calf.name} moved to animals${moved.modifiedCount ? ` with ${moved.modifiedCount} vaccination record(s)` : ""}`
      )

      return NextResponse.json({
        success: true,
        animalId,
        vaccinationRecordsMoved: moved.modifiedCount,
      })
    } catch (error) {
      // Release the claim so the farmer can retry rather than being left with a calf
      // that is marked graduated but has no animal to show for it.
      await db.collection("calves").updateOne(
        { _id: new ObjectId(calfId) },
        { $unset: { graduatedAt: "" } }
      )
      throw error
    }
  } catch (error) {
    console.error("Error graduating calf:", error)
    return NextResponse.json({ error: "Failed to move calf to animals" }, { status: 500 })
  }
}
