export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
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

    // system_settings uses a plain string _id ("global"), not an ObjectId.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalFilter = { _id: "global" as any }

    // Delete the old banner before uploading the new one
    const existing = await db.collection("system_settings").findOne(
      globalFilter,
      { projection: { bannerImage: 1 } }
    )
    await deleteStorageFile(existing?.bannerImage)

    const ext = file.name.split(".").pop() ?? "jpg"
    const filename = `banners/banner-system-${Date.now()}.${ext}`

    const blob = await put(filename, file, { access: "public" })

    await db.collection("system_settings").updateOne(
      globalFilter,
      { $set: { bannerImage: blob.url, updatedAt: new Date() } },
      { upsert: true }
    )

    return NextResponse.json({ success: true, bannerImage: blob.url })
  } catch (error) {
    console.error("Banner upload error:", error)
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 })
  }
}
