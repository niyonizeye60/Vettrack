export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

// Lets a vet read a patient's (farmer's) live tracking feed. Access is gated on
// an existing consultation between the two, and the farmer's ThingSpeak API key
// stays server-side - it is used to fetch but never returned to the vet client.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const farmerId = searchParams.get("farmerId")
    const results = searchParams.get("results") || "20"

    if (!farmerId || !ObjectId.isValid(farmerId)) {
      return NextResponse.json({ error: "Valid farmerId is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Authorize: the vet must have at least one consultation with this farmer.
    const vetId = currentUser._id
    const link = await db.collection("consultations").findOne({
      farmerId,
      $or: [
        { doctor: vetId },
        ...(ObjectId.isValid(vetId) ? [{ doctor: new ObjectId(vetId) }] : []),
      ],
    })
    if (!link) {
      return NextResponse.json({ error: "You have no consultation with this patient" }, { status: 403 })
    }

    // Look up the farmer's own tracking channel + key.
    const config = await db.collection("trackingConfigs").findOne({
      userId: new ObjectId(farmerId),
      role: "farmer",
    })

    if (!config?.channelId || !config?.apiKey) {
      return NextResponse.json(
        { configured: false, error: "This patient has not set up animal tracking yet." },
        { status: 200 }
      )
    }

    const response = await fetch(
      `https://api.thingspeak.com/channels/${config.channelId}/feeds.json?api_key=${config.apiKey}&results=${results}`
    )

    if (!response.ok) {
      return NextResponse.json(
        { configured: true, error: "Failed to fetch data from ThingSpeak" },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error("Patient tracking API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
