export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { listGrantsForFarmer, logVetAction } from "@/lib/farm-access"
import { normalizePermissions, hasAnyPermission, PERMISSION_MODULES, PERMISSION_ACTIONS } from "@/lib/permissions"

const DB = "ntdm_animal_hospital"
const GRANTS = "farm_vet_grants"

// Grants are managed by the farm owner only. Staff are intentionally excluded here:
// deciding who may touch a farmer's records is the farmer's call, not an admin's.
async function requireFarmOwner() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (currentUser.role !== "farmer") {
    return { error: NextResponse.json({ error: "Only farmers can manage veterinarian access" }, { status: 403 }) }
  }
  return { currentUser }
}

function summarizePermissions(permissions: ReturnType<typeof normalizePermissions>) {
  const parts: string[] = []
  for (const mod of PERMISSION_MODULES) {
    const granted = PERMISSION_ACTIONS.filter((a) => permissions[mod.key][a])
    if (granted.length > 0) parts.push(`${mod.key}: ${granted.join("/")}`)
  }
  return parts.length > 0 ? parts.join("; ") : "no permissions"
}

export async function GET() {
  try {
    const { currentUser, error } = await requireFarmOwner()
    if (error) return error

    const grants = await listGrantsForFarmer(currentUser!._id)
    return NextResponse.json({ grants })
  } catch (error) {
    console.error("Error listing farm vet grants:", error)
    return NextResponse.json({ error: "Failed to load veterinarian access" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { currentUser, error } = await requireFarmOwner()
    if (error) return error

    const body = await req.json()
    const { vetId, note } = body
    if (!vetId || !ObjectId.isValid(vetId)) {
      return NextResponse.json({ error: "A valid veterinarian is required" }, { status: 400 })
    }

    const permissions = normalizePermissions(body.permissions)
    if (!hasAnyPermission(permissions)) {
      return NextResponse.json({ error: "Select at least one permission" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    // Only actual veterinarians can be granted access.
    const vet = await db.collection("users").findOne(
      { _id: new ObjectId(vetId), role: "doctor" },
      { projection: { name: 1, status: 1 } }
    )
    if (!vet) return NextResponse.json({ error: "Veterinarian not found" }, { status: 404 })
    if (vet.status !== "active") {
      return NextResponse.json({ error: "That veterinarian's account is not active" }, { status: 400 })
    }

    const now = new Date()
    // Upsert on (farmerId, vetId): re-granting a previously revoked vet reactivates the
    // same row so the grant history and its audit trail stay on one document.
    await db.collection(GRANTS).updateOne(
      { farmerId: currentUser!._id, vetId },
      {
        $set: {
          permissions,
          updateOwnOnly: body.updateOwnOnly === true,
          note: note || null,
          status: "active",
          revokedAt: null,
          updatedAt: now,
        },
        $setOnInsert: { farmerId: currentUser!._id, vetId, grantedAt: now },
      },
      { upsert: true }
    )

    await logVetAction({
      farmerId: currentUser!._id,
      vetId,
      vetName: vet.name || "Veterinarian",
      module: "access",
      action: "access.granted",
      summary: `${currentUser!.name || "The farmer"} granted ${vet.name} access (${summarizePermissions(permissions)})`,
    })
    await logActivity(currentUser!._id, "farm.vet_access_granted", vet.name || vetId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error granting farm vet access:", error)
    return NextResponse.json({ error: "Failed to grant access" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { currentUser, error } = await requireFarmOwner()
    if (error) return error

    const body = await req.json()
    const { vetId } = body
    if (!vetId) return NextResponse.json({ error: "Veterinarian required" }, { status: 400 })

    const permissions = normalizePermissions(body.permissions)
    if (!hasAnyPermission(permissions)) {
      return NextResponse.json({ error: "Select at least one permission" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection(GRANTS).findOne({ farmerId: currentUser!._id, vetId })
    if (!existing) return NextResponse.json({ error: "Access record not found" }, { status: 404 })

    await db.collection(GRANTS).updateOne(
      { _id: existing._id },
      {
        $set: {
          permissions,
          updateOwnOnly: body.updateOwnOnly === true,
          note: body.note || null,
          updatedAt: new Date(),
        },
      }
    )

    const vet = ObjectId.isValid(vetId)
      ? await db.collection("users").findOne({ _id: new ObjectId(vetId) }, { projection: { name: 1 } })
      : null

    await logVetAction({
      farmerId: currentUser!._id,
      vetId,
      vetName: vet?.name || "Veterinarian",
      module: "access",
      action: "access.updated",
      summary: `${currentUser!.name || "The farmer"} updated ${vet?.name || "the veterinarian"}'s permissions (${summarizePermissions(permissions)})`,
    })
    await logActivity(currentUser!._id, "farm.vet_access_updated", vet?.name || vetId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating farm vet access:", error)
    return NextResponse.json({ error: "Failed to update access" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { currentUser, error } = await requireFarmOwner()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const vetId = searchParams.get("vetId")
    if (!vetId) return NextResponse.json({ error: "Veterinarian required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    // Revoke, never delete: the farmer must keep the history of who had access and
    // what they did, and the records the vet created stay attributed to them.
    const result = await db.collection(GRANTS).updateOne(
      { farmerId: currentUser!._id, vetId },
      { $set: { status: "revoked", revokedAt: new Date(), updatedAt: new Date() } }
    )
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Access record not found" }, { status: 404 })
    }

    const vet = ObjectId.isValid(vetId)
      ? await db.collection("users").findOne({ _id: new ObjectId(vetId) }, { projection: { name: 1 } })
      : null

    await logVetAction({
      farmerId: currentUser!._id,
      vetId,
      vetName: vet?.name || "Veterinarian",
      module: "access",
      action: "access.revoked",
      summary: `${currentUser!.name || "The farmer"} revoked ${vet?.name || "the veterinarian"}'s access`,
    })
    await logActivity(currentUser!._id, "farm.vet_access_revoked", vet?.name || vetId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error revoking farm vet access:", error)
    return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 })
  }
}
