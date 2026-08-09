export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { resolveFarmAccess } from "@/lib/farm-access"
import { MODULE_KEYS, isPermissionModule } from "@/lib/permissions"

const DB = "ntdm_animal_hospital"

/**
 * The animal picker list for a farm, behind the same grant check as the records.
 *
 * The shared record managers (components/livestock/*) run in both portals and need
 * the farm's animals to attach records to. getAnimals() in lib/actions.ts is a server
 * action with no authorization at all - it will happily return any ownerId's animals -
 * so the vet path must not use it. Access here requires `view` on at least one module
 * the caller was granted, and the projection is limited to what the record forms
 * actually consume: no price, owner name or phone number.
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

    // Scope the check to the module the caller says they're working in, so a vet
    // granted only insemination can't use this as a side door. Falls back to "any
    // granted module" for the owner/staff case.
    const requested = searchParams.get("module")
    const modules = isPermissionModule(requested) ? [requested] : MODULE_KEYS

    let allowed = false
    for (const mod of modules) {
      const access = await resolveFarmAccess(currentUser, farmerId, mod, "view")
      if (access.allowed) { allowed = true; break }
    }
    if (!allowed) {
      return NextResponse.json({ error: "You do not have access to this farm" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    // Same legacy ownerId shapes as getAnimals() in lib/actions.ts.
    const animals = await db
      .collection("animals")
      .find({ $or: [{ ownerId: farmerId }, { "owner._id": farmerId }, { owner: farmerId }] })
      .project({ name: 1, type: 1, breed: 1, gender: 1, earTagId: 1, insuranceId: 1, status: 1, lactationStatus: 1 })
      .sort({ name: 1 })
      .toArray()

    return NextResponse.json(
      animals.map((a) => ({
        _id: a._id.toString(),
        name: a.name || "",
        type: a.type || "",
        breed: a.breed || "",
        gender: a.gender || null,
        earTagId: a.earTagId || null,
        insuranceId: a.insuranceId || null,
        status: a.status || "Healthy",
        lactationStatus: a.lactationStatus || null,
      }))
    )
  } catch (error) {
    console.error("Error fetching farm animals:", error)
    return NextResponse.json({ error: "Failed to fetch animals" }, { status: 500 })
  }
}
