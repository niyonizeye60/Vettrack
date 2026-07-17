export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { deleteStorageFile } from "@/lib/storage-cleanup"

// system_settings uses a plain string _id ("global"), not an ObjectId.
interface SystemSettingsBannerDoc {
  _id: string
  bannerImage?: string | null
  updatedAt?: Date
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const settings = await db.collection<SystemSettingsBannerDoc>("system_settings").findOne({ _id: "global" }, { projection: { bannerImage: 1 } })
    return NextResponse.json({ bannerImage: settings?.bannerImage ?? null })
  } catch (error) {
    console.error("Error fetching system banner:", error)
    return NextResponse.json({ bannerImage: null })
  }
}

export async function DELETE() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "superadmin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const existing = await db.collection<SystemSettingsBannerDoc>("system_settings").findOne({ _id: "global" }, { projection: { bannerImage: 1 } })
    await deleteStorageFile(existing?.bannerImage)

    await db.collection<SystemSettingsBannerDoc>("system_settings").updateOne(
      { _id: "global" },
      { $set: { bannerImage: null, updatedAt: new Date() } },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing banner:", error)
    return NextResponse.json({ success: false, message: "Failed to remove banner" }, { status: 500 })
  }
}
