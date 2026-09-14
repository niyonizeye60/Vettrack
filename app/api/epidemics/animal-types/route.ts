export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { listEpidemicAnimalTypes, ensureEpidemicAnimalType, deleteEpidemicAnimalType } from "@/lib/epidemic-animal-types"

// Only admins (and superadmins) may delete animal types. Any logged-in user
// may add one — farmers type new animal types on their own (e.g. a local breed)
// and they should become selectable options for everyone.
function canManage(role?: string) {
  return role === "admin" || role === "superadmin"
}

// GET — list used by the animal-type combobox in the reporting dialog.
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const types = await listEpidemicAnimalTypes()
    return NextResponse.json({ types })
  } catch (error) {
    console.error("Error fetching animal types:", error)
    return NextResponse.json({ types: [] })
  }
}

// POST — create a new animal type (any logged-in user). Idempotent by name.
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const name = (body?.name || "").trim()
    if (!name) return NextResponse.json({ error: "Animal type name is required" }, { status: 400 })

    const id = await ensureEpidemicAnimalType(name)
    if (!id) return NextResponse.json({ error: "Failed to save animal type" }, { status: 500 })

    await logActivity(currentUser._id, "epidemic.animal_type_created", name)
    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("Error creating animal type:", error)
    return NextResponse.json({ error: "Failed to create animal type" }, { status: 500 })
  }
}

// DELETE — remove an animal type (admin only).
export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!canManage(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Animal type ID required" }, { status: 400 })

    const deleted = await deleteEpidemicAnimalType(id)
    if (!deleted) return NextResponse.json({ error: "Animal type not found" }, { status: 404 })
    await logActivity(currentUser._id, "epidemic.animal_type_deleted", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting animal type:", error)
    return NextResponse.json({ error: "Failed to delete animal type" }, { status: 500 })
  }
}
