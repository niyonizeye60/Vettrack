// Shapes the tracking API returns to the farmer and vet pages. Client-safe: no
// database or Node imports, so components can import these freely.
import type { BehaviourSummary, PostureName } from "./behaviour"

export interface TrackingDeviceSummary {
  id: string
  /** The collar's own ID, as its firmware sends it (e.g. "COW-001"). */
  deviceId: string
  name: string
  animalId: string | null
  animalName: string | null
  lastSeenAt: string | null
  createdAt: string
  calibrated: Record<PostureName, boolean>
}

export interface TrackingReading {
  time: string
  /** Surface (skin) temperature from the infrared sensor, °C - not core temperature. */
  tempObject: number | null
  tempAmbient: number | null
  accelX: number | null
  accelY: number | null
  accelZ: number | null
  latitude: number | null
  longitude: number | null
  batteryVoltage: number | null
  charging: boolean | null
  /** What the GPS module reported: "fix" / "nofix" / "nocmd", when the firmware sends it. */
  gps: string | null
}

export interface TrackingPulse {
  time: string
  /** Null when the burst was analysed but not trusted, or not analysed at all. */
  bpm: number | null
  bpmPeaks: number | null
  confidence: number | null
  method: string | null
  motionMg: number | null
  notes: string | null
  /** False until the heart-rate analysis is ported (see app/api/iot/bursts/route.ts). */
  analysed: boolean
}

export interface TrackingWaveform {
  time: string
  sampleRateHz: number
  seconds: number[]
  /** Acceleration with the resting value removed, in milli-g. */
  mg: number[]
}

export interface TrackingDashboardData {
  device: TrackingDeviceSummary
  /** Newest first. */
  readings: TrackingReading[]
  /** Newest first, at most 30. */
  pulses: TrackingPulse[]
  waveform: TrackingWaveform | null
  behaviour: BehaviourSummary
  gpsState: string | null
  generatedAt: string
}
