// Wording for the tracking pages. The behaviour code returns codes and numbers; the
// sentences live in the translations so both languages get them.
import type { BehaviourFlag, BehaviourNote, BehaviourState, PostureName, Snapshot } from "@/lib/tracking/behaviour"
import type { TrackingDeviceSummary } from "@/lib/tracking/types"

type T = (key: string) => string

/** "Bella #RW123 (Collar 1)", or just the collar's name when no animal is linked. */
export const deviceLabel = (d: TrackingDeviceSummary) => (d.animalName ? `${d.animalName} (${d.name})` : d.name)

export function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match))
}

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

export function timeAgo(iso: string, t: T): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return t("deviceTracking.justNow")
  if (minutes < 120) return fill(t("deviceTracking.minutesAgo"), { n: minutes })
  const hours = minutes / 60
  if (hours < 48) return fill(t("deviceTracking.hoursAgo"), { n: hours.toFixed(1) })
  return fill(t("deviceTracking.daysAgo"), { n: Math.round(hours / 24) })
}

export const stateLabel = (state: BehaviourState, t: T) => t(`deviceTracking.state.${state}`)
export const postureLabel = (posture: PostureName, t: T) => t(`deviceTracking.posture.${posture}`)

export function flagText(flag: BehaviourFlag, t: T): string {
  switch (flag.code) {
    case "stale":
      return fill(t(flag.minutes >= 120 ? "deviceTracking.flag.staleHours" : "deviceTracking.flag.staleMinutes"), {
        n: flag.minutes >= 120 ? (flag.minutes / 60).toFixed(1) : flag.minutes,
      })
    case "temp_rise":
      return fill(t("deviceTracking.flag.tempRise"), {
        rise: flag.rise.toFixed(1),
        air: `${flag.ambientRise >= 0 ? "+" : ""}${flag.ambientRise.toFixed(1)}`,
      })
    case "activity_drop":
      return fill(t("deviceTracking.flag.activityDrop"), { percent: Math.round(flag.percent) })
    case "night_restless":
      return fill(t("deviceTracking.flag.nightRestless"), { percent: Math.round(flag.percent) })
    case "no_rumination":
      return t("deviceTracking.flag.noRumination")
    case "learning":
      return fill(t("deviceTracking.flag.learning"), { have: flag.haveDays, need: flag.needDays })
  }
}

export function noteText(note: BehaviourNote, t: T): string {
  return t(`deviceTracking.note.${note}`)
}

/** "movement 3.1 mg, chewing rhythm 1.2 mg, steps 0.8 mg, posture: lying" */
export function snapshotWhy(snap: Snapshot, t: T): string {
  const base = fill(t("deviceTracking.why"), {
    act: snap.features.actMg.toFixed(1),
    chew: snap.features.chewMg.toFixed(1),
    step: snap.features.stepMg.toFixed(1),
  })
  return snap.posture ? `${base}, ${fill(t("deviceTracking.whyPosture"), { posture: postureLabel(snap.posture, t) })}` : base
}

export const totalG = (x: number | null, y: number | null, z: number | null) =>
  x === null || y === null || z === null ? null : Math.round(Math.sqrt(x * x + y * y + z * z) * 1000) / 1000
