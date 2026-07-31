"use server"

import clientPromise from "@/lib/db"
import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"

const DB = "ntdm_animal_hospital"
const COLLECTION = "announcements"

async function requireStaff() {
  const user = await getCurrentUser()
  if (!user || !["admin", "superadmin"].includes(user.role)) {
    throw new Error("Unauthorized")
  }
  return user
}

export interface AnnouncementInput {
  title: string
  content: string
  type: "general" | "maintenance" | "feature" | "security"
  priority: "low" | "normal" | "high" | "critical"
  active: boolean
  targetType: "all" | "role" | "user"
  // "admin" targeting is a superadmin-only capability; see assertTargetAllowed.
  targetRole?: "farmer" | "doctor" | "admin" | ""
  targetUserId?: string
  targetUserName?: string
  // Only honored for superadmin-created announcements; see createAnnouncement.
  sendEmail?: boolean
}

export interface TargetableUser {
  id: string
  name: string
  email: string
  role: string
}

function serializeAnnouncement(a: any) {
  return {
    id: a._id.toString(),
    title: a.title,
    content: a.content,
    type: a.type || "general",
    priority: a.priority || "normal",
    active: a.active ?? false,
    targetType: a.targetType || "all",
    targetRole: a.targetRole || null,
    targetUserId: a.targetUserId || null,
    targetUserName: a.targetUserName || null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}

export async function getAdminAnnouncements() {
  try {
    await requireStaff()
    const client = await clientPromise
    const db = client.db(DB)
    const announcements = await db.collection(COLLECTION).find({}).sort({ createdAt: -1 }).toArray()
    return announcements.map(serializeAnnouncement)
  } catch (error) {
    console.error("Error fetching admin announcements:", error)
    return []
  }
}

// Farmers and vets (doctors) that any staff member can target individually.
// Superadmins can additionally target admins - regular admins never see other
// admins in this list, so they can't message (or even see) admin accounts.
export async function getTargetableUsers(): Promise<TargetableUser[]> {
  try {
    const user = await requireStaff()
    const client = await clientPromise
    const db = client.db(DB)
    const roles = user.role === "superadmin" ? ["farmer", "doctor", "admin"] : ["farmer", "doctor"]
    const users = await db.collection("users")
      .find({ role: { $in: roles } }, { projection: { name: 1, email: 1, role: 1 } })
      .sort({ name: 1 })
      .toArray()
    return users.map((u) => ({
      id: u._id.toString(),
      name: u.name as string,
      email: u.email as string,
      role: u.role as string,
    }))
  } catch (error) {
    console.error("Error fetching targetable users:", error)
    return []
  }
}

// Only a superadmin may target admins, whether by role or by individual user -
// this is enforced here (not just hidden in the UI) so a crafted request from
// a regular admin session can't reach admin accounts.
async function assertTargetAllowed(user: { role: string }, data: AnnouncementInput, db: any) {
  if (user.role === "superadmin") return
  if (data.targetType === "role" && data.targetRole === "admin") {
    throw new Error("Only superadmins can target admins")
  }
  if (data.targetType === "user" && data.targetUserId && ObjectId.isValid(data.targetUserId)) {
    const target = await db.collection("users").findOne({ _id: new ObjectId(data.targetUserId) }, { projection: { role: 1 } })
    if (target && !["farmer", "doctor"].includes(target.role)) {
      throw new Error("Admins can only target farmers or veterinarians")
    }
  }
}

// Resolves who should receive the announcement email, honoring the same
// audience the announcement itself is targeted at (rather than blasting
// every user regardless of who the announcement is actually meant for).
async function resolveEmailRecipients(db: any, target: { targetType: string; targetRole?: string | null; targetUserId?: string | null }) {
  const query: any = { status: { $ne: "suspended" }, email: { $exists: true, $ne: "" } }
  if (target.targetType === "role" && target.targetRole) {
    query.role = target.targetRole
  } else if (target.targetType === "user" && target.targetUserId && ObjectId.isValid(target.targetUserId)) {
    query._id = new ObjectId(target.targetUserId)
  } else {
    // "Everyone" means every farmer and vet - never admins/superadmins. To
    // reach admins, a superadmin must explicitly target the "admin" role or
    // an individual admin.
    query.role = { $in: ["farmer", "doctor"] }
  }
  return db.collection("users").find(query).toArray()
}

async function sendAnnouncementEmails(announcement: { title: string; content: string; type: string; priority: string; active: boolean }, recipients: any[]) {
  if (!recipients.length) {
    console.log("No users found to send announcement emails to")
    return
  }
  const { sendAnnouncementEmail } = await import("../email.js")
  const batchSize = 5
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)
    await Promise.allSettled(
      batch.map(async (user) => {
        try {
          const result = await sendAnnouncementEmail(user.email, user.name, announcement)
          if (result.success) successCount++
          else failCount++
        } catch (error) {
          failCount++
          console.error(`Error sending announcement email to ${user.email}:`, error)
        }
      })
    )
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  console.log(`Announcement email summary: ${successCount} sent, ${failCount} failed out of ${recipients.length} total`)
}

function buildTargetFields(data: AnnouncementInput) {
  if (data.targetType === "role") {
    return { targetType: "role", targetRole: data.targetRole || null, targetUserId: null, targetUserName: null }
  }
  if (data.targetType === "user") {
    return { targetType: "user", targetRole: data.targetRole || null, targetUserId: data.targetUserId || null, targetUserName: data.targetUserName || null }
  }
  return { targetType: "all", targetRole: null, targetUserId: null, targetUserName: null }
}

export async function createAnnouncement(data: AnnouncementInput) {
  try {
    const user = await requireStaff()
    const client = await clientPromise
    const db = client.db(DB)
    await assertTargetAllowed(user, data, db)

    const targetFields = buildTargetFields(data)
    const doc = {
      title: data.title,
      content: data.content,
      type: data.type,
      priority: data.priority,
      active: data.active,
      ...targetFields,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection(COLLECTION).insertOne(doc)

    // Email blasts are a superadmin-only capability; silently ignore the flag
    // for plain admins even if a crafted request sets it.
    if (data.sendEmail && user.role === "superadmin") {
      try {
        const recipients = await resolveEmailRecipients(db, targetFields)
        console.log(`Found ${recipients.length} users to send announcement emails to`)
        await sendAnnouncementEmails(doc, recipients)
      } catch (emailError) {
        console.error("Error in email sending process:", emailError)
        // Don't fail the announcement creation if email fails
      }
    }

    revalidatePath("/admin/content")
    revalidatePath("/superadmin/content")
    await logActivity(user._id, "admin.announcement.created", data.title)
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error("Error creating announcement:", error)
    return { success: false, message: "Failed to create announcement" }
  }
}

export async function updateAnnouncement(id: string, data: AnnouncementInput) {
  try {
    const user = await requireStaff()
    if (!ObjectId.isValid(id)) return { success: false, message: "Invalid announcement" }
    const client = await clientPromise
    const db = client.db(DB)
    await assertTargetAllowed(user, data, db)

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title: data.title,
          content: data.content,
          type: data.type,
          priority: data.priority,
          active: data.active,
          ...buildTargetFields(data),
          updatedAt: new Date(),
        },
      }
    )

    revalidatePath("/admin/content")
    revalidatePath("/superadmin/content")
    await logActivity(user._id, "admin.announcement.updated", data.title)
    return { success: true }
  } catch (error) {
    console.error("Error updating announcement:", error)
    return { success: false, message: "Failed to update announcement" }
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    const user = await requireStaff()
    if (!ObjectId.isValid(id)) return { success: false, message: "Invalid announcement" }
    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) }, { projection: { title: 1 } })
    await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) })

    revalidatePath("/admin/content")
    revalidatePath("/superadmin/content")
    await logActivity(user._id, "admin.announcement.deleted", existing?.title || id)
    return { success: true }
  } catch (error) {
    console.error("Error deleting announcement:", error)
    return { success: false, message: "Failed to delete announcement" }
  }
}
