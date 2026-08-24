export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Photo upload for listing requests.
 *
 * Listing images elsewhere in the app are pasted URLs typed by staff; a farmer
 * submitting from a phone needs a real upload, so this follows the same Blob-in-
 * production / local-file-in-development split as the avatar route.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    const allowed =
      can(currentUser.role, "marketplace.listings.request") ||
      can(currentUser.role, "marketplace.listings.manage")
    if (!allowed) {
      return NextResponse.json({ success: false, message: "Not allowed" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Only JPG, PNG or WebP images are allowed" },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, message: "Each photo must be under 5 MB" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
    const filename = `listing-${currentUser._id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    let url: string

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob")
      const blob = await put(`listings/${filename}`, file, { access: "public" })
      url = blob.url
    } else {
      const { writeFile, mkdir } = await import("fs/promises")
      const { join } = await import("path")
      const dir = join(process.cwd(), "public", "listings")
      await mkdir(dir, { recursive: true })
      const bytes = await file.arrayBuffer()
      await writeFile(join(dir, filename), Buffer.from(bytes))
      url = `/listings/${filename}`
    }

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error("Listing photo upload error:", error)
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 })
  }
}
