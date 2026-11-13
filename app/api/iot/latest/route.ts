export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { READINGS, authenticateDevice, getTrackingDb, type ReadingDoc } from "@/lib/tracking/store"

// For whoever is setting up a collar: "did my readings arrive?" without logging in.
// The replacement for latest.php. Unlike latest.php the key goes in a header, not
// the URL - URLs end up in server and proxy logs:
//   curl -H "X-Api-Key: <key>" "https://www.vettrack.rw/api/iot/latest?device_id=COW-001&limit=10"
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get("device_id")
  const apiKey = request.headers.get("x-api-key")
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "10", 10) || 10))

  if (!deviceId || !apiKey) {
    return NextResponse.json({ error: "Missing device_id or X-Api-Key header" }, { status: 400 })
  }

  try {
    const device = await authenticateDevice(deviceId, apiKey)
    if (!device) return NextResponse.json({ error: "Invalid device_id or api_key" }, { status: 401 })

    const db = await getTrackingDb()
    const rows = await db
      .collection<ReadingDoc>(READINGS)
      .find({ deviceRef: device._id }, { projection: { _id: 0, deviceRef: 0, farmerId: 0, extra: 0 } })
      .sort({ receivedAt: -1 })
      .limit(limit)
      .toArray()

    const readings = rows.map((r) => ({
      received_at: r.receivedAt.toISOString(),
      temp_object: r.tempObject,
      temp_ambient: r.tempAmbient,
      accel_x: r.accelX,
      accel_y: r.accelY,
      accel_z: r.accelZ,
      latitude: r.latitude,
      longitude: r.longitude,
      battery_voltage: r.batteryVoltage,
      charging: r.charging === null ? null : Number(r.charging),
      gps: r.gps,
    }))
    return NextResponse.json({ device_id: device.deviceId, count: readings.length, readings })
  } catch (error) {
    console.error("IoT latest error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
