export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const user = await getCurrentUser()

    // "Everyone" (and legacy announcements without a targetType) means every
    // farmer and vet - never staff, so admins/superadmins don't see it in
    // their own dashboard banner. Role- and user-targeted announcements only
    // show up for the matching viewer, which does let a staff-targeted
    // announcement reach an admin/superadmin.
    const isStaffViewer = !!user && ["admin", "superadmin"].includes(user.role)
    const audienceFilters: any[] = []
    if (!isStaffViewer) {
      audienceFilters.push({ targetType: { $exists: false } }, { targetType: "all" })
    }
    if (user) {
      audienceFilters.push({ targetType: "role", targetRole: user.role })
      audienceFilters.push({ targetType: "user", targetUserId: user._id })
    }

    const announcements = await db.collection("announcements")
      .find({ active: true, $or: audienceFilters })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()

    const formattedAnnouncements = announcements.map(a => ({
      _id: a._id.toString(),
      title: a.title,
      content: a.content,
      type: a.type,
      priority: a.priority,
      createdAt: a.createdAt
    }))

    return NextResponse.json({ success: true, announcements: formattedAnnouncements })
  } catch (error) {
    console.error("Error fetching announcements:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch announcements" })
  }
}