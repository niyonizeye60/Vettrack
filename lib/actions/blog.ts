"use server"

import clientPromise from "@/lib/db"
import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"

const DB = "ntdm_animal_hospital"
const COLLECTION = "blogPosts"

async function requireStaff() {
  const user = await getCurrentUser()
  if (!user || !["admin", "superadmin"].includes(user.role)) {
    throw new Error("Unauthorized")
  }
  return user
}

export interface BlogPostInput {
  title: string
  excerpt: string
  content: string
  image: string
  category: string
  author: string
  status: "draft" | "published"
}

function serializeBlogPost(post: any) {
  return {
    id: post._id.toString(),
    title: post.title as string,
    excerpt: (post.excerpt as string) || "",
    content: (post.content as string) || "",
    image: (post.image as string) || "",
    category: (post.category as string) || "General",
    author: (post.author as string) || "Admin",
    status: (post.status as "draft" | "published") || "draft",
    views: (post.views as number) || 0,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }
}

export async function getAdminBlogPosts() {
  try {
    await requireStaff()
    const client = await clientPromise
    const db = client.db(DB)
    const posts = await db.collection(COLLECTION).find({}).sort({ createdAt: -1 }).toArray()
    return posts.map(serializeBlogPost)
  } catch (error) {
    console.error("Error fetching admin blog posts:", error)
    return []
  }
}

export async function getPublishedBlogPosts() {
  try {
    const client = await clientPromise
    const db = client.db(DB)
    const posts = await db.collection(COLLECTION)
      .find({ status: "published" })
      .sort({ createdAt: -1 })
      .toArray()
    return posts.map(serializeBlogPost)
  } catch (error) {
    console.error("Error fetching published blog posts:", error)
    return []
  }
}

export async function getBlogPostById(id: string) {
  if (!ObjectId.isValid(id)) return null
  try {
    const client = await clientPromise
    const db = client.db(DB)
    const post = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) })
    if (!post) return null
    return serializeBlogPost(post)
  } catch (error) {
    console.error("Error fetching blog post:", error)
    return null
  }
}

// Counts at most one view per browser per post. Called from a client component on
// mount (not during the page's server render) because Server Actions can set cookies
// while a plain Server Component render cannot.
export async function recordBlogView(id: string) {
  if (!ObjectId.isValid(id)) return
  try {
    const cookieStore = cookies()
    const cookieName = `blog_viewed_${id}`
    if (cookieStore.get(cookieName)) return

    const client = await clientPromise
    const db = client.db(DB)
    await db.collection(COLLECTION).updateOne({ _id: new ObjectId(id) }, { $inc: { views: 1 } })

    cookieStore.set(cookieName, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })
  } catch (error) {
    console.error("Error recording blog post view:", error)
  }
}

export async function createBlogPost(data: BlogPostInput) {
  try {
    const actor = await requireStaff()
    const client = await clientPromise
    const db = client.db(DB)

    const doc = {
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      image: data.image,
      category: data.category || "General",
      author: data.author || actor.name || "Admin",
      status: data.status,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection(COLLECTION).insertOne(doc)

    revalidatePath("/admin/content")
    revalidatePath("/blog")
    await logActivity(actor._id, "admin.blogPost.created", data.title)
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error("Error creating blog post:", error)
    return { success: false, message: "Failed to create blog post" }
  }
}

export async function updateBlogPost(id: string, data: BlogPostInput) {
  try {
    const actor = await requireStaff()
    const client = await clientPromise
    const db = client.db(DB)

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title: data.title,
          excerpt: data.excerpt,
          content: data.content,
          image: data.image,
          category: data.category || "General",
          author: data.author || actor.name || "Admin",
          status: data.status,
          updatedAt: new Date(),
        },
      }
    )

    revalidatePath("/admin/content")
    revalidatePath("/blog")
    revalidatePath(`/blog/${id}`)
    await logActivity(actor._id, "admin.blogPost.updated", data.title)
    return { success: true }
  } catch (error) {
    console.error("Error updating blog post:", error)
    return { success: false, message: "Failed to update blog post" }
  }
}

export async function deleteBlogPost(id: string) {
  try {
    const actor = await requireStaff()
    const client = await clientPromise
    const db = client.db(DB)

    const post = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) }, { projection: { title: 1 } })
    await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) })

    revalidatePath("/admin/content")
    revalidatePath("/blog")
    await logActivity(actor._id, "admin.blogPost.deleted", post?.title || id)
    return { success: true }
  } catch (error) {
    console.error("Error deleting blog post:", error)
    return { success: false, message: "Failed to delete blog post" }
  }
}
