"use client"
// The collar dashboard body, shared by the farmer's and the vet's tracking pages
// (a vet gets the same full view, never a stripped copy). Mirrors the panels of the
// IoT backend's dashboard.php: temperatures, accelerometer, pulse, latest burst
// waveform, behaviour estimates, abnormal checks, map and the readings table.
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Activity, AlertTriangle, Battery, BatteryCharging, Check, Clock, Compass, Heart, Info, Loader2, MapPin, Sun, Thermometer } from "lucide-react"
import { RwandaMap } from "@/components/rwanda-map"
import { useLanguage } from "@/contexts/LanguageContext"
import { BEHAVIOUR_STATE_COLORS, POSTURE_NAMES, type PostureName, type Snapshot } from "@/lib/tracking/behaviour"
import type { TrackingDashboardData } from "@/lib/tracking/types"
import { clockTime, fill, flagText, noteText, postureLabel, pulseNoteText, snapshotWhy, stateLabel, timeAgo, totalG } from "./format"

export interface CalibrationControls {
  onCalibrate: (posture: PostureName, action: "set" | "clear") => void
  busy: PostureName | null
}

interface Props {
  data: TrackingDashboardData
  animalLabel: string
  /** Only the farm owner gets these. */
  calibration?: CalibrationControls
}

const card = "border border-gray-200 shadow-sm rounded-lg p-6 bg-white"
const hint = "text-xs text-gray-500 mt-2"
const tooltipStyle = { backgroundColor: "rgba(255, 255, 255, 0.95)", borderRadius: "12px", border: "1px solid #e5e7eb" }

function StatCard({ icon, tone, title, value, sub }: { icon: React.ReactNode; tone: string; title: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className={card}>
      <div className={`inline-flex p-3 rounded-xl mb-4 ${tone}`}>{icon}</div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

/** Bubble level: where "down" points in the device's own X/Y plane. Centre = device lying flat. */
function TiltBubble({ nx, ny, label }: { nx: number; ny: number; label: string }) {
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  const x = 60 + clamp(nx) * 50
  const y = 60 - clamp(ny) * 50
  return (
    <svg viewBox="0 0 120 120" width={120} height={120} role="img" aria-label={label} className="flex-shrink-0">
      <circle cx="60" cy="60" r="50" fill="#fafafa" stroke="#bbb" />
      <circle cx="60" cy="60" r="25" fill="none" stroke="#ddd" />
      <line x1="10" y1="60" x2="110" y2="60" stroke="#ddd" />
      <line x1="60" y1="10" x2="60" y2="110" stroke="#ddd" />
      <text x="112" y="58" fontSize="9" fill="#888" textAnchor="end">X</text>
      <text x="64" y="19" fontSize="9" fill="#888">Y</text>
      <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r="7" fill="#c62828" stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}

/** 24-hour strip: one coloured block per snapshot, newest at the right edge. */
function BehaviourTimeline({ snaps, label, t }: { snaps: Snapshot[]; label: string; t: (k: string) => string }) {
  const W = 960
  const DAY = 86_400_000
  const tEnd = snaps[snaps.length - 1].t + 900_000
  const tStart = tEnd - DAY
  const ticks: number[] = []
  const d = new Date(tStart)
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  while (d.getHours() % 4 !== 0) d.setHours(d.getHours() + 1)
  for (; d.getTime() <= tEnd; d.setHours(d.getHours() + 4)) ticks.push(d.getTime())

  return (
    <div>
      {/* The strip stretches to the card; the time labels are HTML so they stay readable at any width. */}
      <svg viewBox={`0 0 ${W} 46`} preserveAspectRatio="none" width="100%" height="46" role="img" aria-label={label} className="block rounded">
        <rect x="0" y="0" width={W} height="46" fill="#f1f1f1" />
        {snaps.map((s, i) => {
          const next = snaps[i + 1]?.t ?? s.t + 900_000
          const x = Math.max(0, ((s.t - tStart) / DAY) * W)
          const w = Math.max(4, (Math.min(next - s.t, 1_200_000) / DAY) * W)
          return (
            <rect key={`${s.t}-${i}`} x={x.toFixed(1)} y="0" width={w.toFixed(1)} height="46" fill={BEHAVIOUR_STATE_COLORS[s.state]}>
              <title>{`${clockTime(s.time)} ${stateLabel(s.state, t)}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="relative h-6 text-[11px] text-gray-500">
        {ticks.map((tick, i) => {
          const pct = ((tick - tStart) / DAY) * 100
          if (pct < 4 || pct > 96) return null
          return (
            <span
              key={tick}
              className={`absolute top-0 -translate-x-1/2 flex-col items-center whitespace-nowrap ${i % 2 ? "hidden sm:flex" : "flex"}`}
              style={{ left: `${pct}%` }}
            >
              <span className="h-1.5 w-px bg-gray-400" />
              {clockTime(new Date(tick).toISOString())}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** Sensor floats arrive as e.g. 3.8200000000000003; show at most `digits` decimals. */
const show = (v: number | null, digits = 2) => (v === null ? "—" : String(Math.round(v * 10 ** digits) / 10 ** digits))

export function TrackingDashboard({ data, animalLabel, calibration }: Props) {
  const { t } = useLanguage()
  const { readings, pulses, waveform, behaviour, device } = data

  if (readings.length === 0 && pulses.length === 0) {
    return (
      <div className={`${card} p-12 text-center`}>
        <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-50">
          <Clock className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{t("deviceTracking.waitingTitle")}</h3>
        <p className="text-gray-600 max-w-xl mx-auto">{fill(t("deviceTracking.waitingDesc"), { id: device.deviceId })}</p>
      </div>
    )
  }

  // Readings arrive newest first; charts run oldest -> newest.
  const chronological = [...readings].reverse()
  const newest = readings[0] ?? null
  const latestSkin = readings.find((r) => r.tempObject !== null && r.tempObject !== 0) ?? null
  const latestAir = readings.find((r) => r.tempAmbient !== null) ?? null
  const latestPower = readings.find((r) => r.batteryVoltage !== null || r.charging !== null) ?? null
  const trustedPulse = pulses.find((p) => p.bpm !== null) ?? null
  const anyAnalysed = pulses.some((p) => p.analysed)

  // A 0 °C skin reading is a sensor glitch, not a frozen cow: drawn as a gap.
  const tempSeries = chronological.map((r) => ({
    label: clockTime(r.time),
    skin: r.tempObject === 0 ? null : r.tempObject,
    air: r.tempAmbient,
  }))
  const accelSeries = chronological.map((r) => ({
    label: clockTime(r.time),
    total: totalG(r.accelX, r.accelY, r.accelZ),
    x: r.accelX,
    y: r.accelY,
    z: r.accelZ,
  }))
  const anyAccel = accelSeries.some((p) => p.total !== null)
  const newestAccel = readings.find((r) => totalG(r.accelX, r.accelY, r.accelZ) !== null) ?? null
  const pulseSeries = [...pulses].reverse().map((p) => ({ label: clockTime(p.time), bpm: p.bpm }))
  const waveSeries = waveform ? waveform.seconds.map((s, i) => ({ s, mg: waveform.mg[i], band: waveform.band?.[i] ?? null })) : []

  const locationPoints = chronological
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({ latitude: r.latitude as number, longitude: r.longitude as number, timestamp: r.time, bpm: null, temperature: r.tempObject }))
  const gpsMessage =
    data.gpsState === "nofix" ? t("deviceTracking.gpsNoFix") : data.gpsState === "nocmd" ? t("deviceTracking.gpsNoCmd") : t("deviceTracking.gpsNone")

  const { latest, orient } = behaviour
  const anyCalibrated = POSTURE_NAMES.some((p) => device.calibrated[p])

  return (
    <div className="space-y-8">
      {/* Headline numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Thermometer className="w-6 h-6 text-orange-500" />}
          tone="bg-orange-50"
          title={t("deviceTracking.skinTemperature")}
          value={latestSkin ? `${show(latestSkin.tempObject, 1)}°C` : "—"}
          sub={latestSkin ? `${t("deviceTracking.surfaceNotCore")} · ${clockTime(latestSkin.time)}` : t("deviceTracking.surfaceNotCore")}
        />
        <StatCard
          icon={<Sun className="w-6 h-6 text-sky-500" />}
          tone="bg-sky-50"
          title={t("deviceTracking.airTemperature")}
          value={latestAir ? `${show(latestAir.tempAmbient, 1)}°C` : "—"}
          sub={latestAir ? clockTime(latestAir.time) : undefined}
        />
        <StatCard
          icon={<Heart className="w-6 h-6 text-red-500" />}
          tone="bg-red-50"
          title={t("deviceTracking.pulse")}
          value={
            trustedPulse ? (
              <>
                {Math.round(trustedPulse.bpm as number)} <span className="text-base font-normal text-gray-500">bpm</span>
              </>
            ) : (
              <span className="text-lg font-semibold text-gray-500">
                {anyAnalysed ? t("deviceTracking.noReliablePulse") : t("deviceTracking.pulseNotAnalysed")}
              </span>
            )
          }
          sub={
            trustedPulse
              ? `${fill(t("deviceTracking.confidence"), { value: (trustedPulse.confidence ?? 0).toFixed(2) })} · ${clockTime(trustedPulse.time)}`
              : anyAnalysed
                ? fill(t("deviceTracking.noTrustedOfLast"), { n: pulses.length })
                : undefined
          }
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-purple-500" />}
          tone="bg-purple-50"
          title={t("deviceTracking.lastData")}
          value={<span className="text-2xl">{newest ? timeAgo(newest.time, t) : "—"}</span>}
          sub={
            latestPower ? (
              <span className="inline-flex items-center gap-1">
                {latestPower.charging ? <BatteryCharging className="w-3.5 h-3.5" /> : <Battery className="w-3.5 h-3.5" />}
                {latestPower.batteryVoltage !== null ? `${show(latestPower.batteryVoltage)} V` : ""}
                {latestPower.charging !== null ? ` · ${latestPower.charging ? t("deviceTracking.charging") : t("deviceTracking.notCharging")}` : ""}
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Temperature + accelerometer history */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={card}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t("deviceTracking.temperatureHistory")}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={tempSeries}>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickMargin={10} minTickGap={24} />
              <YAxis domain={["auto", "auto"]} unit="°" width={44} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="skin" name={t("deviceTracking.skinTemperature")} stroke="#2e7d32" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="air" name={t("deviceTracking.airTemperature")} stroke="#1565c0" strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className={hint}>{t("deviceTracking.temperatureHint")}</p>
        </div>

        <div className={card}>
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="text-base font-semibold text-gray-900">{t("deviceTracking.accelHistory")}</h2>
            {newestAccel && (
              <span className="text-sm text-gray-500">
                {t("deviceTracking.totalAcceleration")}: <b className="text-gray-900">{totalG(newestAccel.accelX, newestAccel.accelY, newestAccel.accelZ)?.toFixed(2)} g</b>
              </span>
            )}
          </div>
          {anyAccel ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={accelSeries}>
                  <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickMargin={10} minTickGap={24} />
                  <YAxis unit=" g" width={50} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="total" name={t("deviceTracking.total")} stroke="#222" strokeWidth={2.5} dot={{ r: 2 }} connectNulls={false} />
                  <Line type="monotone" dataKey="x" name="X" stroke="#c62828" strokeWidth={1.2} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="y" name="Y" stroke="#2e7d32" strokeWidth={1.2} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="z" name="Z" stroke="#1565c0" strokeWidth={1.2} dot={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className={hint}>{t("deviceTracking.accelHint")}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500 py-16 text-center">{t("deviceTracking.noAccel")}</p>
          )}
        </div>
      </div>

      {/* Pulse */}
      <div className={card}>
        <h2 className="text-base font-semibold text-gray-900 mb-1">{t("deviceTracking.pulseHistory")}</h2>
        <p className="text-xs text-amber-700 mb-4">{t("deviceTracking.pulseExperimental")}</p>
        {pulses.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">{t("deviceTracking.noBursts")}</p>
        ) : (
          <>
            {anyAnalysed && (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={pulseSeries}>
                    <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickMargin={10} minTickGap={24} />
                    {/* 40-120 bpm by default, widened if a reading falls outside it */}
                    <YAxis domain={[(min: number) => Math.min(40, Math.floor(min)), (max: number) => Math.max(120, Math.ceil(max))]} width={40} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} bpm`, t("deviceTracking.pulse")]} />
                    <Line type="monotone" dataKey="bpm" stroke="#c62828" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className={hint}>{t("deviceTracking.pulseGapsHint")}</p>
              </>
            )}
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-700">
                    <th className="px-4 py-2 font-semibold">{t("deviceTracking.burstReceived")}</th>
                    <th className="px-4 py-2 font-semibold">{t("deviceTracking.pulse")} (bpm)</th>
                    <th className="px-4 py-2 font-semibold">{t("deviceTracking.confidenceHeader")}</th>
                    <th className="px-4 py-2 font-semibold">{t("deviceTracking.method")}</th>
                    <th className="px-4 py-2 font-semibold">{t("deviceTracking.movementMg")}</th>
                    <th className="px-4 py-2 font-semibold">{t("deviceTracking.note")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pulses.slice(0, 10).map((p) => (
                    <tr key={p.time}>
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{new Date(p.time).toLocaleString()}</td>
                      <td className="px-4 py-2">{p.bpm !== null ? p.bpm.toFixed(1) : "—"}</td>
                      <td className="px-4 py-2">{p.confidence !== null ? p.confidence.toFixed(2) : "—"}</td>
                      <td className="px-4 py-2">{p.method ?? "—"}</td>
                      <td className="px-4 py-2">{p.motionMg !== null ? p.motionMg.toFixed(1) : "—"}</td>
                      <td className="px-4 py-2 text-gray-500">{pulseNoteText(p, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {waveform && (
        <div className={card}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {t("deviceTracking.latestBurst")} <span className="font-normal text-gray-500">({new Date(waveform.time).toLocaleString()})</span>
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={waveSeries}>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis dataKey="s" type="number" domain={["dataMin", "dataMax"]} unit=" s" tick={{ fontSize: 12 }} />
              <YAxis unit=" mg" width={60} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(s: any) => `${s} s`} formatter={(v: any, name: any) => [`${v} mg`, name]} />
              <Legend />
              <Line type="monotone" dataKey="mg" name={t("deviceTracking.waveRaw")} stroke="#9e9e9e" strokeWidth={1.2} dot={false} isAnimationActive={false} />
              {waveform.band && (
                <Line type="monotone" dataKey="band" name={t("deviceTracking.waveBand")} stroke="#c62828" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
          <p className={hint}>
            {t("deviceTracking.waveformHint")}
            {waveform.band && ` ${t("deviceTracking.waveformBandHint")}`}
          </p>
        </div>
      )}

      {/* Behaviour */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("deviceTracking.behaviour")}</h2>
        <p className="text-sm text-amber-700 mb-4">{t("deviceTracking.behaviourCaveat")}</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={card}>
            <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="w-4 h-4" /> {t("deviceTracking.rightNow")}
            </h3>
            {latest ? (
              <>
                <div className="my-3 rounded-md px-3 py-2 text-lg font-bold text-white" style={{ background: BEHAVIOUR_STATE_COLORS[latest.state] }}>
                  {stateLabel(latest.state, t)}
                </div>
                <p className="text-sm text-gray-600">{fill(t("deviceTracking.snapshotAt"), { time: new Date(latest.time).toLocaleString() })}</p>
                <p className={hint}>{snapshotWhy(latest, t)}</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-gray-500 mt-3">{t("deviceTracking.noSnapshots")}</p>
                <p className={hint}>{t("deviceTracking.noSnapshotsDesc")}</p>
              </>
            )}
          </div>

          <div className={`${card} lg:col-span-2`}>
            <h3 className="text-sm font-medium text-gray-600 mb-3">{t("deviceTracking.last24h")}</h3>
            {behaviour.snaps.length > 0 ? (
              <>
                <BehaviourTimeline snaps={behaviour.snaps} label={t("deviceTracking.last24hAria")} t={t} />
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm mt-2">
                  {behaviour.budget.map(({ state, percent }) => (
                    <span key={state} className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: BEHAVIOUR_STATE_COLORS[state] }} />
                      {stateLabel(state, t)} <b>{Math.round(percent)}%</b>
                    </span>
                  ))}
                </div>
                <p className={hint}>{fill(t("deviceTracking.timelineHint"), { n: behaviour.n })}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">{t("deviceTracking.noSnapshots24h")}</p>
            )}
          </div>

          <div className={card}>
            <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Compass className="w-4 h-4" /> {t("deviceTracking.orientation")}
            </h3>
            {orient ? (
              <>
                <div className="flex items-center gap-4 mt-3">
                  <TiltBubble nx={orient.nx} ny={orient.ny} label={t("deviceTracking.tiltIndicator")} />
                  <div className="text-sm text-gray-600 leading-7">
                    {t("deviceTracking.pitch")} <b className="text-gray-900">{Math.round(orient.pitch)}°</b>
                    <br />
                    {t("deviceTracking.roll")} <b className="text-gray-900">{Math.round(orient.roll)}°</b>
                    <br />
                    {t("deviceTracking.tilt")} <b className="text-gray-900">{orient.tilt !== null ? `${Math.round(orient.tilt)}°` : "—"}</b>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  {t("deviceTracking.postureLabel")}:{" "}
                  <b className="text-gray-900">
                    {orient.posture.name
                      ? postureLabel(orient.posture.name, t)
                      : anyCalibrated
                        ? t("deviceTracking.postureUnknown")
                        : t("deviceTracking.postureNotCalibrated")}
                  </b>
                </p>
                <p className={hint}>
                  X {orient.g[0].toFixed(2)}, Y {orient.g[1].toFixed(2)}, Z {orient.g[2].toFixed(2)} ({new Date(orient.time).toLocaleString()})
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 mt-3">{t("deviceTracking.noOrientation")}</p>
            )}

            {calibration && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-800">{t("deviceTracking.calibrateTitle")}</p>
                <p className="text-xs text-gray-500 mt-1 mb-3">{t("deviceTracking.calibrateDesc")}</p>
                <div className="space-y-2">
                  {POSTURE_NAMES.map((posture) => (
                    <div key={posture} className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex-1 inline-flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-green-600 hover:text-green-700 disabled:opacity-50"
                        disabled={calibration.busy !== null || !orient}
                        onClick={() => calibration.onCalibrate(posture, "set")}
                      >
                        <span>{fill(t("deviceTracking.calibrateAs"), { posture: postureLabel(posture, t) })}</span>
                        {calibration.busy === posture ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : device.calibrated[posture] ? (
                          <Check className="w-4 h-4 text-green-600" aria-label={t("deviceTracking.calibrated")} />
                        ) : null}
                      </button>
                      {device.calibrated[posture] && (
                        <button
                          type="button"
                          className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                          disabled={calibration.busy !== null}
                          onClick={() => calibration.onCalibrate(posture, "clear")}
                        >
                          {t("deviceTracking.clear")}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>


        {(behaviour.flags.length > 0 || behaviour.notes.length > 0) && (
          <div className={`${card} lg:col-span-2`}>
            <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" /> {t("deviceTracking.checksTitle")}
            </h3>
            <div className="space-y-2">
              {behaviour.flags.map((flag) => (
                <div
                  key={flag.code}
                  className={`flex gap-2 rounded-md px-3 py-2 text-sm ${flag.level === "warn" ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-700"}`}
                >
                  {flag.level === "warn" ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <span>{flagText(flag, t)}</span>
                </div>
              ))}
              {behaviour.notes.map((note) => (
                <div key={note} className="rounded-md px-3 py-2 text-sm bg-amber-50 text-amber-800">
                  {noteText(note, t)}
                </div>
              ))}
            </div>
            <p className={hint}>{t("deviceTracking.checksHint")}</p>
          </div>
        )}
        </div>
      </div>

      {/* Location */}
      {locationPoints.length > 0 ? (
        <div className={card}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            🇷🇼 {animalLabel} {t("farmer.locationTrackingInRwanda")}
          </h2>
          <RwandaMap locationPoints={locationPoints} animalName={animalLabel} />
        </div>
      ) : (
        <div className={`${card} flex gap-3 items-start`}>
          <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600">{gpsMessage}</p>
        </div>
      )}

      {/* Readings */}
      <div className={card}>
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          {t("farmer.recentReadings")} <span className="font-normal text-gray-500 text-sm">({readings.length})</span>
        </h2>
        {readings.length === 0 ? (
          <p className="text-sm text-gray-500">{t("deviceTracking.noReadings")}</p>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200 text-left text-gray-700">
                  <th className="px-4 py-3 font-semibold">{t("farmer.time")}</th>
                  <th className="px-4 py-3 font-semibold">{t("deviceTracking.skinShort")} (°C)</th>
                  <th className="px-4 py-3 font-semibold">{t("deviceTracking.airShort")} (°C)</th>
                  <th className="px-4 py-3 font-semibold">X</th>
                  <th className="px-4 py-3 font-semibold">Y</th>
                  <th className="px-4 py-3 font-semibold">Z</th>
                  <th className="px-4 py-3 font-semibold">{t("farmer.location")}</th>
                  <th className="px-4 py-3 font-semibold">{t("deviceTracking.battery")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {readings.map((r, i) => (
                  <tr key={r.time + i} className={i === 0 ? "bg-green-50/60" : ""}>
                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{new Date(r.time).toLocaleString()}</td>
                    <td className="px-4 py-2">{show(r.tempObject)}</td>
                    <td className="px-4 py-2">{show(r.tempAmbient)}</td>
                    <td className="px-4 py-2">{show(r.accelX, 3)}</td>
                    <td className="px-4 py-2">{show(r.accelY, 3)}</td>
                    <td className="px-4 py-2">{show(r.accelZ, 3)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {r.latitude !== null && r.longitude !== null ? (
                        <span className="text-green-600">{r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {r.batteryVoltage !== null ? `${show(r.batteryVoltage)} V` : "—"}
                      {r.charging && <span className="ml-2 rounded px-1.5 py-0.5 text-xs bg-green-100 text-green-800">{t("deviceTracking.charging")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
