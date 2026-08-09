export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { listEpidemicDiseases, ensureEpidemicDisease, deleteEpidemicDisease } from "@/lib/epidemic-diseases"

// Only admins (and superadmins) may create/delete disease categories.
function canManage(role?: string) {
  return role === "admin" || role === "superadmin"
}

// GET — category list used by the disease dropdown in the reporting dialog.
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const categories = await listEpidemicDiseases()
    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Error fetching disease categories:", error)
    return NextResponse.json({ categories: [] })
  }
}

// POST — create a new category (admin only). Idempotent by name.
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!canManage(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const name = (body?.name || "").trim()
    if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 })

    const id = await ensureEpidemicDisease(name)
    if (!id) return NextResponse.json({ error: "Failed to save category" }, { status: 500 })

    await logActivity(currentUser._id, "epidemic.category_created", name)
    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("Error creating disease category:", error)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}

// DELETE — remove a category (admin only).
export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!canManage(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Category ID required" }, { status: 400 })

    const deleted = await deleteEpidemicDisease(id)
    if (!deleted) return NextResponse.json({ error: "Category not found" }, { status: 404 })
    await logActivity(currentUser._id, "epidemic.category_deleted", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting disease category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
