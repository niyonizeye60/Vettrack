import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/actions/auth"

export const dynamic = "force-dynamic";

// POST: Save config
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { channelId, apiKey, role } = await req.json()
  if (!channelId || !apiKey || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const client = await clientPromise
  const db = client.db("ntdm_animal_hospital")
  await db.collection("trackingConfigs").updateOne(
    { userId: user._id, role },
    { $set: { channelId, apiKey } },
    { upsert: true }
  )
  return NextResponse.json({ success: true })
}

// GET: Fetch config
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const role = searchParams.get("role")
  if (!role) return NextResponse.json({ error: "Missing role" }, { status: 400 })

  const client = await clientPromise
  const db = client.db("ntdm_animal_hospital")
  const config = await db.collection("trackingConfigs").findOne({ userId: user._id, role })
  return NextResponse.json({ config })
}