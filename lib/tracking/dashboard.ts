// Everything the tracking page shows for one collar, built server-side.
// Mirrors the queries at the top of the IoT backend's dashboard.php.
import { BEHAVIOUR_CONFIG, summarizeBehaviour, DEFAULT_SCALE_PER_G } from "./behaviour"
import {
  BURSTS,
  READINGS,
  cleanPostures,
  getTrackingDb,
  serializeDevices,
  type BurstDoc,
  type ReadingDoc,
  type TrackingDeviceDoc,
} from "./store"
import type { TrackingDashboardData, TrackingPulse, TrackingReading, TrackingWaveform } from "./types"

const DAY_MS = 24 * 60 * 60 * 1000
export const MAX_READINGS = 500

const round = (v: number | null | undefined, digits: number) =>
  v === null || v === undefined ? null : Math.round(v * 10 ** digits) / 10 ** digits

function toReading(r: ReadingDoc): TrackingReading {
  return {
    time: r.receivedAt.toISOString(),
    tempObject: r.tempObject,
    tempAmbient: r.tempAmbient,
    accelX: r.accelX,
    accelY: r.accelY,
    accelZ: r.accelZ,
    latitude: r.latitude,
    longitude: r.longitude,
    batteryVoltage: r.batteryVoltage,
    charging: r.charging,
    gps: r.gps,
  }
}

function toPulse(b: BurstDoc): TrackingPulse {
  return {
    time: b.receivedAt.toISOString(),
    bpm: b.bpm,
    bpmPeaks: b.bpmPeaks,
    confidence: b.confidence,
    method: b.method,
    motionMg: b.motionMg,
    notes: b.notes,
    analysed: b.analysed,
  }
}

export async function loadDeviceDashboard(device: TrackingDeviceDoc, limit: number): Promise<TrackingDashboardData> {
  const db = await getTrackingDb()
  const readingsCol = db.collection<ReadingDoc>(READINGS)
  const burstsCol = db.collection<BurstDoc>(BURSTS)
  const deviceRef = device._id
  const now = Date.now()
  const dayAgo = new Date(now - DAY_MS)
  const eightDaysAgo = new Date(now - 8 * DAY_MS)
  const tz = BEHAVIOUR_CONFIG.timeZone
  const localDay = { $dateToString: { format: "%Y-%m-%d", date: "$receivedAt", timezone: tz } }

  const [readings, pulseRows, waveformBurst, dayBursts, dayReadings, tempBase, motionBase] = await Promise.all([
    readingsCol.find({ deviceRef }).sort({ receivedAt: -1 }).limit(limit).toArray(),
    burstsCol.find({ deviceRef }, { projection: { samples: 0 } }).sort({ receivedAt: -1 }).limit(30).toArray(),
    // waveform of the newest burst that still has its raw samples
    burstsCol.findOne({ deviceRef, sampleCount: { $gte: 20 } }, { sort: { receivedAt: -1 } }),
    burstsCol
      .find(
        { deviceRef, receivedAt: { $gte: dayAgo }, sampleCount: { $gt: 0 } },
        { projection: { receivedAt: 1, sampleRateHz: 1, scalePerG: 1, samples: 1, motionMg: 1 } }
      )
      .sort({ receivedAt: 1 })
      .toArray(),
    readingsCol
      .find(
        { deviceRef, receivedAt: { $gte: dayAgo } },
        { projection: { receivedAt: 1, accelX: 1, accelY: 1, accelZ: 1, tempObject: 1, tempAmbient: 1 } }
      )
      .sort({ receivedAt: 1 })
      .toArray(),
    // this animal's own normal: the 7 days before the last 24 h
    readingsCol
      .aggregate<{ tObj: number | null; tAmb: number | null; days: string[] }>([
        { $match: { deviceRef, receivedAt: { $gte: eightDaysAgo, $lt: dayAgo }, tempObject: { $nin: [null, 0] } } },
        { $group: { _id: null, tObj: { $avg: "$tempObject" }, tAmb: { $avg: "$tempAmbient" }, days: { $addToSet: localDay } } },
      ])
      .next(),
    burstsCol
      .aggregate<{ motion: number | null; days: string[] }>([
        { $match: { deviceRef, receivedAt: { $gte: eightDaysAgo, $lt: dayAgo }, motionMg: { $ne: null } } },
        { $group: { _id: null, motion: { $avg: "$motionMg" }, days: { $addToSet: localDay } } },
      ])
      .next(),
  ])

  const newest = readings[0]
  const ageMin = newest ? Math.floor((now - newest.receivedAt.getTime()) / 60_000) : null
  const dayMotion = dayBursts.map((b) => b.motionMg).filter((v): v is number => typeof v === "number")
  const todayMotion = dayMotion.length ? dayMotion.reduce((a, b) => a + b, 0) / dayMotion.length : null

  const behaviour = summarizeBehaviour(
    dayBursts.map((b) => ({
      receivedAt: b.receivedAt,
      sampleRateHz: b.sampleRateHz,
      scalePerG: b.scalePerG,
      samples: b.samples ?? [],
    })),
    dayReadings.map((r) => ({
      receivedAt: r.receivedAt,
      accelX: r.accelX,
      accelY: r.accelY,
      accelZ: r.accelZ,
      tempObject: r.tempObject,
      tempAmbient: r.tempAmbient,
    })),
    {
      tObj: tempBase?.tObj ?? null,
      tAmb: tempBase?.tAmb ?? null,
      tDays: tempBase ? tempBase.days.length : null,
      motion: motionBase?.motion ?? null,
      mDays: motionBase ? motionBase.days.length : null,
    },
    ageMin,
    todayMotion,
    cleanPostures(device.postures)
  )

  let waveform: TrackingWaveform | null = null
  if (waveformBurst && waveformBurst.samples?.length >= 20 && waveformBurst.sampleRateHz > 0) {
    const vals = waveformBurst.samples
    const fs = waveformBurst.sampleRateHz
    const perMg = (waveformBurst.scalePerG || DEFAULT_SCALE_PER_G) / 1000
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    waveform = {
      time: waveformBurst.receivedAt.toISOString(),
      sampleRateHz: fs,
      seconds: vals.map((_, i) => Math.round((i / fs) * 100) / 100),
      mg: vals.map((v) => Math.round(((v - mean) / perMg) * 100) / 100),
    }
  }

  // Round the per-snapshot numbers: they are shown, not computed with, on the page.
  for (const s of behaviour.snaps) {
    s.features = {
      actMg: round(s.features.actMg, 2) as number,
      chewMg: round(s.features.chewMg, 2) as number,
      chewPeak: round(s.features.chewPeak, 2) as number,
      chewHz: round(s.features.chewHz, 2),
      stepMg: round(s.features.stepMg, 2) as number,
    }
  }

  const [summary] = await serializeDevices([device])
  return {
    device: summary,
    readings: readings.map(toReading),
    pulses: pulseRows.map(toPulse),
    waveform,
    behaviour,
    gpsState: readings.find((r) => r.gps)?.gps ?? null,
    generatedAt: new Date(now).toISOString(),
  }
}
