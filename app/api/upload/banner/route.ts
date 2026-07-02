export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getCurrentUser } from "@/lib/auth"
import clientPromise from "@/lib/db"
import { deleteStorageFile } from "@/lib/storage-cleanup"

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "superadmin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: "Only JPEG, PNG, WebP and GIF images are allowed" }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "File must be under 5 MB" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Fetch and delete the old banner file before saving the new one
    const existing = await db.collection("system_settings").findOne({ _id: "global" }, { projection: { bannerImage: 1 } })
    await deleteStorageFile(existing?.bannerImage)

    const ext = file.name.split(".").pop() ?? "jpg"
    const filename = `banner-system-${Date.now()}.${ext}`
    const uploadDir = join(process.cwd(), "public", "avatars")

    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))

    const bannerImage = `/avatars/${filename}`

    await db.collection("system_settings").updateOne(
      { _id: "global" },
      { $set: { bannerImage, updatedAt: new Date() } },
      { upsert: true }
    )

    return NextResponse.json({ success: true, bannerImage })
  } catch (error) {
    console.error("Banner upload error:", error)
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 })
  }
}
