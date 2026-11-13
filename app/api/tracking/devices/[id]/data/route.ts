export const dynamicParams = true;
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { MAX_READINGS, loadDeviceDashboard } from "@/lib/tracking/dashboard"
import { findActiveDevice, resolveTrackingAccess } from "@/lib/tracking/store"

// GET: everything the tracking page shows for one collar - recent readings, pulse
// bursts, the latest burst's waveform and the behaviour estimates. Readable by the
// farm owner, staff, and vets with a consultation with the farmer.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const device = await findActiveDevice(params.id)
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 })

    const access = await resolveTrackingAccess(user, device.farmerId)
    if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status })

    const requested = Number.parseInt(new URL(req.url).searchParams.get("limit") || "50", 10)
    const limit = Math.min(MAX_READINGS, Math.max(1, Number.isFinite(requested) ? requested : 50))

    return NextResponse.json(await loadDeviceDashboard(device, limit))
  } catch (error) {
    console.error("Tracking data GET error:", error)
    return NextResponse.json({ error: "Failed to load tracking data" }, { status: 500 })
  }
}
