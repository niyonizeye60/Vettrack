export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getCurrentUser } from "@/lib/auth"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { deleteStorageFile } from "@/lib/storage-cleanup"

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: "Only JPG, PNG, GIF or WebP images are allowed" }, { status: 400 })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "File must be under 2 MB" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Delete the previous avatar file before saving the new one
    const existing = await db.collection("users").findOne(
      { _id: new ObjectId(currentUser._id) },
      { projection: { image: 1 } }
    )
    await deleteStorageFile(existing?.image)

    const ext = file.name.split(".").pop() ?? "jpg"
    const filename = `avatar-${currentUser._id}-${Date.now()}.${ext}`
    const uploadDir = join(process.cwd(), "public", "avatars")

    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))

    const image = `/avatars/${filename}`

    await db.collection("users").updateOne(
      { _id: new ObjectId(currentUser._id) },
      { $set: { image, updatedAt: new Date() } }
    )

    return NextResponse.json({ success: true, image })
  } catch (error) {
    console.error("Avatar upload error:", error)
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 })
  }
}
