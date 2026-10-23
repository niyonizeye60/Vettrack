export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { parsePushSubscription, removePushSubscription, savePushSubscription } from "@/lib/push"

/**
 * Turn alerts on for this device (claim: true), or refresh one that's already on - each
 * page load does that, so the subscription follows the user's current session and
 * language. See lib/push.ts.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const sessionId = cookies().get("session")?.value
    if (!user || !sessionId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const subscription = parsePushSubscription(body?.subscription)
    if (!subscription) {
      return NextResponse.json({ success: false, message: "Invalid subscription" }, { status: 400 })
    }

    const linked = await savePushSubscription({
      subscription,
      userId: user._id,
      sessionId,
      language: body?.language === "rw" ? "rw" : "en",
      userAgent: request.headers.get("user-agent") ?? undefined,
      claim: body?.claim === true,
    })
    return NextResponse.json({ success: true, linked })
  } catch (error) {
    console.error("Error saving push subscription:", error)
    return NextResponse.json({ success: false, message: "Failed to save subscription" }, { status: 500 })
  }
}

/** Turn alerts off for this device. */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (typeof body?.endpoint !== "string") {
      return NextResponse.json({ success: false, message: "Invalid endpoint" }, { status: 400 })
    }

    await removePushSubscription(body.endpoint, user._id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing push subscription:", error)
    return NextResponse.json({ success: false, message: "Failed to remove subscription" }, { status: 500 })
  }
}
