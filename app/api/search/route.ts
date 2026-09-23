export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { resolveLocation } from "@/lib/rwanda-geo"

const DB_NAME = "ntdm_animal_hospital"

function getServiceCoords(svc: any): { lat: number; lng: number } | null {
  // Stored coordinates win, then district+sector (GADM-derived, aliases
  // included), then the district center, then Kigali as a last resort.
  if (svc.latitude && svc.longitude) return { lat: svc.latitude, lng: svc.longitude }
  if (svc.district || svc.sector) return resolveLocation(svc.district, svc.sector)
  return null
}

/**
 * Public search: marketplace listings (animal sales / pharmacy / feeds /
 * services) and their categories only.
 *
 * Everything here is already visible to anonymous visitors on the public
 * pages. Private records — farmers' animals, user accounts — are deliberately
 * NOT searched, and seller contact details are never included in the payload,
 * so nothing leaks through this endpoint that isn't public anyway. Sold and
 * withdrawn listings stay hidden using the same availability rule as ordering
 * (see availableListingFilter in lib/db-orders.ts).
 */
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

    // 1. Public listings — same availability rule as ordering: active, never
    //    statused (legacy rows), or an expired reservation. Sold, withdrawn
    //    and marketplace-hidden listings never appear in search.
    const now = new Date()
    const serviceFilter: Record<string, any> = {
      $and: [
        { hidden: { $ne: true } },
        {
          $or: [
            { listingStatus: "active" },
            { listingStatus: { $exists: false } },
            { listingStatus: null },
            { listingStatus: "reserved", reservedUntil: { $lt: now } },
          ],
        },
      ],
    }
    if (searchRegex) {
      serviceFilter.$and.push({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
        ],
      })
    }
    const services = await db.collection("services").find(serviceFilter).limit(20).toArray()

    for (const svc of services) {
      let distance: number | undefined
      const coords = getServiceCoords(svc)
      if (lat && lng && coords) {
        distance = calcDistance(lat, lng, coords.lat, coords.lng)
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
        type:
          category === "sales"
            ? "Animal"
            : category === "drugs"
              ? "Drug"
              : category === "feeds"
                ? "Feed"
                : "Service",
        id: svc._id.toString(),
        name: svc.name,
        description: svc.description || "",
        price: svc.price,
        category,
        image: svc.image || "",
        distance: distance !== undefined ? Math.round(distance * 10) / 10 : undefined,
        latitude: svc.latitude,
        longitude: svc.longitude,
        href,
      })
    }

    // 2. Categories — the marketplace's public taxonomy, linking to its
    //    listing pages. No private data involved.
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
