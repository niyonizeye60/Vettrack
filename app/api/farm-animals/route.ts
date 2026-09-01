export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { resolveFarmAccess } from "@/lib/farm-access"
import { MODULE_KEYS, isPermissionModule } from "@/lib/permissions"

const DB = "ntdm_animal_hospital"

/**
 * The subject picker list for a farm, behind the same grant check as the records.
 *
 * The shared record managers (components/livestock/*) run in both portals and need
 * the farm's animals to attach records to. getAnimals() in lib/actions.ts is a server
 * action with no authorization at all - it will happily return any ownerId's animals -
 * so the vet path must not use it. Access here requires `view` on at least one module
 * the caller was granted, and the projection is limited to what the record forms
 * actually consume: no price, owner name or phone number.
 *
 * With `includeCalves=1` the farm's calves are appended to the same array, each tagged
 * `kind: "calf"`. They are served from here rather than from /api/calves because that
 * route is the calves *management* endpoint and is farmer-only - routing the picker
 * through it would mean loosening auth on far more than the picker. Callers that omit
 * the flag get exactly the animals-only array they got before.
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

    interface SubjectEntry {
      kind: "animal" | "calf"
      _id: string
      name: string
      type: string
      breed: string
      gender: string | null
      earTagId: string | null
      insuranceId: string | null
      status: string
      lactationStatus: string | null
      birthDate: string | null
      motherName: string | null
    }

    const payload: SubjectEntry[] = animals.map((a) => ({
      kind: "animal",
      _id: a._id.toString(),
      name: a.name || "",
      type: a.type || "",
      breed: a.breed || "",
      gender: a.gender || null,
      earTagId: a.earTagId || null,
      insuranceId: a.insuranceId || null,
      status: a.status || "Healthy",
      lactationStatus: a.lactationStatus || null,
      birthDate: null,
      motherName: null,
    }))

    if (searchParams.get("includeCalves") === "1") {
      // Every status is returned, not just the ones a picker would offer: the caller
      // still needs sold and deceased calves to label and filter their existing
      // records. Narrowing to what may be *vaccinated* is the caller's job.
      const calves = await db
        .collection("calves")
        .find({ farmerId })
        .project({ name: 1, breed: 1, gender: 1, birthDate: 1, motherName: 1, status: 1 })
        .sort({ name: 1 })
        .toArray()

      payload.push(
        ...calves.map((c) => ({
          kind: "calf" as const,
          _id: c._id.toString(),
          name: c.name || "",
          type: "Calf",
          breed: c.breed || "",
          gender: c.gender || null,
          // Calves carry neither of these - the record forms show "not applicable"
          // rather than an empty state that reads like missing data.
          earTagId: null,
          insuranceId: null,
          status: c.status || "active",
          lactationStatus: null,
          birthDate: c.birthDate || null,
          motherName: c.motherName || null,
        }))
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error fetching farm animals:", error)
    return NextResponse.json({ error: "Failed to fetch animals" }, { status: 500 })
  }
}
