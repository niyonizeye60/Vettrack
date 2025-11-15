export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/actions/auth"
import clientPromise from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')
    const results = searchParams.get('results')

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID is required" }, { status: 400 })
    }

    // Get user's stored API key from database
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const config = await db.collection("trackingConfigs").findOne({ 
      userId: user._id, 
      role: user.role 
    })
    
    if (!config?.apiKey) {
      return NextResponse.json({ error: "API key not configured. Please set your ThingSpeak API key in the configuration panel." }, { status: 400 })
    }

    const response = await fetch(
      `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${config.apiKey}&results=${results || 20}`
    )

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch data from ThingSpeak" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error("ThingSpeak API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}