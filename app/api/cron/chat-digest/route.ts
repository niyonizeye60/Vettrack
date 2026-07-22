export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { sendMissedMessageDigests } from "@/lib/actions/chat-digest"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sendMissedMessageDigests()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error running chat digest cron:", error)
    return NextResponse.json({ error: "Failed to run chat digest" }, { status: 500 })
  }
}
