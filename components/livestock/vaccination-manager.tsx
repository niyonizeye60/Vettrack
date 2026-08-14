"use client"

import { useState, useEffect, useMemo } from "react"
import { getDoctorsList, logPortalExport } from "@/lib/actions"
import type { RecordCapabilities } from "@/components/livestock/capabilities"
import { canModify } from "@/components/livestock/capabilities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ShieldPlus, Plus, Pencil, Trash2, History, BarChart3, CalendarClock, AlertCircle, Users, DollarSign, Download, FileText } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useLanguage } from "@/contexts/LanguageContext"

type SubjectType = "animal" | "calf"

/**
 * An animal or a calf, as /api/farm-animals?includeCalves=1 returns them. They live in
 * separate collections with separate id spaces, so nothing here keys on `_id` alone -
 * see subjectKey() below.
 */
interface Subject {
  kind: SubjectType
  _id: string
  name: string
  type: string
  insuranceId?: string | null
  earTagId?: string | null
  status?: string | null
  birthDate?: string | null
  motherName?: string | null
}
interface Vet { _id: string; name: string; specialization: string }
interface VaccinationRecord {
  _id: string
  subjectType: SubjectType
  subjectId: string
  subjectName: string | null
  vaccineName: string
  diseasePrevented: string | null
  vaccineType: string | null
  date: string
  dose: number | null
  doseUnit: string | null
  route: string | null
  site: string | null
  batchNumber: string | null
  manufacturer: string | null
  /** Stored as YYYY-MM - a vaccine vial expires by month, not by day. */
  expiryDate: string | null
  vaccinePrice: number | null
  vetPrice: number | null
  vaccinator: string | null
  nextVaccinationDate: string | null
  notes: string | null
  createdById?: string | null
  createdByName?: string | null
}

interface VaccinationManagerProps {
  /** The farm these records belong to - the owner's user id. */
  farmerId: string
  can: RecordCapabilities
  /** Hide the page title when the host page already provides one. */
  showHeader?: boolean
}

const VACCINE_TYPES = ["Inactivated", "Live attenuated", "Toxoid", "Subunit", "Recombinant", "Vector", "Other"]
const ROUTES = ["Subcutaneous", "Intramuscular", "Intranasal", "Oral", "Intradermal", "Intravenous", "Other"]
const DOSE_UNITS = ["ml", "cc", "doses"]
const SITES = ["Neck", "Shoulder", "Rump / Hip", "Thigh", "Ear base", "Brisket", "Tail fold"]

// Selecting one of these fills in the disease it prevents - the pairing is a property
// of the vaccine, not something the farmer should have to remember on every dose.
const COMMON_VACCINES: { name: string; prevents: string; type?: string }[] = [
  { name: "FMD Vaccine", prevents: "Foot-and-Mouth Disease", type: "Inactivated" },
  { name: "Lumpy Skin Disease Vaccine", prevents: "Lumpy Skin Disease", type: "Live attenuated" },
  { name: "Brucella S19", prevents: "Brucellosis", type: "Live attenuated" },
  { name: "Blackleg Vaccine", prevents: "Blackleg", type: "Toxoid" },
  { name: "Anthrax Spore Vaccine", prevents: "Anthrax", type: "Live attenuated" },
  { name: "East Coast Fever (ITM)", prevents: "East Coast Fever", type: "Live attenuated" },
  { name: "Rabies Vaccine", prevents: "Rabies", type: "Inactivated" },
  { name: "Newcastle Disease Vaccine", prevents: "Newcastle Disease", type: "Live attenuated" },
  { name: "PPR Vaccine", prevents: "Peste des Petits Ruminants", type: "Live attenuated" },
  { name: "CBPP Vaccine", prevents: "Contagious Bovine Pleuropneumonia", type: "Live attenuated" },
]

const MANUFACTURERS = ["MSD Animal Health", "Zoetis", "Boehringer Ingelheim", "Ceva", "Hester Biosciences", "KEVEVAPI", "Botswana Vaccine Institute"]

const TYPE_STYLES: Record<string, string> = {
  Inactivated: "bg-blue-50 text-blue-700 border-blue-200",
  "Live attenuated": "bg-green-50 text-green-700 border-green-200",
  Toxoid: "bg-purple-50 text-purple-700 border-purple-200",
  Subunit: "bg-amber-50 text-amber-700 border-amber-200",
  Recombinant: "bg-sky-50 text-sky-700 border-sky-200",
  Vector: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Other: "bg-gray-50 text-gray-700 border-gray-200",
}

/** Calves still on the farm. Sold and deceased ones stay out of the picker, but their
 *  existing records remain in History. */
const VACCINABLE_CALF_STATUSES = ["active", "weaned"]

const today = new Date().toISOString().split("T")[0]

/**
 * The one identifier that is safe to compare, filter and group on.
 *
 * An animal `_id` and a calf `_id` are both Mongo ObjectIds from different
 * collections, so an id on its own is ambiguous. Everything that selects, filters or
 * buckets a subject in this component goes through this composite key.
 */
const subjectKey = (type: SubjectType, id: string) => `${type}:${id}`
const recordKey = (r: VaccinationRecord) => subjectKey(r.subjectType, r.subjectId)
const parseSubjectKey = (key: string) => {
  const [type, ...rest] = key.split(":")
  return { subjectType: (type === "calf" ? "calf" : "animal") as SubjectType, subjectId: rest.join(":") }
}

/** Whole days from today to `date`; negative when the date has passed. */
const daysUntil = (date: string) =>
  Math.ceil((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))

/** A vial expiring in month YYYY-MM is usable through that whole month. */
const expiredAt = (expiry: string | null, givenOn: string) =>
  !!expiry && !!givenOn && expiry < givenOn.slice(0, 7)

/**
 * What one dose cost the farm: the vaccine plus the vaccinator's fee. The same sum
 * is what app/api/reports/general bills to "Vaccination Costs" in the P&L, so the
 * two must stay in step.
 */
const recordCost = (r: VaccinationRecord) => (r.vaccinePrice || 0) + (r.vetPrice || 0)

function DueBadge({ dueDate }: { dueDate: string }) {
  const days = daysUntil(dueDate)
  const tone =
    days < 0 ? "bg-red-50 text-red-600 border-red-200"
      : days <= 30 ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-green-50 text-green-700 border-green-200"
  const label =
    days < 0 ? `${Math.abs(days)}d overdue`
      : days === 0 ? "Due today"
        : `${days}d left`
  return (
    <div className="text-center">
      <span className="text-xs text-gray-500 block">{dueDate}</span>
      <Badge variant="outline" className={`${tone} text-[10px] mt-0.5`}>{label}</Badge>
    </div>
  )
}

export default function VaccinationManager({ farmerId, can, showHeader = true }: VaccinationManagerProps) {
  const { t } = useLanguage()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [vets, setVets] = useState<Vet[]>([])
  const [records, setRecords] = useState<VaccinationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editRecord, setEditRecord] = useState<VaccinationRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  // A user who can neither create nor edit has nothing to do on the Record tab, so it
  // is hidden and History becomes the landing tab.
  const showRecordTab = can.create || can.update
  const [activeTab, setActiveTab] = useState(showRecordTab ? "record" : "history")
  // The Record tab doubles as the edit form, so a user with update-but-not-create
  // still needs it - but must not be able to submit it as a new record.
  const canSubmitForm = editRecord ? can.update : can.create

  // Form fields. The subject is held as a composite "type:id" key so one picker can
  // offer both collections without their ids ever being confused.
  const [subjectSel, setSubjectSel] = useState("")
  const [insuranceId, setInsuranceId] = useState("")
  const [earTagId, setEarTagId] = useState("")
  const [vaccineName, setVaccineName] = useState("")
  const [diseasePrevented, setDiseasePrevented] = useState("")
  const [vaccineType, setVaccineType] = useState("")
  const [date, setDate] = useState(today)
  const [dose, setDose] = useState("")
  const [doseUnit, setDoseUnit] = useState("ml")
  const [route, setRoute] = useState("")
  const [site, setSite] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [manufacturer, setManufacturer] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [vaccinePrice, setVaccinePrice] = useState("")
  const [vetPrice, setVetPrice] = useState("")
  // A delegated vet is the vaccinator, so the field starts as - and stays - their own
  // name. The farmer instead picks from the roster below.
  const [vaccinator, setVaccinator] = useState(can.isDelegate ? can.currentUserName : "")
  const [nextVaccinationDate, setNextVaccinationDate] = useState("")
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filters
  const [filterSubject, setFilterSubject] = useState("")
  const [filterVaccine, setFilterVaccine] = useState("")
  const [filterMonth, setFilterMonth] = useState("")

  useEffect(() => {
    async function init() {
      // Animals and calves come from the guarded endpoint rather than the getAnimals()
      // server action or /api/calves, neither of which honours a vet's grant.
      const subjectsRes = await fetch(`/api/farm-animals?farmerId=${farmerId}&module=vaccination&includeCalves=1`)
      const subjectsData = subjectsRes.ok ? await subjectsRes.json() : []
      setSubjects(Array.isArray(subjectsData) ? subjectsData : [])
      // Only the farmer picks a vaccinator from the roster. Skipping this for a
      // delegated vet avoids pulling every doctor's contact details into a portal
      // that has no use for them.
      if (!can.isDelegate) setVets(await getDoctorsList())
      await fetchRecords(farmerId)
      setLoading(false)
    }
    init()
  }, [farmerId])

  const fetchRecords = async (id: string) => {
    const res = await fetch(`/api/vaccination?farmerId=${id}`)
    const data = await res.json()
    setRecords(Array.isArray(data) ? data : [])
  }

  const vaccineNames = useMemo(
    () => Array.from(new Set([...COMMON_VACCINES.map(v => v.name), ...records.map(r => r.vaccineName)].filter(Boolean))).sort(),
    [records]
  )

  const subjectByKey = useMemo(
    () => new Map(subjects.map(s => [subjectKey(s.kind, s._id), s])),
    [subjects]
  )
  const selectedSubject = subjectSel ? subjectByKey.get(subjectSel) : undefined
  const isCalfSelected = selectedSubject?.kind === "calf"

  /**
   * Picker options, animals first then calves, each under its own heading so the two
   * never read as one flat list. A sold or deceased calf is left out - it can no
   * longer be vaccinated - while still appearing in the filter list below so its past
   * records stay reachable.
   */
  const subjectOptions = useMemo(() => {
    const animalOpts = subjects
      .filter(s => s.kind === "animal")
      .map(s => ({ value: subjectKey(s.kind, s._id), label: `${s.name} (${s.type})`, group: t("farmer.animals") }))
    const calfOpts = subjects
      .filter(s => s.kind === "calf" && VACCINABLE_CALF_STATUSES.includes(s.status || "active"))
      // Calves have no ear tag to tell two "Calf 1"s apart, so the dam disambiguates.
      .map(s => ({
        value: subjectKey(s.kind, s._id),
        label: s.motherName ? `${s.name} — dam: ${s.motherName}` : s.name,
        group: t("farmer.calves"),
      }))
    return [...animalOpts, ...calfOpts]
  }, [subjects, t])

  const filterSubjectOptions = useMemo(() => [
    { value: "all", label: t("farmer.allAnimals") },
    ...subjects.map(s => ({
      value: subjectKey(s.kind, s._id),
      label: s.name,
      group: s.kind === "calf" ? t("farmer.calves") : t("farmer.animals"),
    })),
  ], [subjects, t])

  const filteredRecords = useMemo(() => {
    let data = [...records]
    if (filterSubject) data = data.filter(r => recordKey(r) === filterSubject)
    if (filterVaccine) data = data.filter(r => r.vaccineName === filterVaccine)
    if (filterMonth) data = data.filter(r => r.date.startsWith(filterMonth))
    return data
  }, [records, filterSubject, filterVaccine, filterMonth])

  /**
   * The live booster schedule: for each subject+vaccine pairing only the most recent
   * dose carries a due date. A follow-up dose supersedes the schedule the previous
   * one set, so an already-administered booster can never show up as overdue. The key
   * includes the subject type, so a calf and an animal sharing an id cannot collide.
   */
  const schedule = useMemo(() => {
    const latest = new Map<string, VaccinationRecord>()
    for (const r of records) {
      if (!r.subjectId || !r.nextVaccinationDate) continue
      const key = `${recordKey(r)}::${(r.vaccineName || "").toLowerCase()}`
      const prev = latest.get(key)
      if (!prev || r.date > prev.date) latest.set(key, r)
    }
    return Array.from(latest.values())
      .map(r => ({ record: r, dueDate: r.nextVaccinationDate as string, days: daysUntil(r.nextVaccinationDate as string) }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [records])

  const dueSoon = useMemo(() => schedule.filter(s => s.days >= 0 && s.days <= 30), [schedule])
  const overdue = useMemo(() => schedule.filter(s => s.days < 0), [schedule])
  const animalsVaccinated = useMemo(
    () => new Set(records.filter(r => r.subjectId).map(recordKey)).size,
    [records]
  )
  const calvesVaccinated = useMemo(
    () => new Set(records.filter(r => r.subjectType === "calf" && r.subjectId).map(recordKey)).size,
    [records]
  )
  const totalCost = useMemo(() => records.reduce((s, r) => s + recordCost(r), 0), [records])

  const handleSubjectChange = (val: string) => {
    setSubjectSel(val)
    const selected = subjectByKey.get(val)
    setInsuranceId(selected?.insuranceId || "")
    setEarTagId(selected?.earTagId || "")
  }

  const handleVaccineChange = (val: string) => {
    setVaccineName(val)
    const known = COMMON_VACCINES.find(v => v.name.toLowerCase() === val.trim().toLowerCase())
    if (known) {
      setDiseasePrevented(known.prevents)
      if (known.type) setVaccineType(known.type)
    }
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!subjectSel) e.subject = "Select an animal or calf"
    if (!vaccineName.trim()) e.vaccineName = "Enter the vaccine name"
    if (!date) e.date = "Select the date given"
    if (dose && Number(dose) <= 0) e.dose = "Enter a valid dose"
    if (vaccinePrice && Number(vaccinePrice) < 0) e.vaccinePrice = "Enter a valid price"
    if (vetPrice && Number(vetPrice) < 0) e.vetPrice = "Enter a valid fee"
    if (nextVaccinationDate && nextVaccinationDate < date) e.nextVaccinationDate = "Next dose cannot be before the date given"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const resetForm = () => {
    setSubjectSel(""); setInsuranceId(""); setEarTagId("")
    setVaccineName(""); setDiseasePrevented(""); setVaccineType("")
    setDate(today); setDose(""); setDoseUnit("ml"); setRoute(""); setSite("")
    setBatchNumber(""); setManufacturer(""); setExpiryDate("")
    setVaccinePrice(""); setVetPrice("")
    setVaccinator(can.isDelegate ? can.currentUserName : "")
    setNextVaccinationDate(""); setNotes("")
    setErrors({}); setEditRecord(null)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    const { subjectType, subjectId } = parseSubjectKey(subjectSel)
    const body = {
      farmerId,
      subjectType,
      subjectId,
      subjectName: selectedSubject?.name || null,
      vaccineName: vaccineName.trim(),
      diseasePrevented, vaccineType, date,
      dose, doseUnit, route, site,
      batchNumber, manufacturer, expiryDate,
      vaccinePrice, vetPrice,
      vaccinator, nextVaccinationDate, notes,
    }

    if (editRecord) {
      await fetch("/api/vaccination", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editRecord._id, ...body }) })
    } else {
      await fetch("/api/vaccination", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchRecords(farmerId)
    resetForm()
    setSaving(false)
  }

  const handleEdit = (r: VaccinationRecord) => {
    setEditRecord(r)
    const key = recordKey(r)
    setSubjectSel(key)
    setInsuranceId(subjectByKey.get(key)?.insuranceId || "")
    setEarTagId(subjectByKey.get(key)?.earTagId || "")
    setVaccineName(r.vaccineName || "")
    setDiseasePrevented(r.diseasePrevented || "")
    setVaccineType(r.vaccineType || "")
    setDate(r.date)
    setDose(r.dose != null ? String(r.dose) : "")
    setDoseUnit(r.doseUnit || "ml")
    setRoute(r.route || "")
    setSite(r.site || "")
    setBatchNumber(r.batchNumber || "")
    setManufacturer(r.manufacturer || "")
    setExpiryDate(r.expiryDate || "")
    setVaccinePrice(r.vaccinePrice != null ? String(r.vaccinePrice) : "")
    setVetPrice(r.vetPrice != null ? String(r.vetPrice) : "")
    setVaccinator(r.vaccinator || "")
    setNextVaccinationDate(r.nextVaccinationDate || "")
    setNotes(r.notes || "")
    setActiveTab("record")
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/vaccination?id=${id}`, { method: "DELETE" })
    await fetchRecords(farmerId)
    setDeleteId(null)
  }

  /** Per-vaccine rollup used by both the Reports tab and the exports. */
  const summarizeByVaccine = (list: VaccinationRecord[]) => {
    const map: Record<string, { name: string; doses: number; animals: Set<string>; lastDate: string; prevents: string; cost: number }> = {}
    list.forEach(r => {
      const key = r.vaccineName || "—"
      if (!map[key]) map[key] = { name: key, doses: 0, animals: new Set(), lastDate: "", prevents: r.diseasePrevented || "—", cost: 0 }
      map[key].doses += 1
      map[key].cost += recordCost(r)
      if (r.subjectId) map[key].animals.add(recordKey(r))
      if (!map[key].lastDate || r.date > map[key].lastDate) map[key].lastDate = r.date
      if (r.diseasePrevented) map[key].prevents = r.diseasePrevented
    })
    return Object.values(map)
      .map(v => ({ name: v.name, doses: v.doses, animals: v.animals.size, lastDate: v.lastDate, prevents: v.prevents, cost: v.cost }))
      .sort((a, b) => b.doses - a.doses)
  }

  const vaccineSummary = useMemo(() => summarizeByVaccine(records), [records])

  const animalSummary = useMemo(() => {
    const map: Record<string, { name: string; doses: number }> = {}
    records.forEach(r => {
      const key = recordKey(r)
      // Calves are labelled in the chart so two same-named subjects stay distinct.
      if (!map[key]) map[key] = { name: `${r.subjectName || "—"}${r.subjectType === "calf" ? " (calf)" : ""}`, doses: 0 }
      map[key].doses += 1
    })
    return Object.values(map).sort((a, b) => b.doses - a.doses)
  }, [records])

  const getEarTag = (r: VaccinationRecord) => subjectByKey.get(recordKey(r))?.earTagId || "—"

  // Export
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportSubjectFilter, setExportSubjectFilter] = useState("")

  const exportRecords = useMemo(
    () => exportSubjectFilter ? records.filter(r => recordKey(r) === exportSubjectFilter) : records,
    [records, exportSubjectFilter]
  )
  const exportSummary = useMemo(() => summarizeByVaccine(exportRecords), [exportRecords])
  const exportTotalCost = useMemo(() => exportRecords.reduce((s, r) => s + recordCost(r), 0), [exportRecords])
  const exportSubjectName = exportSubjectFilter ? subjectByKey.get(exportSubjectFilter)?.name || "" : ""

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape" })

      // Header
      doc.setTextColor(22, 163, 74)
      doc.setFontSize(18); doc.setFont("helvetica", "bold")
      doc.text("VETTRACK", 15, 20)
      doc.setTextColor(17, 24, 39)
      doc.setFontSize(16); doc.setFont("helvetica", "bold")
      doc.text(exportSubjectName ? `${t("farmer.vaccinationReportTitle")} — ${exportSubjectName}` : t("farmer.vaccinationReportTitle"), 55, 18)
      doc.setTextColor(75, 85, 99)
      doc.setFontSize(10); doc.setFont("helvetica", "normal")
      doc.text("NTDM Vettrack", 55, 27)
      doc.setDrawColor(226, 232, 240)
      doc.line(0, 38, 297, 38)

      // Meta
      doc.setTextColor(55, 65, 81); doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 50)
      doc.text(`Generated by: ${can.currentUserName || "Unknown"}`, 15, 58)

      // Summary box
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240)
      doc.rect(15, 66, 267, 22, "FD")
      doc.setTextColor(22, 163, 74); doc.setFontSize(11); doc.setFont("helvetica", "bold")
      doc.text("Summary", 20, 76)
      doc.setTextColor(55, 65, 81); doc.setFont("helvetica", "normal"); doc.setFontSize(10)
      doc.text(`Doses: ${exportRecords.length}`, 20, 84)
      doc.text(`Vaccines: ${exportSummary.length}`, 70, 84)
      doc.text(`Total Cost: RWF ${exportTotalCost.toLocaleString()}`, 120, 84)
      doc.text(`Due within 30 days: ${dueSoon.length}`, 195, 84)
      doc.text(`Overdue: ${overdue.length}`, 250, 84)

      // ── Column layout (landscape = 297mm wide, margins 15 each → 267 usable) ──
      const cols = {
        date: { x: 18, width: 20 },
        animal: { x: 40, width: 22 },
        vaccine: { x: 64, width: 30 },
        prevents: { x: 96, width: 30 },
        type: { x: 128, width: 20 },
        dose: { x: 150, width: 13 },
        route: { x: 165, width: 19 },
        site: { x: 186, width: 15 },
        batch: { x: 203, width: 18 },
        expiry: { x: 223, width: 15 },
        cost: { x: 240, width: 18 },
        next: { x: 260, width: 20 },
      }

      let y = 100

      const drawHeader = () => {
        doc.setFillColor(22, 163, 74)
        doc.rect(15, y - 6, 267, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7.5); doc.setFont("helvetica", "bold")
        doc.text("Date", cols.date.x, y)
        doc.text("Animal", cols.animal.x, y)
        doc.text("Vaccine", cols.vaccine.x, y)
        doc.text("Prevents", cols.prevents.x, y)
        doc.text("Type", cols.type.x, y)
        doc.text("Dose", cols.dose.x, y)
        doc.text("Route", cols.route.x, y)
        doc.text("Site", cols.site.x, y)
        doc.text("Batch/Lot", cols.batch.x, y)
        doc.text("Expiry", cols.expiry.x, y)
        doc.text("Cost", cols.cost.x, y)
        doc.text("Next", cols.next.x, y)
        doc.setFont("helvetica", "normal")
        y += 8
      }

      drawHeader()

      exportRecords.forEach((r, i) => {
        // Calves are marked inline rather than given their own column - the detail
        // table is already 12 columns wide on landscape A4.
        const animalLines = doc.splitTextToSize(
          `${r.subjectName || "—"}${r.subjectType === "calf" ? " (calf)" : ""}`,
          cols.animal.width
        )
        const vaccineLines = doc.splitTextToSize(r.vaccineName || "—", cols.vaccine.width)
        const preventsLines = doc.splitTextToSize(r.diseasePrevented || "—", cols.prevents.width)
        const typeLines = doc.splitTextToSize(r.vaccineType || "—", cols.type.width)
        const routeLines = doc.splitTextToSize(r.route || "—", cols.route.width)
        const siteLines = doc.splitTextToSize(r.site || "—", cols.site.width)
        const batchLines = doc.splitTextToSize(r.batchNumber || "—", cols.batch.width)

        const rowHeight = Math.max(
          animalLines.length, vaccineLines.length, preventsLines.length,
          typeLines.length, routeLines.length, siteLines.length, batchLines.length, 1
        ) * 5 + 4

        if (y + rowHeight > 190) { doc.addPage(); y = 20; drawHeader() }

        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, 267, rowHeight, "F") }
        doc.setDrawColor(226, 232, 240); doc.rect(15, y - 4, 267, rowHeight)

        doc.setFontSize(7.5); doc.setTextColor(55, 65, 81)
        doc.text(new Date(r.date).toLocaleDateString(), cols.date.x, y)
        doc.text(animalLines, cols.animal.x, y)
        doc.setTextColor(22, 163, 74)
        doc.text(vaccineLines, cols.vaccine.x, y)
        doc.setTextColor(55, 65, 81)
        doc.text(preventsLines, cols.prevents.x, y)
        doc.text(typeLines, cols.type.x, y)
        doc.text(r.dose != null ? `${r.dose}${r.doseUnit ? ` ${r.doseUnit}` : ""}` : "—", cols.dose.x, y)
        doc.text(routeLines, cols.route.x, y)
        doc.text(siteLines, cols.site.x, y)
        doc.text(batchLines, cols.batch.x, y)

        // An expired vial at the time of administration is the single most important
        // thing a printed record can flag.
        if (expiredAt(r.expiryDate, r.date)) doc.setTextColor(220, 38, 38)
        doc.text(r.expiryDate || "—", cols.expiry.x, y)

        doc.setTextColor(217, 119, 6)
        doc.text(recordCost(r) > 0 ? recordCost(r).toLocaleString() : "—", cols.cost.x, y)

        if (r.nextVaccinationDate) {
          const d = daysUntil(r.nextVaccinationDate)
          doc.setTextColor(...(d < 0 ? [220, 38, 38] : d <= 30 ? [217, 119, 6] : [22, 163, 74]) as [number, number, number])
        } else {
          doc.setTextColor(156, 163, 175)
        }
        doc.text(r.nextVaccinationDate || "—", cols.next.x, y)

        y += rowHeight
      })

      // ── Second table: per-vaccine summary ──────────────────────────────
      y += 16
      if (y > 165) { doc.addPage(); y = 20 }

      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(55, 65, 81)
      doc.text("Summary per Vaccine", 15, y - 4)
      y += 6

      const sumCols = {
        vaccine: { x: 18, width: 58 },
        prevents: { x: 80, width: 64 },
        doses: { x: 148, width: 16 },
        animals: { x: 168, width: 20 },
        cost: { x: 192, width: 30 },
        last: { x: 226, width: 30 },
      }

      doc.setFillColor(22, 163, 74)
      doc.rect(15, y - 6, 267, 8, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8); doc.setFont("helvetica", "bold")
      doc.text("Vaccine", sumCols.vaccine.x, y)
      doc.text("Disease Prevented", sumCols.prevents.x, y)
      doc.text("Doses", sumCols.doses.x, y)
      doc.text("Animals", sumCols.animals.x, y)
      doc.text("Cost (RWF)", sumCols.cost.x, y)
      doc.text("Last Given", sumCols.last.x, y)
      doc.setFont("helvetica", "normal")
      y += 8

      exportSummary.forEach((v, i) => {
        const vaccineLines = doc.splitTextToSize(v.name, sumCols.vaccine.width)
        const preventsLines = doc.splitTextToSize(v.prevents, sumCols.prevents.width)
        const rowHeight = Math.max(vaccineLines.length, preventsLines.length, 1) * 5 + 4

        if (y + rowHeight > 190) { doc.addPage(); y = 20 }

        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, 267, rowHeight, "F") }
        doc.setDrawColor(226, 232, 240); doc.rect(15, y - 4, 267, rowHeight)
        doc.setFontSize(8); doc.setTextColor(55, 65, 81)
        doc.text(vaccineLines, sumCols.vaccine.x, y)
        doc.text(preventsLines, sumCols.prevents.x, y)
        doc.setTextColor(22, 163, 74)
        doc.text(String(v.doses), sumCols.doses.x, y)
        doc.setTextColor(55, 65, 81)
        doc.text(String(v.animals), sumCols.animals.x, y)
        doc.setTextColor(217, 119, 6)
        doc.text(v.cost > 0 ? v.cost.toLocaleString() : "—", sumCols.cost.x, y)
        doc.setTextColor(55, 65, 81)
        doc.text(v.lastDate || "—", sumCols.last.x, y)
        y += rowHeight
      })

      // Footer
      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        const pw = doc.internal.pageSize.getWidth()
        const ph = doc.internal.pageSize.getHeight()
        doc.setFillColor(248, 250, 252); doc.rect(0, ph - 18, pw, 18, "F")
        doc.setDrawColor(226, 232, 240); doc.line(0, ph - 18, pw, ph - 18)
        doc.setFontSize(7); doc.setTextColor(107, 114, 128)
        doc.text(`NTDM Vettrack | Generated by: ${can.currentUserName || "Unknown"}`, 15, ph - 7)
        doc.text(`Page ${page} of ${totalPages}`, pw - 15, ph - 7, { align: "right" })
      }

      const suffix = exportSubjectName ? `-${exportSubjectName.replace(/\s+/g, "_")}` : ""
      doc.save(`vaccination-report${suffix}-${today}.pdf`)
      logPortalExport("Vaccination report", "PDF")
      setExportOpen(false)
    } catch (err) {
      console.error("PDF export failed:", err)
    } finally {
      setExporting(false)
    }
  }

  const exportToExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.utils.book_new()

      // Sheet 1 — every dose
      const recordsData = exportRecords.map(r => ({
        "Date Given": r.date,
        Subject: r.subjectName || "—",
        "Subject Type": r.subjectType === "calf" ? "Calf" : "Animal",
        "Ear Tag ID": getEarTag(r),
        "Vaccine Name": r.vaccineName,
        "Disease Prevented": r.diseasePrevented || "—",
        "Vaccine Type": r.vaccineType || "—",
        Dose: r.dose != null ? `${r.dose}${r.doseUnit ? ` ${r.doseUnit}` : ""}` : "—",
        Route: r.route || "—",
        "Vaccination Site": r.site || "—",
        "Batch/Lot Number": r.batchNumber || "—",
        Manufacturer: r.manufacturer || "—",
        "Expiry Date": r.expiryDate || "—",
        "Expired at Administration": expiredAt(r.expiryDate, r.date) ? "YES" : "No",
        "Vaccine Price (RWF)": r.vaccinePrice ?? "—",
        "Vaccinator Fee (RWF)": r.vetPrice ?? "—",
        "Total Cost (RWF)": recordCost(r) > 0 ? recordCost(r) : "—",
        Vaccinator: r.vaccinator || "—",
        "Next Vaccination": r.nextVaccinationDate || "—",
        Remarks: r.notes || "—",
      }))
      const ws1 = XLSX.utils.json_to_sheet(recordsData)
      ws1["!cols"] = [14, 20, 14, 16, 26, 28, 18, 12, 18, 18, 20, 24, 14, 22, 20, 20, 18, 22, 18, 30].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws1, "All Records")

      // Sheet 2 — per-vaccine summary
      const summaryData = exportSummary.map(v => ({
        Vaccine: v.name,
        "Disease Prevented": v.prevents,
        "Doses Given": v.doses,
        "Animals Covered": v.animals,
        "Total Cost (RWF)": v.cost,
        "Last Given": v.lastDate,
      }))
      const ws2 = XLSX.utils.json_to_sheet(summaryData)
      ws2["!cols"] = [30, 30, 14, 18, 20, 16].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws2, "Per-Vaccine Summary")

      // Sheet 3 — the live booster schedule
      const scheduleData = schedule.map(s => ({
        Subject: s.record.subjectName || "—",
        "Subject Type": s.record.subjectType === "calf" ? "Calf" : "Animal",
        "Ear Tag ID": getEarTag(s.record),
        Vaccine: s.record.vaccineName,
        "Last Given": s.record.date,
        "Next Due": s.dueDate,
        Status: s.days < 0 ? `${Math.abs(s.days)} days overdue` : s.days === 0 ? "Due today" : `${s.days} days left`,
      }))
      const ws3 = XLSX.utils.json_to_sheet(scheduleData)
      ws3["!cols"] = [22, 14, 16, 28, 16, 16, 20].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws3, "Schedule")

      const suffix = exportSubjectName ? `-${exportSubjectName.replace(/\s+/g, "_")}` : ""
      XLSX.writeFile(wb, `vaccination-report${suffix}-${today}.xlsx`)
      logPortalExport("Vaccination report", "Excel")
      setExportOpen(false)
    } catch (err) {
      console.error("Excel export failed:", err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 bg-gray-200 rounded w-40" />
        <div className="h-4 bg-gray-200 rounded w-64 mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
      <div className="h-10 bg-gray-200 rounded w-full max-w-md" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header - suppressed when embedded under a page that already names the farm. */}
      {showHeader && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("farmer.vaccination")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("farmer.vaccinationDesc")}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.totalDoses")}</p>
              <ShieldPlus className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{records.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("farmer.allTime")}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.animalsVaccinated")}</p>
              <Users className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-green-600 mt-2">{animalsVaccinated}</h3>
            <p className="text-xs text-gray-400 mt-1">
              {calvesVaccinated > 0
                ? `${t("farmer.including")} ${calvesVaccinated} ${t("farmer.calves").toLowerCase()}`
                : t("farmer.distinctAnimals")}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.totalCostRWF")}</p>
              <DollarSign className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-orange-600 mt-2">{totalCost.toLocaleString()}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("farmer.cumulativeSpend")}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.dueSoon")}</p>
              <CalendarClock className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-amber-600 mt-2">{dueSoon.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("farmer.dueWithin30Days")}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t("farmer.overdue")}</p>
              <AlertCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-red-600 mt-2">{overdue.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("farmer.pastDue")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* The Record tab is the entry form - it only exists for users who may write.
            A view-only vet still gets the full History and Reports tabs. */}
        <TabsList className={`grid w-full max-w-md ${showRecordTab ? "grid-cols-3" : "grid-cols-2"}`}>
          {showRecordTab && (
            <TabsTrigger value="record" className="flex items-center gap-1"><Plus className="h-4 w-4" /> {t("farmer.tabRecord")}</TabsTrigger>
          )}
          <TabsTrigger value="history" className="flex items-center gap-1"><History className="h-4 w-4" /> {t("farmer.tabHistory")}</TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> {t("farmer.tabReports")}</TabsTrigger>
        </TabsList>

        {/* RECORD TAB */}
        {showRecordTab && (
          <TabsContent value="record">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  {editRecord ? t("farmer.editVaccinationRecord") : t("farmer.newVaccinationRecord")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Subject - one picker, animals and calves under separate headings */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.animalOrCalf")} *</label>
                    <Combobox
                      value={subjectSel}
                      onValueChange={handleSubjectChange}
                      disabled={subjectOptions.length === 0}
                      options={subjectOptions}
                      placeholder={subjectOptions.length === 0 ? t("farmer.noAnimalsRegistered") : t("farmer.selectAnimalOrCalf")}
                      searchPlaceholder={t("farmer.searchAnimals") || "Search animals…"}
                      emptyText={t("farmer.noResultsFound") || "No animals found."}
                      className={errors.subject ? "border-red-500" : ""}
                    />
                    {selectedSubject && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] ${isCalfSelected ? "bg-pink-50 text-pink-700 border-pink-200" : "bg-sky-50 text-sky-700 border-sky-200"}`}>
                          {isCalfSelected ? t("farmer.calf") : t("farmer.animal")}
                        </Badge>
                        {isCalfSelected
                          ? [selectedSubject.motherName ? `${t("farmer.dam")}: ${selectedSubject.motherName}` : null, selectedSubject.birthDate ? `${t("farmer.born")} ${selectedSubject.birthDate}` : null].filter(Boolean).join(" · ")
                          : selectedSubject.type}
                      </p>
                    )}
                    {subjectOptions.length === 0 && <p className="text-xs text-red-500">{t("farmer.noAnimalsRegistered")}</p>}
                    {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
                  </div>

                  {/* Ear Tag ID - calves are not tagged, so say so rather than showing
                      an empty state that reads like the farmer forgot to fill it in. */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.earTagId")} <span className="text-gray-400 text-xs">{t("farmer.autoDetected")}</span></label>
                    <Input
                      readOnly
                      value={
                        isCalfSelected ? t("farmer.notApplicableForCalves")
                          : earTagId || (subjectSel ? "No ear tag registered" : t("farmer.selectSubjectFirst"))
                      }
                      className={earTagId && !isCalfSelected ? "bg-amber-50 text-amber-700 font-medium" : "bg-gray-50 text-gray-400 italic"}
                    />
                  </div>

                  {/* Insurance ID */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.insuranceId")} <span className="text-gray-400 text-xs">{t("farmer.autoDetected")}</span></label>
                    <Input
                      readOnly
                      value={
                        isCalfSelected ? t("farmer.notApplicableForCalves")
                          : insuranceId || (subjectSel ? "No insurance registered" : t("farmer.selectSubjectFirst"))
                      }
                      className={insuranceId && !isCalfSelected ? "bg-blue-50 text-blue-700 font-medium" : "bg-gray-50 text-gray-400 italic"}
                    />
                  </div>

                  {/* Date Given */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.dateGiven")} *</label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className={errors.date ? "border-red-500" : ""} />
                    {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                  </div>

                  {/* Vaccine Name */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.vaccineName")} *</label>
                    <Input
                      list="vaccine-suggestions"
                      placeholder="e.g. FMD Vaccine"
                      value={vaccineName}
                      onChange={e => handleVaccineChange(e.target.value)}
                      className={errors.vaccineName ? "border-red-500" : ""}
                    />
                    <datalist id="vaccine-suggestions">
                      {vaccineNames.map(v => <option key={v} value={v} />)}
                    </datalist>
                    {errors.vaccineName && <p className="text-xs text-red-500">{errors.vaccineName}</p>}
                  </div>

                  {/* Disease Prevented */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.diseasePrevented")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                    <Input
                      list="prevented-suggestions"
                      placeholder="e.g. Foot-and-Mouth Disease"
                      value={diseasePrevented}
                      onChange={e => setDiseasePrevented(e.target.value)}
                    />
                    <datalist id="prevented-suggestions">
                      {COMMON_VACCINES.map(v => <option key={v.prevents} value={v.prevents} />)}
                    </datalist>
                  </div>

                  {/* Vaccine Type */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.vaccineType")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                    <Select value={vaccineType || "none"} onValueChange={v => setVaccineType(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder={t("farmer.vaccineType")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Not specified —</SelectItem>
                        {VACCINE_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dose + unit */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.dose")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                    <div className="flex gap-2">
                      <Input
                        type="number" min="0" step="0.1" placeholder="e.g. 2"
                        value={dose} onChange={e => setDose(e.target.value)}
                        className={`flex-1 ${errors.dose ? "border-red-500" : ""}`}
                      />
                      <Select value={doseUnit} onValueChange={setDoseUnit}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DOSE_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.dose && <p className="text-xs text-red-500">{errors.dose}</p>}
                  </div>

                  {/* Route */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.route")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                    <Select value={route || "none"} onValueChange={v => setRoute(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder={t("farmer.route")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Not specified —</SelectItem>
                        {ROUTES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Vaccination Site */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.vaccinationSite")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                    <Input
                      list="site-suggestions"
                      placeholder="e.g. Neck"
                      value={site}
                      onChange={e => setSite(e.target.value)}
                    />
                    <datalist id="site-suggestions">
                      {SITES.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>

                  {/* Batch / Lot Number */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.batchNumber")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                    <Input placeholder="e.g. FMD-2026-087" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} />
                  </div>

                  {/* Manufacturer */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.manufacturer")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                    <Input
                      list="manufacturer-suggestions"
                      placeholder="e.g. MSD Animal Health"
                      value={manufacturer}
                      onChange={e => setManufacturer(e.target.value)}
                    />
                    <datalist id="manufacturer-suggestions">
                      {MANUFACTURERS.map(m => <option key={m} value={m} />)}
                    </datalist>
                  </div>

                  {/* Expiry Date - month precision, the way vials are labelled */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.expiryDate")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                    <Input type="month" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                    {expiredAt(expiryDate, date) && (
                      <p className="text-xs text-red-500">This vial had already expired on the date given.</p>
                    )}
                  </div>

                  {/* Vaccine Price */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.vaccinePrice")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                    <Input
                      type="number" min="0" step="0.01" placeholder="e.g. 3000"
                      value={vaccinePrice} onChange={e => setVaccinePrice(e.target.value)}
                      className={errors.vaccinePrice ? "border-red-500" : ""}
                    />
                    {errors.vaccinePrice && <p className="text-xs text-red-500">{errors.vaccinePrice}</p>}
                  </div>

                  {/* Vaccinator fee */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">{t("farmer.vaccinatorFee")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                      {(vaccinePrice || vetPrice) && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
                          RWF {((Number(vaccinePrice) || 0) + (Number(vetPrice) || 0)).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <Input
                      type="number" min="0" step="0.01" placeholder="e.g. 1500"
                      value={vetPrice} onChange={e => setVetPrice(e.target.value)}
                      className={errors.vetPrice ? "border-red-500" : ""}
                    />
                    {errors.vetPrice
                      ? <p className="text-xs text-red-500">{errors.vetPrice}</p>
                      : <p className="text-xs text-gray-500">{t("farmer.vaccinationCostsDesc")}</p>}
                  </div>

                  {/* Vaccinator - for the farmer, a roster pick; for a delegated vet,
                      themselves. Shown read-only rather than hidden so the vet can see
                      the attribution that will appear on the farmer's record, and rather
                      than disabled so it does not read as a permission they are missing. */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      {t("farmer.vaccinator")}{" "}
                      {!can.isDelegate && <span className="text-gray-400 text-xs">({t("common.optional")})</span>}
                    </label>
                    {can.isDelegate ? (
                      <>
                        {/* Mirror exactly what the server will store: your own name on a
                            new record, the untouched original when editing one. */}
                        <div className="flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900">
                          {editRecord ? (
                            <span className="font-medium">{vaccinator || <span className="font-normal text-gray-400">—</span>}</span>
                          ) : (
                            <span className="font-medium">{can.currentUserName}</span>
                          )}
                          {(editRecord ? vaccinator : can.currentUserName) === can.currentUserName && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t("vet.you")}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {editRecord ? t("vet.attributionPreserved") : t("vet.attributionLocked")}
                        </p>
                      </>
                    ) : (
                      <Select value={vaccinator || "none"} onValueChange={v => setVaccinator(v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder={t("farmer.selectVaccinator")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("farmer.selectVet")}</SelectItem>
                          {vets.map(d => (
                            <SelectItem key={d._id} value={d.name}>
                              {d.name}{d.specialization ? ` — ${d.specialization}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Next Vaccination */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">{t("farmer.nextVaccination")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                      {nextVaccinationDate && !errors.nextVaccinationDate && (() => {
                        const d = daysUntil(nextVaccinationDate)
                        return (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d < 0 ? "bg-red-50 text-red-600" : d <= 30 ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                            {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : `${d}d left`}
                          </span>
                        )
                      })()}
                    </div>
                    <Input
                      type="date" value={nextVaccinationDate}
                      onChange={e => setNextVaccinationDate(e.target.value)}
                      className={errors.nextVaccinationDate ? "border-red-500" : ""}
                    />
                    {errors.nextVaccinationDate && <p className="text-xs text-red-500">{errors.nextVaccinationDate}</p>}
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">{t("farmer.remarks")} <span className="text-gray-400 text-xs">({t("common.optional")})</span></label>
                    <Input placeholder="e.g. No adverse reaction." value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSubmit} disabled={saving || !canSubmitForm} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6">
                    {saving ? t("farmer.savingRecord") : editRecord ? t("farmer.updateRecord") : t("farmer.saveRecord")}
                  </Button>
                  {!canSubmitForm && (
                    <p className="text-xs text-gray-500 self-center">{t("vet.selectRecordToEdit")}</p>
                  )}
                  {editRecord && <Button variant="outline" onClick={resetForm} className="rounded-lg">{t("farmer.cancel")}</Button>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-sky-500 rounded-full" />
                {t("farmer.vaccinationHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl">
                <Combobox
                  value={filterSubject || "all"}
                  onValueChange={v => setFilterSubject(v === "all" ? "" : v)}
                  options={filterSubjectOptions}
                  placeholder={t("farmer.allAnimals")}
                  searchPlaceholder={t("farmer.searchAnimals") || "Search animals…"}
                  emptyText={t("farmer.noResultsFound") || "No animals found."}
                />
                <Select value={filterVaccine || "all"} onValueChange={v => setFilterVaccine(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t("farmer.allVaccines")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("farmer.allVaccines")}</SelectItem>
                    {vaccineSummary.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
                <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                  <p className="text-sm text-gray-500">{filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}</p>
                  <Button variant="outline" onClick={() => { setFilterSubject(""); setFilterVaccine(""); setFilterMonth("") }} className="rounded-lg ml-auto text-xs">Clear</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("farmer.dateGiven")}</TableHead>
                      <TableHead>{t("farmer.animalOrCalf")}</TableHead>
                      <TableHead>{t("farmer.vaccineName")}</TableHead>
                      <TableHead>{t("farmer.diseasePrevented")}</TableHead>
                      <TableHead>{t("farmer.vaccineType")}</TableHead>
                      <TableHead>{t("farmer.dose")}</TableHead>
                      <TableHead>{t("farmer.route")}</TableHead>
                      <TableHead>{t("farmer.vaccinationSite")}</TableHead>
                      <TableHead>{t("farmer.batchNumber")}</TableHead>
                      <TableHead>{t("farmer.expiryDate")}</TableHead>
                      <TableHead>{t("farmer.totalCostRWF")}</TableHead>
                      <TableHead>{t("farmer.vaccinator")}</TableHead>
                      <TableHead>{t("farmer.nextVaccination")}</TableHead>
                      <TableHead>{t("farmer.remarks")}</TableHead>
                      <TableHead>{t("farmer.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow><TableCell colSpan={15} className="text-center py-8 text-gray-400">{t("farmer.noRecordsFound")}</TableCell></TableRow>
                    ) : filteredRecords.map(r => (
                      <TableRow key={r._id}>
                        <TableCell className="text-sm">{r.date}</TableCell>
                        <TableCell className="text-sm">
                          <span className="flex items-center gap-1.5">
                            {r.subjectName || <span className="text-gray-400">—</span>}
                            {r.subjectType === "calf" && (
                              <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 text-[10px]">{t("farmer.calf")}</Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-green-700">{r.vaccineName}</TableCell>
                        <TableCell className="text-sm">{r.diseasePrevented || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>
                          {r.vaccineType
                            ? <Badge variant="outline" className={`${TYPE_STYLES[r.vaccineType] || TYPE_STYLES.Other} text-xs`}>{r.vaccineType}</Badge>
                            : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">{r.dose != null ? `${r.dose} ${r.doseUnit || ""}`.trim() : <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-sm">{r.route || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-sm">{r.site || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-sm font-mono text-xs">{r.batchNumber || <span className="text-gray-400 font-sans">—</span>}</TableCell>
                        <TableCell className="text-sm">
                          {r.expiryDate
                            ? expiredAt(r.expiryDate, r.date)
                              ? <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px]" title="Expired at administration">{r.expiryDate}</Badge>
                              : r.expiryDate
                            : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-orange-700" title={`Vaccine ${r.vaccinePrice ?? 0} + fee ${r.vetPrice ?? 0}`}>
                          {recordCost(r) > 0 ? recordCost(r).toLocaleString() : <span className="text-gray-400 font-normal">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">{r.vaccinator || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>
                          {r.nextVaccinationDate ? <DueBadge dueDate={r.nextVaccinationDate} /> : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[120px] truncate">{r.notes || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canModify(can, "update", r) && (
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(r)} className="h-8 w-8 p-0 hover:bg-green-50">
                                <Pencil className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                            )}
                            {canModify(can, "delete", r) && (
                              <Button size="sm" variant="ghost" onClick={() => setDeleteId(r._id)} className="h-8 w-8 p-0 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                            {!canModify(can, "update", r) && !canModify(can, "delete", r) && (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTS TAB */}
        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Export button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setExportOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2"
              >
                <Download className="h-4 w-4" />
                {t("farmer.exportReport")}
              </Button>
            </div>

            {/* Upcoming & overdue schedule */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  {t("farmer.upcomingSchedule")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("farmer.animalOrCalf")}</TableHead>
                        <TableHead>{t("farmer.vaccineName")}</TableHead>
                        <TableHead>{t("farmer.lastGiven")}</TableHead>
                        <TableHead>{t("farmer.nextVaccination")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-400">{t("farmer.noVaccinationData")}</TableCell></TableRow>
                      ) : schedule.map(s => (
                        <TableRow key={s.record._id}>
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-1.5">
                              {s.record.subjectName || "—"}
                              {s.record.subjectType === "calf" && (
                                <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 text-[10px]">{t("farmer.calf")}</Badge>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{s.record.vaccineName}</TableCell>
                          <TableCell className="text-sm text-gray-500">{s.record.date}</TableCell>
                          <TableCell><DueBadge dueDate={s.dueDate} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Per-vaccine summary */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  {t("farmer.summaryPerVaccine")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("farmer.vaccineName")}</TableHead>
                        <TableHead>{t("farmer.diseasePrevented")}</TableHead>
                        <TableHead>{t("farmer.totalDoses")}</TableHead>
                        <TableHead>{t("farmer.animalsCovered")}</TableHead>
                        <TableHead>{t("farmer.totalCostRWF")}</TableHead>
                        <TableHead>{t("farmer.lastGiven")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vaccineSummary.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-6 text-gray-400">{t("farmer.noDataAvailable")}</TableCell></TableRow>
                      ) : vaccineSummary.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell className="text-sm text-gray-500">{v.prevents}</TableCell>
                          <TableCell className="text-green-700 font-semibold">{v.doses}</TableCell>
                          <TableCell className="text-sky-700 font-semibold">{v.animals}</TableCell>
                          <TableCell className="text-orange-700 font-medium">{v.cost > 0 ? v.cost.toLocaleString() : "—"}</TableCell>
                          <TableCell className="text-sm text-gray-500">{v.lastDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Doses per vaccine */}
            {vaccineSummary.length > 0 && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    {t("farmer.dosesPerVaccine")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={vaccineSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip formatter={(v: any) => [v, "Doses"]} />
                      <Bar dataKey="doses" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Doses per animal */}
            {animalSummary.length > 0 && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-sky-500 rounded-full" />
                    {t("farmer.dosesPerAnimal")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={animalSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip formatter={(v: any) => [v, "Doses"]} />
                      <Bar dataKey="doses" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              {t("farmer.exportVaccinationReport")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t("farmer.animalOrCalf")}</label>
              <Combobox
                value={exportSubjectFilter || "all"}
                onValueChange={v => setExportSubjectFilter(v === "all" ? "" : v)}
                options={filterSubjectOptions}
                placeholder={t("farmer.allAnimals")}
                searchPlaceholder={t("farmer.searchAnimals") || "Search animals…"}
                emptyText={t("farmer.noResultsFound") || "No animals found."}
              />
            </div>
            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="text-sm space-y-1">
                <p className="font-medium text-green-700">{t("farmer.preview")}{exportSubjectName ? ` — ${exportSubjectName}` : ""}</p>
                <p className="text-gray-600">
                  {exportRecords.length} dose{exportRecords.length !== 1 ? "s" : ""} &bull; {exportSummary.length} vaccine{exportSummary.length !== 1 ? "s" : ""} &bull; {animalsVaccinated} animal(s)
                </p>
                <p className="text-gray-600">Total cost: <strong className="text-green-700">RWF {exportTotalCost.toLocaleString()}</strong></p>
                <p className="text-gray-600">
                  Schedule: <strong className="text-amber-600">{dueSoon.length} due soon</strong> &bull; <strong className="text-red-600">{overdue.length} overdue</strong>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline" onClick={() => setExportOpen(false)} className="rounded-lg">{t("farmer.cancel")}</Button>
              <Button
                onClick={exportToExcel}
                disabled={exporting || exportRecords.length === 0}
                className="rounded-lg bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? t("farmer.exporting") : t("farmer.exportExcel")}
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={exporting || exportRecords.length === 0}
                className="col-span-2 bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2"
              >
                <FileText className="h-4 w-4" />
                {exporting ? t("farmer.exporting") : t("farmer.exportPDF")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("farmer.deleteVaccinationRecord")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("farmer.deleteRecordConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("farmer.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
