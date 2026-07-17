export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/actions/auth"
import clientPromise from "@/lib/db"
import { sendTemperatureAlertEmail } from "@/lib/email"

const FEVER_THRESHOLD_CELSIUS = 40
const ALERT_COOLDOWN_MS = 30 * 60 * 1000 // Avoid re-emailing every 30s poll while the fever persists

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

    // Check the latest reading for a fever and email the farmer if it crosses the threshold.
    try {
      const feeds = Array.isArray(data?.feeds) ? data.feeds : []
      const latestFeed = [...feeds].reverse().find((feed: any) => feed.field4 != null)
      const latestTemperature = latestFeed ? Number.parseFloat(latestFeed.field4) : NaN

      if (!Number.isNaN(latestTemperature) && user.email) {
        const lastAlertedAt = config.lastTempAlertAt ? new Date(config.lastTempAlertAt).getTime() : 0

        if (latestTemperature >= FEVER_THRESHOLD_CELSIUS) {
          if (Date.now() - lastAlertedAt > ALERT_COOLDOWN_MS) {
            await sendTemperatureAlertEmail(user.email, user.name, latestTemperature, latestFeed.created_at)
            await db.collection("trackingConfigs").updateOne(
              { userId: user._id, role: user.role },
              { $set: { lastTempAlertAt: new Date() } }
            )
          }
        } else if (config.lastTempAlertAt) {
          // Temperature is back to normal; clear the cooldown so the next fever alerts immediately.
          await db.collection("trackingConfigs").updateOne(
            { userId: user._id, role: user.role },
            { $unset: { lastTempAlertAt: "" } }
          )
        }
      }
    } catch (alertError) {
      console.error("Error processing temperature alert:", alertError)
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error("ThingSpeak API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}