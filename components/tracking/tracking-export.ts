// PDF / CSV / Excel exports of a collar's data, built in the browser. Shared by the
// farmer and vet tracking pages.
import { logPortalExport } from "@/lib/actions"
import type { TrackingDashboardData } from "@/lib/tracking/types"
import { fill, stateLabel, totalG } from "./format"

type T = (key: string) => string

export interface TrackingExportMeta {
  animalLabel: string
  generatedBy: string
  /** Vet portal: whose animal this is. */
  patient?: { name: string; phone?: string }
  withLogo?: boolean
  fileSlug: string
}

const today = () => new Date().toISOString().split("T")[0]
const round2 = (v: number) => Math.round(v * 100) / 100
const orNA = (v: number | null | undefined, t: T) => (v === null || v === undefined ? t("trackingReport.notAvailable") : String(round2(v)))

function headline(data: TrackingDashboardData, t: T) {
  const skin = data.readings.find((r) => r.tempObject !== null && r.tempObject !== 0) ?? null
  const air = data.readings.find((r) => r.tempAmbient !== null) ?? null
  const pulse = data.pulses.find((p) => p.bpm !== null) ?? null
  const located = data.readings.filter((r) => r.latitude !== null && r.longitude !== null).length
  return {
    skin: skin ? `${round2(skin.tempObject as number)}°C` : t("trackingReport.notAvailable"),
    air: air ? `${round2(air.tempAmbient as number)}°C` : t("trackingReport.notAvailable"),
    pulse: pulse
      ? `${Math.round(pulse.bpm as number)} bpm`
      : data.pulses.some((p) => p.analysed)
        ? t("deviceTracking.noReliablePulse")
        : t("deviceTracking.pulseNotAnalysed"),
    state: data.behaviour.latest ? stateLabel(data.behaviour.latest.state, t) : t("trackingReport.notAvailable"),
    coverage: data.readings.length ? `${Math.round((100 * located) / data.readings.length)}%` : "0%",
  }
}

export async function exportTrackingPdf(data: TrackingDashboardData, meta: TrackingExportMeta, t: T) {
  const jsPDF = (await import("jspdf")).default
  const doc = new jsPDF()

  let titleX = 15
  if (meta.withLogo) {
    try {
      const logo = new Image()
      logo.crossOrigin = "anonymous"
      logo.src = "/logo/Vet print.png"
      await new Promise((resolve, reject) => {
        logo.onload = resolve
        logo.onerror = reject
      })
      doc.addImage(logo, "PNG", 15, 8, 35, 24)
      titleX = 52
    } catch {
      // no logo - the report still works without it
    }
  }

  doc.setTextColor(17, 24, 39)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(t("farmer.animalHealthMonitoringReport"), titleX, 20)
  if (titleX !== 15) {
    doc.setTextColor(75, 85, 99)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text("Vettrack", titleX, 28)
  }
  doc.setDrawColor(226, 232, 240)
  doc.line(15, 38, 195, 38)

  doc.setTextColor(55, 65, 81)
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  const animalLine = `${t("farmer.animal")}: ${meta.animalLabel}`
  doc.text(meta.patient ? `${animalLine} — ${t("vet.patient")}: ${meta.patient.name}` : animalLine, 20, 55)
  doc.text(`${t("farmer.generated")}: ${new Date().toLocaleString()}`, 20, 65)
  doc.text(`${t("farmer.genName")}: ${meta.generatedBy}`, 20, 75)
  doc.text(`${t("deviceTracking.deviceId")}: ${data.device.deviceId}`, 20, 85)

  const h = headline(data, t)
  doc.setFillColor(248, 250, 252)
  doc.rect(15, 95, 180, 62, "F")
  doc.setDrawColor(226, 232, 240)
  doc.rect(15, 95, 180, 62, "S")
  doc.setTextColor(22, 163, 74)
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text(t("farmer.healthSummary"), 20, 106)
  doc.setTextColor(55, 65, 81)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`${t("deviceTracking.skinTemperature")}: ${h.skin}`, 20, 116)
  doc.text(`${t("deviceTracking.airTemperature")}: ${h.air}`, 20, 124)
  doc.text(`${t("deviceTracking.pulse")}: ${h.pulse}`, 20, 132)
  doc.text(`${t("deviceTracking.behaviourNow")}: ${h.state}`, 20, 140)
  doc.text(`${t("farmer.locationCoverage")}: ${h.coverage}`, 20, 148)

  // Keep the footer clear of a printer's non-printable bottom margin.
  const pageHeight = doc.internal.pageSize.height
  const footerHeight = 25
  const footerTop = pageHeight - footerHeight - 12
  const maxContentY = footerTop - 8

  doc.setTextColor(22, 163, 74)
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text(t("farmer.recentReadings"), 20, 172)
  doc.setTextColor(55, 65, 81)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  let y = 182
  for (const r of data.readings.slice(0, 15).reverse()) {
    if (y > maxContentY) {
      doc.addPage()
      y = 20
    }
    doc.text(
      fill(t("deviceTracking.pdfReadingLine"), {
        time: new Date(r.time).toLocaleString(),
        skin: orNA(r.tempObject, t),
        air: orNA(r.tempAmbient, t),
        g: orNA(totalG(r.accelX, r.accelY, r.accelZ), t),
      }),
      20,
      y
    )
    y += 7
  }

  doc.setFillColor(248, 250, 252)
  doc.rect(0, footerTop, 210, footerHeight, "F")
  const centerX = doc.internal.pageSize.getWidth() / 2
  const baseY = footerTop + 8
  doc.setTextColor(55, 65, 81)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(t("trackingReport.contactVettrackSupport"), centerX, baseY, { align: "center" })
  doc.text(t("trackingReport.emailLine").replace("{email}", "info@vettrack.rw"), centerX, baseY + 5, { align: "center" })
  doc.text(t("trackingReport.phoneLine").replace("{phone}", "+250 78 072 1800"), centerX, baseY + 10, { align: "center" })
  doc.textWithLink(t("trackingReport.websiteLine").replace("{site}", "www.vettrack.rw"), centerX, baseY + 15, {
    align: "center",
    url: "https://www.vettrack.rw",
  })
  doc.text(t("pdf.rights").replace("{year}", String(new Date().getFullYear())), centerX, baseY + 20, { align: "center" })

  doc.save(`health-report-${meta.fileSlug}-${today()}.pdf`)
  logPortalExport("Health tracking report", "PDF")
}

function readingRows(data: TrackingDashboardData, t: T) {
  return data.readings.map((r) => ({
    [t("farmer.timestamp")]: new Date(r.time).toLocaleString(),
    [`${t("deviceTracking.skinTemperature")} (°C)`]: r.tempObject ?? "",
    [`${t("deviceTracking.airTemperature")} (°C)`]: r.tempAmbient ?? "",
    "Accel X (g)": r.accelX ?? "",
    "Accel Y (g)": r.accelY ?? "",
    "Accel Z (g)": r.accelZ ?? "",
    [`${t("deviceTracking.totalAcceleration")} (g)`]: totalG(r.accelX, r.accelY, r.accelZ) ?? "",
    [t("farmer.latitude")]: r.latitude ?? "",
    [t("farmer.longitude")]: r.longitude ?? "",
    [`${t("deviceTracking.battery")} (V)`]: r.batteryVoltage ?? "",
    [t("deviceTracking.charging")]: r.charging === null ? "" : r.charging ? t("farmer.yes") : t("farmer.no"),
  }))
}

export function exportTrackingCsv(data: TrackingDashboardData, meta: TrackingExportMeta, t: T) {
  const rows = readingRows(data, t)
  const headers = rows.length ? Object.keys(rows[0]) : []
  const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [headers.map(escape).join(","), ...rows.map((row) => Object.values(row).map(escape).join(","))].join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `health-data-${meta.fileSlug}-${today()}.csv`
  link.click()
  URL.revokeObjectURL(url)
  logPortalExport("Health tracking data", "CSV")
}

export async function exportTrackingExcel(data: TrackingDashboardData, meta: TrackingExportMeta, t: T) {
  const XLSX = await import("xlsx")
  const h = headline(data, t)
  const info: Record<string, unknown> = {
    [t("farmer.genName")]: meta.generatedBy,
    ...(meta.patient ? { [t("vet.patient")]: meta.patient.name, [t("animal.phone")]: meta.patient.phone ?? "" } : {}),
    [t("farmer.animal")]: meta.animalLabel,
    [t("deviceTracking.deviceId")]: data.device.deviceId,
    [t("farmer.reportDate")]: new Date().toLocaleString(),
    [t("deviceTracking.skinTemperature")]: h.skin,
    [t("deviceTracking.airTemperature")]: h.air,
    [t("deviceTracking.pulse")]: h.pulse,
    [t("deviceTracking.behaviourNow")]: h.state,
    [t("farmer.locationCoverage")]: h.coverage,
    [t("farmer.totalRecords")]: data.readings.length,
  }
  const pulses = data.pulses.map((p) => ({
    [t("deviceTracking.burstReceived")]: new Date(p.time).toLocaleString(),
    [`${t("deviceTracking.pulse")} (bpm)`]: p.bpm ?? "",
    [t("deviceTracking.confidenceHeader")]: p.confidence ?? "",
    [t("deviceTracking.method")]: p.method ?? "",
    [t("deviceTracking.movementMg")]: p.motionMg !== null ? Math.round(p.motionMg * 100) / 100 : "",
    [t("deviceTracking.note")]: p.analysed ? p.notes ?? "" : t("deviceTracking.notAnalysed"),
  }))
  const snapshots = data.behaviour.snaps.map((s) => ({
    [t("farmer.timestamp")]: new Date(s.time).toLocaleString(),
    [t("deviceTracking.behaviour")]: stateLabel(s.state, t),
    [t("deviceTracking.movementMg")]: s.features.actMg,
    "Chewing rhythm (mg)": s.features.chewMg,
    "Steps (mg)": s.features.stepMg,
    [t("deviceTracking.postureLabel")]: s.posture ? t(`deviceTracking.posture.${s.posture}`) : "",
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([info]), t("farmer.animalInfo").slice(0, 31))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(readingRows(data, t)), t("farmer.healthData").slice(0, 31))
  if (pulses.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pulses), t("deviceTracking.pulse").slice(0, 31))
  if (snapshots.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshots), t("deviceTracking.behaviour").slice(0, 31))
  XLSX.writeFile(wb, `health-report-${meta.fileSlug}-${today()}.xlsx`)
  logPortalExport("Health tracking report", "Excel")
}
