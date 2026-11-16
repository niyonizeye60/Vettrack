export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { hrProcessPayload } from "@/lib/tracking/heart-rate"
import {
  BURSTS,
  DEVICES,
  authenticateDevices,
  ensureTrackingIndexes,
  getTrackingDb,
  type BurstDoc,
} from "@/lib/tracking/store"

// A short accelerometer burst (acceleration magnitude, ~8-10 s) - the replacement
// for the IoT backend's receive_burst.php, same JSON, same checks and same answer.
// Normally reached through the MQTT bridge (topic cattletag/<device>/burst), which
// adds the api_key:
// {
//   "device_id": "COW-001", "api_key": "...",
//   "sample_rate_hz": 20,            // 5-200
//   "scale_per_g": 10000,            // counts per 1 g (here 0.1 mg per count)
//   "samples": [10012, 9990, ...]    // acceleration magnitude, at least 5 s, at most 3000
// }
//
// The heart rate is estimated on arrival (lib/tracking/heart-rate.ts, the port of
// hr_process.php). The raw samples are stored too: the behaviour estimates on the
// tracking page are computed from them, and they let real cow data be studied later.
// When test accounts have the collar too, each registration gets its own copy.

export async function POST(request: NextRequest) {
  let data: Record<string, unknown>
  try {
    data = await request.json()
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 })
  }
  if (!data || typeof data !== "object" || Array.isArray(data) || !data.device_id || !data.api_key) {
    return NextResponse.json({ error: "Missing device_id or api_key" }, { status: 400 })
  }

  try {
    const devices = await authenticateDevices(data.device_id, data.api_key)
    if (devices.length === 0) return NextResponse.json({ error: "Invalid device_id or api_key" }, { status: 401 })

    const res = hrProcessPayload(data)
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 })
    const a = res.analysis

    await ensureTrackingIndexes()
    const doc: Omit<BurstDoc, "deviceRef" | "farmerId"> = {
      receivedAt: new Date(),
      sampleRateHz: res.fs,
      scalePerG: res.scale,
      durationSeconds: a.durationS,
      samples: res.samples,
      sampleCount: res.n,
      motionMg: a.motionMg,
      bpm: a.bpm,
      bpmPeaks: a.bpmPeaks,
      confidence: a.confidence,
      method: a.method,
      notes: a.notes,
      noteCode: a.note,
      analysed: true,
    }

    const db = await getTrackingDb()
    await db
      .collection<BurstDoc>(BURSTS)
      .insertMany(devices.map((d) => ({ ...doc, deviceRef: d._id, farmerId: d.farmerId })))
    await db
      .collection(DEVICES)
      .updateMany({ _id: { $in: devices.map((d) => d._id) } }, { $set: { lastSeenAt: doc.receivedAt } })

    return NextResponse.json(
      {
        status: "ok",
        bpm: doc.bpm,
        confidence: doc.confidence,
        method: doc.method,
        motion_mg: doc.motionMg,
        notes: doc.notes,
        samples: doc.sampleCount,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("IoT burst error:", error)
    return NextResponse.json({ error: "Failed to save burst" }, { status: 500 })
  }
}
