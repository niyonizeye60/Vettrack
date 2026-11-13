// Heart rate from a short accelerometer burst - a port of the IoT backend's
// hr_process.php (ballistocardiography: each heartbeat makes a tiny recoil in the
// body). Pure functions, no database, so they can be checked against the PHP; the
// arithmetic is kept in the PHP's order for that reason.
//
// Experimental for cattle, as the original says: the cardiac signal is a few milli-g
// and is easily swamped by movement and breathing. The analysis returns a confidence
// and refuses to give a BPM when the signal does not look like a regular heartbeat,
// rather than guessing.

/**
 * Minimum autocorrelation confidence before a BPM is trusted. hr_process.php chose it
 * from a simulation sweep: at 0.45 about 1% of heartbeat-free bursts give a false
 * answer, while strong signals are still read.
 */
export const HR_MIN_CONFIDENCE = 0.45
/** More movement than this (milli-g) and the burst is not trusted. */
export const HR_MAX_MOTION_MG = 40

/** Why a burst gave no trusted BPM ("disagree": it did, but with a caution). */
export type HrNote = "short" | "movement" | "no_signal" | "weak" | "disagree"
export type HrMethod = "envelope" | "low-band"

export interface HrAnalysis {
  /** Null when the signal is not trusted. */
  bpm: number | null
  /** Cross-check from the median gap between peaks. */
  bpmPeaks: number | null
  /** The BPM before the trust checks. */
  bpmCandidate: number | null
  confidence: number
  method: HrMethod | null
  /** Overall movement (standard deviation) in milli-g; null when the scale is unknown. */
  motionMg: number | null
  /** The PHP's English note, word for word (the collar's response carries it). */
  notes: string | null
  /** The same note as a code, for the page to translate. */
  note: HrNote | null
  durationS: number
}

type Biquad = readonly [number, number, number, number, number]

const pow10 = (p: number) => (p >= 0 && p <= 22 ? Number(`1e${p}`) : 10 ** p)
const halfUp = (v: number) => (v >= 0 ? Math.floor(v + 0.5) : Math.ceil(v - 0.5))

/**
 * PHP's round() (as in PHP 8.2's _php_math_round): half away from zero, after first
 * rounding the value to 15 significant digits - so e.g. round(1.005, 2) is 1.01, where
 * plain Math.round arithmetic gives 1.
 */
export function phpRound(value: number, places: number): number {
  if (!Number.isFinite(value) || value === 0) return value
  const precisionPlaces = 14 - Math.floor(Math.log10(Math.abs(value)))
  const f1 = pow10(Math.abs(places))
  let tmp: number
  if (precisionPlaces > places && precisionPlaces - 15 < places) {
    tmp = halfUp(precisionPlaces >= 0 ? value * pow10(precisionPlaces) : value / pow10(-precisionPlaces))
    tmp = tmp / pow10(precisionPlaces - places)
  } else {
    tmp = places >= 0 ? value * f1 : value / f1
    if (Math.abs(tmp) >= 1e15) return value
  }
  tmp = halfUp(tmp)
  return places > 0 ? tmp / f1 : tmp * f1
}

/** 2nd-order biquad coefficients (RBJ cookbook). */
export function hrBiquad(type: "lp" | "hp", fs: number, fc: number, q = 0.70710678): Biquad {
  const w0 = (2.0 * Math.PI * fc) / fs
  const cosw = Math.cos(w0)
  const alpha = Math.sin(w0) / (2.0 * q)
  let b0: number, b1: number, b2: number
  if (type === "lp") {
    b0 = (1 - cosw) / 2
    b1 = 1 - cosw
    b2 = (1 - cosw) / 2
  } else {
    b0 = (1 + cosw) / 2
    b1 = -(1 + cosw)
    b2 = (1 + cosw) / 2
  }
  const a0 = 1 + alpha
  const a1 = -2 * cosw
  const a2 = 1 - alpha
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]
}

function hrBiquadRun(x: number[], c: Biquad): number[] {
  const [b0, b1, b2, a1, a2] = c
  const y = new Array<number>(x.length)
  // Start in the filter's steady state for a constant input equal to the first sample
  // (gain 1 for a low-pass, 0 for a high-pass), so there is no start-up transient.
  const gain = (b0 + b1 + b2) / (1 + a1 + a2)
  let x1 = x[0]
  let x2 = x[0]
  let y1 = x[0] * gain
  let y2 = y1
  for (let i = 0; i < x.length; i++) {
    const xn = x[i]
    const yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    y[i] = yn
    x2 = x1
    x1 = xn
    y2 = y1
    y1 = yn
  }
  return y
}

/** Zero-phase filtering (forward then backward) with reflected padding. */
export function hrFiltfilt(x: number[], c: Biquad): number[] {
  const n = x.length
  const pad = Math.min(40, n - 1)
  const ext: number[] = []
  for (let i = pad; i >= 1; i--) ext.push(2 * x[0] - x[i]) // odd reflection, start
  for (const v of x) ext.push(v)
  for (let i = 1; i <= pad; i++) ext.push(2 * x[n - 1] - x[n - 1 - i]) // end
  const f = hrBiquadRun(ext, c).reverse()
  return hrBiquadRun(f, c).reverse().slice(pad, pad + n)
}

/** Band-pass = high-pass at `lo` then low-pass at `hi`, both zero-phase. */
export function hrBandpass(x: number[], fs: number, lo: number, hi: number): number[] {
  return hrFiltfilt(hrFiltfilt(x, hrBiquad("hp", fs, lo)), hrBiquad("lp", fs, hi))
}

function mean(x: number[]): number {
  let s = 0
  for (const v of x) s += v
  return s / x.length
}

function std(x: number[]): number {
  const m = mean(x)
  let s = 0
  for (const v of x) s += (v - m) * (v - m)
  return Math.sqrt(s / x.length)
}

/**
 * Autocorrelation period estimate: [bpm, confidence], or [null, 0]. Confidence is the
 * normalised autocorrelation at the chosen lag (0..1).
 */
export function hrAutocorrBpm(x: number[], fs: number, minBpm = 40, maxBpm = 150): [number | null, number] {
  const n = x.length
  const m = mean(x)
  const z = x.map((v) => v - m)
  let r0 = 0
  for (const v of z) r0 += v * v
  if (r0 <= 0) return [null, 0]
  r0 /= n

  const lagMin = Math.max(2, Math.floor((fs * 60.0) / maxBpm))
  const lagMax = Math.min(n - 4, Math.ceil((fs * 60.0) / minBpm))
  if (lagMax <= lagMin + 2) return [null, 0]

  // unbiased normalised autocorrelation (so long lags are not unfairly penalised)
  const r = new Array<number>(lagMax + 2)
  for (let lag = lagMin - 1; lag <= lagMax + 1; lag++) {
    let s = 0
    for (let i = 0; i < n - lag; i++) s += z[i] * z[i + lag]
    r[lag] = s / (n - lag) / r0
  }

  // local maxima inside the allowed range
  const peaks: Array<[number, number]> = []
  for (let lag = lagMin; lag <= lagMax; lag++) {
    if (r[lag] > r[lag - 1] && r[lag] >= r[lag + 1]) peaks.push([lag, r[lag]])
  }
  if (peaks.length === 0) return [null, 0]

  const best = Math.max(...peaks.map(([, v]) => v))
  if (best <= 0) return [null, 0] // no positive correlation at any plausible heart period
  // Prefer the SHORTEST lag that is nearly as strong as the strongest (avoids locking
  // onto a multiple of the true period).
  const chosen = peaks.find(([, v]) => v >= 0.85 * best)?.[0]
  if (chosen === undefined) return [null, 0]
  // parabolic interpolation for sub-sample accuracy
  const y0 = r[chosen - 1]
  const y1 = r[chosen]
  const y2 = r[chosen + 1]
  const den = y0 - 2 * y1 + y2
  const shift = den !== 0 ? (0.5 * (y0 - y2)) / den : 0
  const period = (chosen + shift) / fs
  return [60.0 / period, Math.max(0, Math.min(1, r[chosen]))]
}

/** Cross-check: BPM from the median interval between detected peaks. */
export function hrPeakBpm(x: number[], fs: number): number | null {
  const sd = std(x)
  if (sd <= 0) return null
  const thr = 0.35 * sd
  const minGap = phpRound(fs * 0.33, 0)
  const peaks: number[] = []
  let last = -1000000
  for (let i = 1; i < x.length - 1; i++) {
    if (x[i] > x[i - 1] && x[i] >= x[i + 1] && x[i] > thr && i - last >= minGap) {
      peaks.push(i)
      last = i
    }
  }
  if (peaks.length < 4) return null
  const iv: number[] = []
  for (let i = 1; i < peaks.length; i++) iv.push((peaks[i] - peaks[i - 1]) / fs)
  iv.sort((a, b) => a - b)
  const med = iv[Math.floor(iv.length / 2)]
  return med > 0 ? 60.0 / med : null
}

/**
 * Full analysis of one burst. `samples`: acceleration magnitude in counts;
 * `scalePerG`: counts per 1 g (used only to express movement in milli-g; 0 = unknown).
 *
 * Two independent routes are tried and the more confident one is used:
 *   "low-band": 0.6-3 Hz band-pass (the slow recoil of each beat)
 *   "envelope": 2-8 Hz band-pass, rectified and smoothed. This measures how strongly
 *               the body vibrates moment to moment; each heartbeat makes a short burst,
 *               so the envelope repeats at the heart rate. Usually the stronger route,
 *               since most of a heartbeat's energy sits above 2 Hz, beyond breathing.
 */
export function hrAnalyze(samples: number[], fs: number, scalePerG = 0): HrAnalysis {
  const n = samples.length
  const out: HrAnalysis = {
    bpm: null,
    bpmPeaks: null,
    bpmCandidate: null,
    confidence: 0,
    method: null,
    motionMg: null,
    notes: null,
    note: null,
    durationS: n / fs,
  }
  const reject = (note: HrNote, notes: string) => ({ ...out, note, notes })

  if (n < fs * 5) return reject("short", "burst shorter than 5 s")

  const raw = samples.map(Number)
  out.motionMg = scalePerG > 0 ? (std(raw) * 1000.0) / scalePerG : null

  // route 1: slow recoil
  const low = hrBandpass(raw, fs, 0.6, 3.0)
  const [bpmA, confA] = hrAutocorrBpm(low, fs)

  // route 2: vibration envelope (upper limit kept safely below Nyquist)
  const hi = Math.min(8.0, fs * 0.4)
  const env = hrFiltfilt(hrBandpass(raw, fs, 2.0, hi).map(Math.abs), hrBiquad("lp", fs, 3.0))
  const [bpmB, confB] = hrAutocorrBpm(env, fs)

  const useEnvelope = confB > confA
  const bpm = useEnvelope ? bpmB : bpmA
  const conf = useEnvelope ? confB : confA
  out.method = useEnvelope ? "envelope" : "low-band"
  out.confidence = phpRound(conf, 3)
  out.bpmCandidate = bpm === null ? null : phpRound(bpm, 1)
  const peakBpm = hrPeakBpm(useEnvelope ? env : low, fs)
  out.bpmPeaks = peakBpm === null ? null : phpRound(peakBpm, 1)

  if (out.motionMg !== null && out.motionMg > HR_MAX_MOTION_MG) {
    return reject("movement", `too much movement (${phpRound(out.motionMg, 1)} mg) - not trusted`)
  }
  if (bpm === null) return reject("no_signal", "no periodic signal found")
  if (conf < HR_MIN_CONFIDENCE) {
    return reject("weak", `weak/irregular signal (confidence ${phpRound(conf, 2)}) - not trusted`)
  }
  out.bpm = phpRound(bpm, 1)
  // The peak-count cross-check is the weaker method, so it only raises a doubt when
  // the main one is not confident.
  if (conf < 0.7 && out.bpmPeaks !== null && Math.abs(out.bpmPeaks - bpm) > 0.15 * bpm) {
    out.note = "disagree"
    out.notes = "autocorrelation and peak counting disagree - treat with caution"
  }
  return out
}

/** PHP's (int)/(float) casts, for the few shapes JSON can deliver. */
function phpNumber(value: unknown): number {
  const n =
    typeof value === "number" ? value
    : typeof value === "string" ? Number.parseFloat(value)
    : typeof value === "boolean" ? Number(value)
    : NaN
  return Number.isFinite(n) ? n : 0
}

export interface BurstPayload {
  fs: number
  n: number
  /** Counts per g; 0 when the collar did not say. */
  scale: number
  samples: number[]
  analysis: HrAnalysis
}

/**
 * Validate a burst payload from the collar and analyse it - hr_process_payload(),
 * same rules and error messages.
 */
export function hrProcessPayload(data: Record<string, unknown>): { error: string } | BurstPayload {
  if (data.sample_rate_hz == null || data.samples == null || !Array.isArray(data.samples)) {
    return { error: "missing sample_rate_hz or samples" }
  }
  const fs = Math.trunc(phpNumber(data.sample_rate_hz))
  if (fs < 5 || fs > 200) return { error: "sample_rate_hz out of range (5-200)" }
  const samples = data.samples as unknown[]
  const n = samples.length
  if (n < fs * 5) return { error: "burst too short - need at least 5 seconds of samples" }
  if (n > 3000) return { error: "burst too long (max 3000 samples)" }
  if (samples.some((v) => typeof v !== "number")) return { error: "samples must be numbers" }
  const scale = data.scale_per_g == null ? 0 : phpNumber(data.scale_per_g)
  const values = samples as number[]
  return { fs, n, scale, samples: values, analysis: hrAnalyze(values, fs, scale) }
}
