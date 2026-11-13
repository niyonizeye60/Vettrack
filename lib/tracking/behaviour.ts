// Behaviour estimates from the collar's accelerometer bursts.
//
// Ported from the IoT backend's behaviour.php + behaviour_config.php. Pure functions
// with no database access, so they can run anywhere and be checked on their own.
//
// Each burst (~8 s of acceleration magnitude) is one "snapshot" of what the animal
// was doing at that moment - the scan-sampling idea from animal-behaviour studies.
// With a burst every 15 minutes that is about 96 snapshots a day.
//
// HONEST CAVEAT (carried over from the original): these are simple rules with
// starting-guess thresholds. They have NOT been validated against observed cattle
// behaviour, and the UI shows them as estimates next to the numbers behind them.

export const BEHAVIOUR_CONFIG = {
  // Night is judged on Rwanda local time. The PHP read the hour straight off the
  // MySQL timestamp plus a manual offset; we store UTC instants, so the zone is explicit.
  timeZone: "Africa/Kigali",
  nightStart: 21, // from this hour (local) ...
  nightEnd: 5, // ... until this hour counts as night

  // How much the animal is moving (spread of acceleration over the burst, in mg).
  stillMg: 6.0, // below this: very still (resting or sleeping)
  moveMg: 60.0, // above this: moving / walking

  // Rhythm detection (amplitudes in mg).
  chewBand: [0.8, 1.8] as [number, number], // Hz: chewing / rumination is about once per second
  chewMinMg: 8.0, // chewing rhythm must be at least this strong
  chewPeakRatio: 3.0, // ...and stand out this much above the background
  stepBand: [1.5, 3.5] as [number, number], // Hz: walking steps / head bobbing
  stepMinMg: 25.0,

  postureMaxAngle: 35, // degrees: further than this from every calibrated pose = unknown posture

  // "Sick / abnormal" checks - always relative to THIS animal's own normal.
  baselineMinDays: 3, // days of history needed before comparing
  tempRiseC: 1.0, // surface temperature this much above its own average
  activityDropRatio: 0.5, // activity below this fraction of its own average
  nightRestlessShare: 0.4, // share of night snapshots that are "moving"
  staleMinutes: 60, // no data for this long = device problem, not cow problem
}

export type BehaviourConfig = typeof BEHAVIOUR_CONFIG

export const POSTURE_NAMES = ["standing", "head_down", "lying"] as const
export type PostureName = (typeof POSTURE_NAMES)[number]
export type Vec3 = [number, number, number]
/** Gravity vector (x, y, z in g) recorded for each calibrated pose. */
export type PostureCalibration = Partial<Record<PostureName, Vec3>>

export const BEHAVIOUR_STATES = [
  "moving",
  "grazing",
  "ruminating",
  "resting_lying",
  "resting_standing",
  "sleeping",
  "still",
  "light_activity",
] as const
export type BehaviourState = (typeof BEHAVIOUR_STATES)[number]

export const BEHAVIOUR_STATE_COLORS: Record<BehaviourState, string> = {
  moving: "#e65100",
  grazing: "#2e7d32",
  ruminating: "#6a1b9a",
  resting_lying: "#1565c0",
  resting_standing: "#4f8fd6",
  sleeping: "#283593",
  still: "#78909c",
  light_activity: "#bdbdbd",
}

/** Firmware v3 sends 10000 counts per g, i.e. 1 count = 0.1 mg. */
export const DEFAULT_SCALE_PER_G = 10000

function countsPerMg(scalePerG: number | null | undefined): number {
  const scale = typeof scalePerG === "number" && scalePerG > 0 ? scalePerG : DEFAULT_SCALE_PER_G
  return scale / 1000
}

const deg = (rad: number) => (rad * 180) / Math.PI
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * Amplitude spectrum (mg) of a burst as [frequencyHz, amplitude] pairs.
 * Mean and straight-line trend (slow drift, posture change) are removed and a Hann
 * window applied first. A plain DFT is plenty for ~160 samples.
 */
export function spectrum(x: number[], fs: number, scalePerG?: number | null): Array<[number, number]> {
  const n = x.length
  const perMg = countsPerMg(scalePerG)
  const mean = x.reduce((a, b) => a + b, 0) / n
  const c = (n - 1) / 2
  let sxx = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    sxx += (i - c) * (i - c)
    sxy += (i - c) * (x[i] - mean)
  }
  const slope = sxx > 0 ? sxy / sxx : 0
  const z = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)) // Hann window
    z[i] = (x[i] - mean - slope * (i - c)) * w
  }
  const spec: Array<[number, number]> = []
  for (let k = 1; k <= Math.floor(n / 2); k++) {
    let re = 0
    let im = 0
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * k * i) / n
      re += z[i] * Math.cos(a)
      im -= z[i] * Math.sin(a)
    }
    // x4/N undoes the window's average gain of 0.5; then counts -> mg
    spec.push([(k * fs) / n, (4 * Math.sqrt(re * re + im * im)) / n / perMg])
  }
  return spec
}

/** RMS amplitude (mg) of all spectrum bins inside [lo, hi] Hz. */
export function bandRms(spec: Array<[number, number]>, lo: number, hi: number): number {
  let s = 0
  for (const [f, a] of spec) if (f >= lo && f <= hi) s += (a * a) / 2
  return Math.sqrt(s)
}

export interface BurstFeatures {
  actMg: number
  chewMg: number
  chewPeak: number
  chewHz: number | null
  stepMg: number
}

/** Features describing one burst. */
export function features(samples: number[], fs: number, cfg: BehaviourConfig, scalePerG?: number | null): BurstFeatures {
  const x = samples
  const n = x.length
  const perMg = countsPerMg(scalePerG)
  const spec = spectrum(x, fs, scalePerG)

  // movement = spread of the detrended signal (mg)
  const mean = x.reduce((a, b) => a + b, 0) / n
  const c = (n - 1) / 2
  let sxx = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    sxx += (i - c) ** 2
    sxy += (i - c) * (x[i] - mean)
  }
  const slope = sxx > 0 ? sxy / sxx : 0
  let v = 0
  for (let i = 0; i < n; i++) {
    const d = x[i] - mean - slope * (i - c)
    v += d * d
  }
  const act = Math.sqrt(v / n) / perMg

  const [cl, ch] = cfg.chewBand
  const [sl, sh] = cfg.stepBand
  let chewPeak = 0
  let chewHz: number | null = null
  const all: number[] = []
  for (const [f, a] of spec) {
    if (f >= 0.3 && f <= 5.0) all.push(a)
    if (f >= cl && f <= ch && a > chewPeak) {
      chewPeak = a
      chewHz = f
    }
  }
  all.sort((a, b) => a - b)
  const median = all.length ? all[Math.floor(all.length / 2)] : 0

  return {
    actMg: act,
    chewMg: bandRms(spec, cl, ch),
    chewPeak: median > 0 ? chewPeak / median : 0,
    chewHz,
    stepMg: bandRms(spec, sl, sh),
  }
}

export interface Orientation {
  pitch: number
  roll: number
  tilt: number | null
  /** Unit vector in the device's X/Y plane, for the bubble drawing. */
  nx: number
  ny: number
}

/** Orientation numbers from a gravity vector in the device frame (x, y, z in g). */
export function orientation(g: Vec3): Orientation {
  const [x, y, z] = g
  const len = Math.sqrt(x * x + y * y + z * z)
  return {
    pitch: deg(Math.atan2(-x, Math.sqrt(y * y + z * z))),
    roll: deg(Math.atan2(y, z)),
    tilt: len > 0 ? deg(Math.acos(clamp(z / len, -1, 1))) : null, // angle from the device's own Z axis
    nx: len > 0 ? x / len : 0,
    ny: len > 0 ? y / len : 0,
  }
}

export function angleBetween(a: Vec3, b: Vec3): number {
  const la = Math.sqrt(a[0] ** 2 + a[1] ** 2 + a[2] ** 2)
  const lb = Math.sqrt(b[0] ** 2 + b[1] ** 2 + b[2] ** 2)
  if (la === 0 || lb === 0) return 180
  return deg(Math.acos(clamp((a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb), -1, 1)))
}

/** Nearest calibrated pose to a gravity vector. */
export function nearestPosture(
  g: Vec3 | null,
  postures: PostureCalibration,
  cfg: BehaviourConfig
): { name: PostureName | null; angle: number | null } {
  const entries = Object.entries(postures) as Array<[PostureName, Vec3]>
  if (g === null || entries.length === 0) return { name: null, angle: null }
  let best: PostureName | null = null
  let bestAngle = 999
  for (const [name, ref] of entries) {
    const a = angleBetween(g, ref)
    if (a < bestAngle) {
      bestAngle = a
      best = name
    }
  }
  if (bestAngle > cfg.postureMaxAngle) return { name: null, angle: bestAngle }
  return { name: best, angle: bestAngle }
}

export function isNight(hour: number, cfg: BehaviourConfig): boolean {
  return cfg.nightStart > cfg.nightEnd
    ? hour >= cfg.nightStart || hour < cfg.nightEnd
    : hour >= cfg.nightStart && hour < cfg.nightEnd
}

const hourFormatters = new Map<string, Intl.DateTimeFormat>()
/** Hour of day (0-23) of an instant in the given IANA zone. */
export function localHour(date: Date, timeZone: string): number {
  let fmt = hourFormatters.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" })
    hourFormatters.set(timeZone, fmt)
  }
  return Number.parseInt(fmt.format(date), 10) % 24
}

/** One snapshot -> state. */
export function classify(f: BurstFeatures, posture: PostureName | null, cfg: BehaviourConfig): BehaviourState {
  if (f.actMg >= cfg.moveMg || f.stepMg >= cfg.stepMinMg) return "moving"
  if (posture === "head_down" && f.actMg >= cfg.stillMg) return "grazing"
  if (f.chewMg >= cfg.chewMinMg && f.chewPeak >= cfg.chewPeakRatio) return "ruminating"
  if (f.actMg < cfg.stillMg) {
    if (posture === "lying") return "resting_lying"
    if (posture === "standing") return "resting_standing"
    return "still"
  }
  return "light_activity"
}

// ---------------------------------------------------------------------------
// Whole-dashboard summary
// ---------------------------------------------------------------------------

export interface BurstInput {
  receivedAt: Date
  sampleRateHz: number
  scalePerG?: number | null
  samples: number[]
}

export interface ReadingInput {
  receivedAt: Date
  accelX: number | null
  accelY: number | null
  accelZ: number | null
  tempObject: number | null
  tempAmbient: number | null
}

export interface Baseline {
  /** Average surface / air temperature over the previous days (null when none). */
  tObj: number | null
  tAmb: number | null
  tDays: number | null
  /** Average per-burst movement over the previous days. */
  motion: number | null
  mDays: number | null
}

export interface Snapshot {
  time: string
  t: number
  state: BehaviourState
  features: BurstFeatures
  posture: PostureName | null
  night: boolean
}

/**
 * Flags are codes + numbers, not sentences, so the page can show them in the
 * reader's language. The English wording from the original lives in the translations.
 */
export type BehaviourFlag =
  | { code: "stale"; level: "warn"; minutes: number }
  | { code: "temp_rise"; level: "warn"; rise: number; ambientRise: number }
  | { code: "activity_drop"; level: "warn"; percent: number }
  | { code: "night_restless"; level: "info"; percent: number }
  | { code: "no_rumination"; level: "info" }
  | { code: "learning"; level: "info"; haveDays: number; needDays: number }

export type BehaviourNote = "posture_uncalibrated" | `missing_${PostureName}`

export interface OrientationSummary extends Orientation {
  g: Vec3
  time: string
  posture: { name: PostureName | null; angle: number | null }
}

export interface BehaviourSummary {
  snaps: Snapshot[]
  latest: Snapshot | null
  /** Percentage of snapshots per state, largest first. */
  budget: Array<{ state: BehaviourState; percent: number }>
  orient: OrientationSummary | null
  flags: BehaviourFlag[]
  notes: BehaviourNote[]
  n: number
}

const gravityOf = (r: ReadingInput): Vec3 | null =>
  r.accelX === null || r.accelY === null || r.accelZ === null ? null : [r.accelX, r.accelY, r.accelZ]

/**
 * Build everything the behaviour panel shows.
 *  bursts      : last 24 h of bursts with samples, oldest first
 *  readings    : last 24 h of readings, oldest first
 *  baseline    : averages of the previous days
 *  ageMin      : minutes since the newest reading (null if none)
 *  todayMotion : average per-burst movement over the last 24 h (null if none)
 */
export function summarizeBehaviour(
  bursts: BurstInput[],
  readings: ReadingInput[],
  baseline: Baseline,
  ageMin: number | null,
  todayMotion: number | null,
  postures: PostureCalibration,
  cfg: BehaviourConfig = BEHAVIOUR_CONFIG
): BehaviourSummary {
  const calibrated = Object.keys(postures).length > 0
  const withGravity = readings
    .map((r) => ({ t: r.receivedAt.getTime(), g: gravityOf(r) }))
    .filter((r): r is { t: number; g: Vec3 } => r.g !== null)

  // ----- snapshots -----
  const snaps: Snapshot[] = []
  for (const b of bursts) {
    const fs = b.sampleRateHz || 20
    if (b.samples.length < fs * 5) continue

    const t = b.receivedAt.getTime()
    // gravity direction: the reading closest in time (within 10 minutes)
    let g: Vec3 | null = null
    let bestDt = 601_000
    for (const r of withGravity) {
      const dt = Math.abs(r.t - t)
      if (dt < bestDt) {
        bestDt = dt
        g = r.g
      }
    }
    const pos = nearestPosture(g, postures, cfg)
    const f = features(b.samples, fs, cfg, b.scalePerG)
    const hour = localHour(b.receivedAt, cfg.timeZone)
    snaps.push({
      time: b.receivedAt.toISOString(),
      t,
      state: classify(f, pos.name, cfg),
      features: f,
      posture: pos.name,
      night: isNight(hour, cfg),
    })
  }

  // Sleeping = lying, very still, at night, and a neighbouring snapshot agrees
  // (not just a pause). Decided from the original states.
  const n = snaps.length
  const orig = snaps.map((s) => s.state)
  for (let i = 0; i < n; i++) {
    if (orig[i] !== "resting_lying" || !snaps[i].night) continue
    for (const j of [i - 1, i + 1]) {
      if (j >= 0 && j < n && orig[j] === "resting_lying" && Math.abs(snaps[j].t - snaps[i].t) <= 2_700_000) {
        snaps[i].state = "sleeping"
        break
      }
    }
  }

  // ----- time budget -----
  const counts = new Map<BehaviourState, number>()
  for (const s of snaps) counts.set(s.state, (counts.get(s.state) ?? 0) + 1)
  const budget = [...counts.entries()]
    .map(([state, c]) => ({ state, percent: Math.round((1000 * c) / Math.max(1, n)) / 10 }))
    .sort((a, b) => b.percent - a.percent)

  // ----- orientation (newest reading with accelerometer data) -----
  let orient: OrientationSummary | null = null
  for (let i = readings.length - 1; i >= 0; i--) {
    const g = gravityOf(readings[i])
    if (!g) continue
    orient = { ...orientation(g), g, time: readings[i].receivedAt.toISOString(), posture: nearestPosture(g, postures, cfg) }
    break
  }

  // ----- what cannot be told yet -----
  const notes: BehaviourNote[] = []
  if (!calibrated) {
    notes.push("posture_uncalibrated")
  } else {
    for (const need of POSTURE_NAMES) if (!postures[need]) notes.push(`missing_${need}`)
  }

  // ----- sick / abnormal flags (relative to this animal's own normal) -----
  const flags: BehaviourFlag[] = []
  if (ageMin !== null && ageMin > cfg.staleMinutes) {
    flags.push({ code: "stale", level: "warn", minutes: ageMin })
  }

  const withTemp = readings.filter((r) => r.tempObject !== null && r.tempObject !== 0)
  const last = withTemp.slice(-4)
  const haveTempBase =
    baseline.tDays !== null && baseline.tDays >= cfg.baselineMinDays && baseline.tObj !== null
  if (last.length > 0 && haveTempBase) {
    const now = last.reduce((s, r) => s + (r.tempObject as number), 0) / last.length
    const amb = last.filter((r) => r.tempAmbient !== null)
    const rise = now - (baseline.tObj as number)
    // The PHP averaged a missing air temperature in as 0; only real values count here.
    const ambientRise =
      baseline.tAmb !== null && amb.length > 0
        ? amb.reduce((s, r) => s + (r.tempAmbient as number), 0) / amb.length - baseline.tAmb
        : 0
    if (rise >= cfg.tempRiseC && ambientRise < cfg.tempRiseC) {
      flags.push({ code: "temp_rise", level: "warn", rise, ambientRise })
    }
  }

  const haveActBase =
    baseline.mDays !== null && baseline.mDays >= cfg.baselineMinDays && (baseline.motion ?? 0) > 0
  if (haveActBase && todayMotion !== null && todayMotion < cfg.activityDropRatio * (baseline.motion as number)) {
    flags.push({ code: "activity_drop", level: "warn", percent: (100 * todayMotion) / (baseline.motion as number) })
  }

  const nightSnaps = snaps.filter((s) => s.night)
  if (nightSnaps.length >= 3) {
    const share = nightSnaps.filter((s) => s.state === "moving").length / nightSnaps.length
    if (share >= cfg.nightRestlessShare) flags.push({ code: "night_restless", level: "info", percent: 100 * share })
  }

  if (n >= 20 && calibrated && !counts.has("ruminating")) {
    flags.push({ code: "no_rumination", level: "info" })
  }

  if (!haveTempBase || !haveActBase) {
    const haveDays = Math.max(baseline.tDays ?? 0, baseline.mDays ?? 0)
    flags.push({ code: "learning", level: "info", haveDays, needDays: cfg.baselineMinDays })
  }

  return { snaps, latest: n ? snaps[n - 1] : null, budget, orient, flags, notes, n }
}
