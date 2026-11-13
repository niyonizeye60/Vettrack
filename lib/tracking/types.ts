// Shapes the tracking API returns to the farmer and vet pages. Client-safe: no
// database or Node imports, so components can import these freely.
import type { BehaviourSummary, PostureName } from "./behaviour"
import type { HrNote } from "./heart-rate"

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
  /** Null when the signal was not trusted (see noteCode), or the burst was not analysed. */
  bpm: number | null
  bpmPeaks: number | null
  confidence: number | null
  method: string | null
  motionMg: number | null
  /** The analysis's English note; shown only when there is no noteCode to translate. */
  notes: string | null
  noteCode: HrNote | null
  /** False only for a burst whose sample rate the heart-rate analysis cannot handle. */
  analysed: boolean
}

export interface TrackingWaveform {
  time: string
  sampleRateHz: number
  seconds: number[]
  /** Acceleration with the resting value removed, in milli-g. */
  mg: number[]
  /** The 2-8 Hz band where a heartbeat shows up, in milli-g; null when it cannot be computed. */
  band: number[] | null
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
