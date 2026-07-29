export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"

const DB_NAME = "ntdm_animal_hospital"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()
    const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : null
    const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : null
    const maxDistance = searchParams.get("maxDistance") ? Number(searchParams.get("maxDistance")) : 500 // km

    if (!q && !lat && !lng) {
      return NextResponse.json({ results: [] })
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)

    const results: Array<{
      type: string
      id: string
      name: string
      description: string
      price?: number
      category?: string
      image?: string
      distance?: number
      latitude?: number
      longitude?: number
      href: string
    }> = []

    // Build search regex
    const searchRegex = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null

    // 1. Search Services
    const serviceFilter: Record<string, any> = {}
    if (searchRegex) {
      serviceFilter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
      ]
    }
    const services = await db.collection("services").find(serviceFilter).limit(20).toArray()

    for (const svc of services) {
      let distance: number | undefined
      if (lat && lng && svc.latitude && svc.longitude) {
        distance = calcDistance(lat, lng, svc.latitude, svc.longitude)
        if (distance > maxDistance) continue
      }

      const category = svc.category
      // Map category to the correct single-product detail page with Add to Cart
      let href: string
      if (category === "sales") {
        href = `/animal-sales/${svc._id}`
      } else if (category === "drugs") {
        href = `/pharmacy/${svc._id}`
      } else if (category === "feeds") {
        href = `/feeds/${svc._id}`
      } else {
        href = `/services?category=${category}&id=${svc._id}`
      }

      results.push({
        type: category === "sales" ? "Animal" : category === "drugs" ? "Drug" : "Feed",
        id: svc._id.toString(),
        name: svc.name,
        description: svc.description || "",
        price: svc.price,
        category,
        image: svc.image || "",
        distance: distance ? Math.round(distance * 10) / 10 : undefined,
        latitude: svc.latitude,
        longitude: svc.longitude,
        href,
      })
    }

    // 2. Search Categories
    if (searchRegex) {
      const categories = await db
        .collection("categories")
        .find({
          $or: [{ name: searchRegex }, { description: searchRegex }],
        })
        .limit(10)
        .toArray()

      for (const cat of categories) {
        // Map categories to their listing pages
        let href: string
        if (cat.type === "sales") {
          href = `/animal-sales?category=${cat._id}`
        } else if (cat.type === "drugs") {
          href = `/pharmacy?category=${cat._id}`
        } else if (cat.type === "feeds") {
          href = `/feeds?category=${cat._id}`
        } else {
          href = `/services?category=${cat.type}`
        }

        results.push({
          type: "Category",
          id: cat._id.toString(),
          name: cat.name,
          description: cat.description || "",
          category: cat.type,
          href,
        })
      }
    }

    // 3. Search Animals (farmer's animals)
    if (searchRegex) {
      const animals = await db
        .collection("animals")
        .find({
          $or: [
            { name: searchRegex },
            { type: searchRegex },
            { breed: searchRegex },
            { tagNumber: searchRegex },
          ],
        })
        .limit(10)
        .toArray()

      for (const animal of animals) {
        results.push({
          type: "Animal Record",
          id: animal._id.toString(),
          name: animal.name,
          description: `${animal.type} · ${animal.breed || ""} · ${animal.tagNumber || ""}`,
          image: "",
          href: "/farmer/animals",
        })
      }
    }

    // 4. Search Users (farmers, doctors)
    if (searchRegex) {
      const users = await db
        .collection("users")
        .find({
          $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }],
          role: { $in: ["farmer", "doctor"] },
        })
        .limit(10)
        .toArray()

      for (const user of users) {
        results.push({
          type: user.role === "doctor" ? "Veterinarian" : "Farmer",
          id: user._id.toString(),
          name: user.name,
          description: `${user.email} · ${user.phone || ""}`,
          image: "",
          href: user.role === "doctor" ? "/veterinary" : "/farmer",
        })
      }
    }

    // Sort: exact name matches first, then by distance if available
    results.sort((a, b) => {
      if (searchRegex && a.name.toLowerCase().startsWith(q!.toLowerCase()) && !b.name.toLowerCase().startsWith(q!.toLowerCase())) return -1
      if (searchRegex && !a.name.toLowerCase().startsWith(q!.toLowerCase()) && b.name.toLowerCase().startsWith(q!.toLowerCase())) return 1
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance
      }
      return 0
    })

    return NextResponse.json({ results, total: results.length })
  } catch (error) {
    console.error("Global search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}

/** Haversine distance in km between two lat/lng points */
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
