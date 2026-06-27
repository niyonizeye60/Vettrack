"use client"

import { useState, useEffect, useMemo } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { getAnimals, getDoctorsList } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ShieldAlert, Plus, Pencil, Trash2, BarChart3, History, Activity, CheckCircle2, AlertCircle, Clock, Syringe, DollarSign, Download, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { useLanguage } from "@/contexts/LanguageContext"

interface Animal { _id: string; name: string; type: string; insuranceId?: string | null; earTagId?: string | null }
interface Doctor { _id: string; name: string; specialization: string }
interface DiseaseRecord {
  _id: string; animalId: string; animalName: string | null
  diseaseName: string; symptoms: string | null; treatment: string | null
  diagnosedDate: string; resolvedDate: string | null
  status: string; notes: string | null; veterinarianName: string | null; vetOrigin?: string | null
}
interface Medicine {
  medicineId?: string; medicineName: string; doseCount: number; volumeMl: number | null; cost: number
}
interface TreatmentDose {
  _id: string; diseaseRecordId: string; animalId: string; animalName: string | null
  diseaseName: string | null; date: string; session: string
  medicines: Medicine[]; vetCost: number; totalCost: number; notes: string | null
}
interface MedicineRow {
  medicineId?: string; medicineName: string; doseCount: string; volumeMl: string; cost: string
}
const emptyMedicineRow = (): MedicineRow => ({ medicineName: "", doseCount: "1", volumeMl: "", cost: "" })
const doseTotalCount = (d: TreatmentDose) => (d.medicines || []).reduce((s, m) => s + (m.doseCount || 0), 0)
const doseMedicineCost = (d: TreatmentDose) => (d.medicines || []).reduce((s, m) => s + (m.cost || 0), 0)

const STATUSES = ["Active", "Under Treatment", "Resolved"]
const SESSIONS = ["Morning", "Evening"]
const COMMON_DISEASES = [
  "Foot and Mouth Disease", "Mastitis", "Bovine Respiratory Disease",
  "Brucellosis", "Tuberculosis", "Lumpy Skin Disease", "East Coast Fever",
  "Trypanosomiasis", "Newcastle Disease", "Anthrax", "Blackleg", "Other"
]

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-red-50 text-red-700 border-red-200",
  "Under Treatment": "bg-amber-50 text-amber-700 border-amber-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
}
const SESSION_STYLES: Record<string, string> = {
  Morning: "bg-amber-50 text-amber-700 border-amber-200",
  Evening: "bg-indigo-50 text-indigo-700 border-indigo-200",
}

const PIE_COLORS = ["#ef4444", "#f59e0b", "#16a34a"]
const today = new Date().toISOString().split("T")[0]

export default function DiseaseManagementPage() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [animals, setAnimals] = useState<Animal[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [records, setRecords] = useState<DiseaseRecord[]>([])
  const [doses, setDoses] = useState<TreatmentDose[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editRecord, setEditRecord] = useState<DiseaseRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Disease form
  const [animalId, setAnimalId] = useState("")
  const [diseaseName, setDiseaseName] = useState("")
  const [customDisease, setCustomDisease] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [treatment, setTreatment] = useState("")
  const [diagnosedDate, setDiagnosedDate] = useState(today)
  const [resolvedDate, setResolvedDate] = useState("")
  const [status, setStatus] = useState("Active")
  const [veterinarianName, setVeterinarianName] = useState("")
  const [vetOrigin, setVetOrigin] = useState("")
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [insuranceId, setInsuranceId] = useState("")
  const [earTagId, setEarTagId] = useState("")

  // Dose form
  const [doseRecordId, setDoseRecordId] = useState("")
  const [doseDate, setDoseDate] = useState(today)
  const [doseSession, setDoseSession] = useState("")
  const [medicines, setMedicines] = useState<MedicineRow[]>([emptyMedicineRow()])
  const [vetCost, setVetCost] = useState("")
  const [doseNotes, setDoseNotes] = useState("")
  const [doseErrors, setDoseErrors] = useState<Record<string, string>>({})
  const [editDose, setEditDose] = useState<TreatmentDose | null>(null)
  const [deleteDoseId, setDeleteDoseId] = useState<string | null>(null)
  const [savingDose, setSavingDose] = useState(false)

  const addMedicineRow = () => setMedicines(prev => [...prev, emptyMedicineRow()])
  const removeMedicineRow = (index: number) => setMedicines(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index))
  const updateMedicineRow = (index: number, field: keyof MedicineRow, value: string) =>
    setMedicines(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  const medicinesTotalCost = useMemo(() => medicines.reduce((s, m) => s + (Number(m.cost) || 0), 0), [medicines])

  // Filters
  const [filterStatus, setFilterStatus] = useState("")
  const [filterAnimal, setFilterAnimal] = useState("")
  const [filterMonth, setFilterMonth] = useState("")
  const [filterDoseRecord, setFilterDoseRecord] = useState("")

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setUser(userData)
      const [animalsData, doctorsData] = await Promise.all([
        getAnimals(userData._id.toString()),
        getDoctorsList(),
      ])
      setAnimals(animalsData)
      setDoctors(doctorsData)
      await Promise.all([
        fetchRecords(userData._id.toString()),
        fetchDoses(userData._id.toString()),
      ])
      setLoading(false)
    }
    init()
  }, [])

  const fetchRecords = async (farmerId: string) => {
    const res = await fetch(`/api/diseases?farmerId=${farmerId}`)
    const data = await res.json()
    setRecords(Array.isArray(data) ? data : [])
  }

  const fetchDoses = async (farmerId: string) => {
    const res = await fetch(`/api/treatment-doses?farmerId=${farmerId}`)
    const data = await res.json()
    setDoses(Array.isArray(data) ? data : [])
  }

  // Auto-detect insurance ID from selected animal
  useEffect(() => {
    const animal = animals.find(a => a._id === animalId)
    setInsuranceId(animal?.insuranceId || "")
    setEarTagId(animal?.earTagId || "")
  }, [animalId, animals])

  const getAnimalInsuranceId = (id: string) =>
    animals.find(a => a._id === id)?.insuranceId || '—'

  const getAnimalEarTagId = (id: string) =>
    animals.find(a => a._id === id)?.earTagId || '—'

  const filteredRecords = useMemo(() => {
    let data = [...records]
    if (filterStatus) data = data.filter(r => r.status === filterStatus)
    if (filterAnimal) data = data.filter(r => r.animalId === filterAnimal)
    if (filterMonth) data = data.filter(r => r.diagnosedDate.startsWith(filterMonth))
    return data
  }, [records, filterStatus, filterAnimal, filterMonth])

  const filteredDoses = useMemo(() => {
    if (!filterDoseRecord) return doses
    return doses.filter(d => d.diseaseRecordId === filterDoseRecord)
  }, [doses, filterDoseRecord])

  // Cost per animal (total across all doses per animal)
  const costPerAnimal = useMemo(() => {
    const map: Record<string, { animalId: string; animalName: string; medicineCost: number; vetCost: number; total: number; doses: number }> = {}
    doses.forEach(d => {
      if (!map[d.animalId]) map[d.animalId] = { animalId: d.animalId, animalName: d.animalName || d.animalId, medicineCost: 0, vetCost: 0, total: 0, doses: 0 }
      map[d.animalId].medicineCost += doseMedicineCost(d)
      map[d.animalId].vetCost += d.vetCost
      map[d.animalId].total += d.totalCost
      map[d.animalId].doses += doseTotalCount(d)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [doses])

  // Validate disease form
  const validate = () => {
    const e: Record<string, string> = {}
    if (!animalId) e.animalId = "Select an animal"
    const finalDisease = diseaseName === "Other" ? customDisease : diseaseName
    if (!finalDisease) e.diseaseName = "Enter the disease name"
    if (!diagnosedDate) e.diagnosedDate = "Select a date"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Validate dose form
  const validateDose = () => {
    const e: Record<string, string> = {}
    if (!doseRecordId) e.doseRecordId = "Select a disease case"
    if (!doseSession) e.doseSession = "Select a session"
    if (!doseDate) e.doseDate = "Select a date"
    if (medicines.length === 0) {
      e.medicines = "Add at least one medicine"
    } else if (medicines.some(m => !m.medicineName.trim() || !m.doseCount || Number(m.doseCount) <= 0 || m.cost === "" || Number(m.cost) < 0)) {
      e.medicines = "Each medicine needs a name, a dose count greater than 0, and a non-negative cost"
    }
    setDoseErrors(e)
    return Object.keys(e).length === 0
  }

  const resetForm = () => {
    setAnimalId(""); setDiseaseName(""); setCustomDisease(""); setSymptoms("")
    setTreatment(""); setDiagnosedDate(today); setResolvedDate("")
    setStatus("Active"); setVeterinarianName(""); setVetOrigin(""); setNotes("")
    setInsuranceId(""); setEarTagId("")
    setErrors({}); setEditRecord(null)
  }

  const resetDoseForm = () => {
    setDoseRecordId(""); setDoseDate(today); setDoseSession("")
    setMedicines([emptyMedicineRow()])
    setVetCost(""); setDoseNotes("")
    setDoseErrors({}); setEditDose(null)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    const animal = animals.find(a => a._id === animalId)
    const finalDisease = diseaseName === "Other" ? customDisease : diseaseName
    const body = {
      farmerId: user._id.toString(), animalId,
      animalName: animal?.name || null,
      diseaseName: finalDisease, symptoms, treatment,
      diagnosedDate, resolvedDate: resolvedDate || null,
      status, notes, veterinarianName, vetOrigin,
    }
    if (editRecord) {
      await fetch("/api/diseases", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editRecord._id, ...body }) })
    } else {
      await fetch("/api/diseases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }
    await fetchRecords(user._id.toString())
    resetForm()
    setSaving(false)
  }

  const handleDoseSubmit = async () => {
    if (!validateDose()) return
    setSavingDose(true)
    const diseaseRecord = records.find(r => r._id === doseRecordId)
    const body = {
      farmerId: user._id.toString(),
      diseaseRecordId: doseRecordId,
      animalId: diseaseRecord?.animalId || "",
      animalName: diseaseRecord?.animalName || null,
      diseaseName: diseaseRecord?.diseaseName || null,
      date: doseDate, session: doseSession,
      medicines: medicines.map(m => ({
        ...(m.medicineId ? { medicineId: m.medicineId } : {}),
        medicineName: m.medicineName.trim(),
        doseCount: Number(m.doseCount) || 0,
        volumeMl: m.volumeMl ? Number(m.volumeMl) : null,
        cost: Number(m.cost) || 0,
      })),
      vetCost, notes: doseNotes,
    }
    if (editDose) {
      await fetch("/api/treatment-doses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editDose._id, ...body }) })
    } else {
      await fetch("/api/treatment-doses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }
    await fetchDoses(user._id.toString())
    resetDoseForm()
    setSavingDose(false)
  }

  const handleEdit = (r: DiseaseRecord) => {
    setEditRecord(r)
    setAnimalId(r.animalId)
    setInsuranceId(animals.find(a => a._id === r.animalId)?.insuranceId || "")
    setEarTagId(animals.find(a => a._id === r.animalId)?.earTagId || "")
    const isCommon = COMMON_DISEASES.includes(r.diseaseName)
    setDiseaseName(isCommon ? r.diseaseName : "Other")
    setCustomDisease(isCommon ? "" : r.diseaseName)
    setSymptoms(r.symptoms || "")
    setTreatment(r.treatment || "")
    setDiagnosedDate(r.diagnosedDate)
    setResolvedDate(r.resolvedDate || "")
    setStatus(r.status)
    setVeterinarianName(r.veterinarianName || "")
    setVetOrigin(r.vetOrigin || "")
    setNotes(r.notes || "")
  }

  const handleEditDose = (d: TreatmentDose) => {
    setEditDose(d)
    setDoseRecordId(d.diseaseRecordId)
    setDoseDate(d.date)
    setDoseSession(d.session)
    setMedicines(
      d.medicines && d.medicines.length > 0
        ? d.medicines.map(m => ({ medicineId: m.medicineId, medicineName: m.medicineName, doseCount: String(m.doseCount), volumeMl: m.volumeMl ? String(m.volumeMl) : "", cost: String(m.cost) }))
        : [emptyMedicineRow()]
    )
    setVetCost(d.vetCost ? String(d.vetCost) : "")
    setDoseNotes(d.notes || "")
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/diseases?id=${id}`, { method: "DELETE" })
    await fetchRecords(user._id.toString())
    setDeleteId(null)
  }

  const handleDeleteDose = async (id: string) => {
    await fetch(`/api/treatment-doses?id=${id}`, { method: "DELETE" })
    await fetchDoses(user._id.toString())
    setDeleteDoseId(null)
  }

  // Stats
  const activeCount = useMemo(() => records.filter(r => r.status === "Active").length, [records])
  const underTreatmentCount = useMemo(() => records.filter(r => r.status === "Under Treatment").length, [records])
  const resolvedCount = useMemo(() => records.filter(r => r.status === "Resolved").length, [records])
  const totalTreatmentCost = useMemo(() => doses.reduce((s, d) => s + d.totalCost, 0), [doses])

  const [reportCaseId, setReportCaseId] = useState("")

  const dailyCostBreakdown = useMemo(() => {
    const caseDoses = reportCaseId ? doses.filter(d => d.diseaseRecordId === reportCaseId) : doses
    const dayMap: Record<string, { date: string; morning: TreatmentDose[]; evening: TreatmentDose[]; dayTotal: number }> = {}
    caseDoses.forEach(d => {
      if (!dayMap[d.date]) dayMap[d.date] = { date: d.date, morning: [], evening: [], dayTotal: 0 }
      if (d.session === "Morning") dayMap[d.date].morning.push(d)
      else dayMap[d.date].evening.push(d)
      dayMap[d.date].dayTotal += d.totalCost
    })
    let running = 0
    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)).map(row => {
      running += row.dayTotal
      return { ...row, runningTotal: running }
    })
  }, [doses, reportCaseId])

  const diseaseFrequency = useMemo(() => {
    const map: Record<string, number> = {}
    filteredRecords.forEach(r => { map[r.diseaseName] = (map[r.diseaseName] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))
  }, [filteredRecords])

  const statusData = useMemo(() => [
    { name: "Active", value: activeCount },
    { name: "Under Treatment", value: underTreatmentCount },
    { name: "Resolved", value: resolvedCount },
  ].filter(d => d.value > 0), [activeCount, underTreatmentCount, resolvedCount])

  // Export
  const [exportOpen, setExportOpen] = useState(false)
  const [exportCaseId, setExportCaseId] = useState("all")
  const [exporting, setExporting] = useState(false)

  const getExportDoses = () => exportCaseId === "all" ? doses : doses.filter(d => d.diseaseRecordId === exportCaseId)
  const getExportRecords = () => exportCaseId === "all" ? records : records.filter(r => r._id === exportCaseId)

  const getExportDailyBreakdown = () => {
    const caseDoses = getExportDoses()
    const dayMap: Record<string, { date: string; morning: TreatmentDose[]; evening: TreatmentDose[]; dayTotal: number }> = {}
    caseDoses.forEach(d => {
      if (!dayMap[d.date]) dayMap[d.date] = { date: d.date, morning: [], evening: [], dayTotal: 0 }
      if (d.session === "Morning") dayMap[d.date].morning.push(d)
      else dayMap[d.date].evening.push(d)
      dayMap[d.date].dayTotal += d.totalCost
    })
    let running = 0
    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)).map(row => {
      running += row.dayTotal
      return { ...row, runningTotal: running }
    })
  }

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const doc = new jsPDF({ orientation: 'landscape' }) // landscape for more columns
      const caseLabel = exportCaseId === "all" ? "All Cases" : (() => {
        const r = records.find(r => r._id === exportCaseId)
        return r ? `${r.animalName} — ${r.diseaseName}` : "Unknown"
      })()
      const daily = getExportDailyBreakdown()
      const exportDoses = getExportDoses()
      const exportRecs = getExportRecords()
      const grandTotal = daily.length > 0 ? daily[daily.length - 1].runningTotal : 0
      const totalDoses = exportDoses.reduce((s, d) => s + doseTotalCount(d), 0)
      const totalMedicineCost = exportDoses.reduce((s, d) => s + doseMedicineCost(d), 0)
      const totalVetCost = exportDoses.reduce((s, d) => s + d.vetCost, 0)

      // landscape page width = 297mm
      const PW = 297

      // Per-animal stats
      const animalStats: Record<string, {
        doses: number; medicineCost: number; vetCost: number; totalCost: number; diagnosisCount: number
      }> = {}
      exportRecs.forEach(r => {
        if (!animalStats[r.animalId]) animalStats[r.animalId] = { doses: 0, medicineCost: 0, vetCost: 0, totalCost: 0, diagnosisCount: 0 }
        animalStats[r.animalId].diagnosisCount += 1
      })
      exportDoses.forEach(d => {
        if (!animalStats[d.animalId]) animalStats[d.animalId] = { doses: 0, medicineCost: 0, vetCost: 0, totalCost: 0, diagnosisCount: 0 }
        animalStats[d.animalId].doses += doseTotalCount(d)
        animalStats[d.animalId].medicineCost += doseMedicineCost(d)
        animalStats[d.animalId].vetCost += d.vetCost
        animalStats[d.animalId].totalCost += d.totalCost
      })

      // ── HEADER ──
      doc.setFillColor(239, 68, 68)
      doc.rect(0, 0, PW, 38, 'F')
      try {
        const logoImg = new Image(); logoImg.crossOrigin = 'anonymous'; logoImg.src = '/logo/NTDM.png'
        await new Promise((res, rej) => { logoImg.onload = res; logoImg.onerror = rej })
        doc.addImage(logoImg, 'PNG', 15, 7, 22, 22)
      } catch { }
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16); doc.setFont('helvetica', 'bold')
      doc.text('Disease Management Report', 45, 18)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('NTDM Animal Hospital', 45, 27)

      // ── META ──
      doc.setTextColor(55, 65, 81); doc.setFontSize(10)
      doc.text(`Case: ${caseLabel}`, 15, 50)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 58)
      doc.text(`Generated by: ${user?.name || 'Unknown'}`, 15, 66)

      // ── SUMMARY BOX ──
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240)
      doc.rect(15, 74, PW - 30, 42, 'FD')
      doc.setTextColor(239, 68, 68); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.text('Summary', 20, 85)
      doc.setTextColor(55, 65, 81); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(`Disease Cases: ${exportRecs.length}`, 20, 95)
      doc.text(`Total Doses: ${totalDoses}`, 90, 95)
      doc.text(`Treatment Days: ${daily.length}`, 170, 95)
      doc.text(`Medicine Cost: RWF ${totalMedicineCost.toLocaleString()}`, 20, 105)
      doc.text(`Vet Cost: RWF ${totalVetCost.toLocaleString()}`, 90, 105)
      doc.text(`Grand Total: RWF ${grandTotal.toLocaleString()}`, 170, 105)

      // ─────────────────────────────────────────────────────────────
      // SECTION 1 — DISEASE CASES (all columns from the form)
      // Columns: Animal | Ear Tag | Insurance | Disease | Symptoms | Treatment | Status | Vet | Vet Origin | Diagnosed | Resolved | Notes
      // ─────────────────────────────────────────────────────────────
      let y = 132

      // Column layout (landscape 297mm wide, margins 15 each side → 267mm usable)
      const cCols = {
        animal: { x: 16, w: 20 },
        earTag: { x: 37, w: 18 },
        insurance: { x: 56, w: 22 },
        disease: { x: 79, w: 22 },
        symptoms: { x: 102, w: 28 },
        treatment: { x: 131, w: 28 },
        status: { x: 160, w: 16 },
        vet: { x: 177, w: 20 },
        vetOrigin: { x: 198, w: 22 },
        diagnosed: { x: 221, w: 18 },
        resolved: { x: 240, w: 18 },
        notes: { x: 259, w: 22 },
      }

      const drawCaseSectionTitle = () => {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(55, 65, 81)
        doc.text('Disease Cases', 15, y - 10)
      }

      const drawCaseHeader = () => {
        doc.setFillColor(239, 68, 68)
        doc.rect(15, y - 6, PW - 30, 8, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
        doc.text('Animal', cCols.animal.x, y)
        doc.text('Ear Tag', cCols.earTag.x, y)
        doc.text('Insurance', cCols.insurance.x, y)
        doc.text('Disease', cCols.disease.x, y)
        doc.text('Symptoms', cCols.symptoms.x, y)
        doc.text('Treatment', cCols.treatment.x, y)
        doc.text('Status', cCols.status.x, y)
        doc.text('Vet', cCols.vet.x, y)
        doc.text('Vet Origin', cCols.vetOrigin.x, y)
        doc.text('Diagnosed', cCols.diagnosed.x, y)
        doc.text('Resolved', cCols.resolved.x, y)
        doc.text('Notes', cCols.notes.x, y)
        doc.setFont('helvetica', 'normal')
      }

      drawCaseSectionTitle()
      drawCaseHeader()
      y += 8

      exportRecs.forEach((r, i) => {
        const cells = [
          doc.splitTextToSize(r.animalName || '—', cCols.animal.w),
          doc.splitTextToSize(getAnimalEarTagId(r.animalId), cCols.earTag.w),
          doc.splitTextToSize(getAnimalInsuranceId(r.animalId), cCols.insurance.w),
          doc.splitTextToSize(r.diseaseName || '—', cCols.disease.w),
          doc.splitTextToSize(r.symptoms || '—', cCols.symptoms.w),
          doc.splitTextToSize(r.treatment || '—', cCols.treatment.w),
          doc.splitTextToSize(r.status || '—', cCols.status.w),
          doc.splitTextToSize(r.veterinarianName || '—', cCols.vet.w),
          doc.splitTextToSize(r.vetOrigin || '—', cCols.vetOrigin.w),
          doc.splitTextToSize(r.diagnosedDate || '—', cCols.diagnosed.w),
          doc.splitTextToSize(r.resolvedDate || '—', cCols.resolved.w),
          doc.splitTextToSize(r.notes || '—', cCols.notes.w),
        ]
        const rowH = Math.max(...cells.map(c => c.length), 1) * 4.5 + 4

        if (y + rowH > 195) { doc.addPage(); y = 20; drawCaseHeader(); y += 8 }

        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, PW - 30, rowH, 'F') }
        doc.setDrawColor(226, 232, 240); doc.rect(15, y - 4, PW - 30, rowH)

          // vertical separators
          ;[35, 54, 77, 100, 129, 158, 175, 196, 219, 238, 257].forEach(sx =>
            doc.line(sx, y - 4, sx, y - 4 + rowH))

        doc.setFontSize(6.5); doc.setTextColor(55, 65, 81)
        const keys = Object.keys(cCols) as (keyof typeof cCols)[]
        cells.forEach((cell, idx) => {
          doc.text(cell, cCols[keys[idx]].x, y)
        })

        y += rowH
      })

      // ─────────────────────────────────────────────────────────────
      // SECTION 2 — FULL TREATMENT DOSES TABLE
      // Columns: Date | Session | Animal | Disease | Medicines | Med Cost | Vet Cost | Total | Notes
      // ─────────────────────────────────────────────────────────────
      y += 12
      if (y > 170) { doc.addPage(); y = 20 }

      const dCols = {
        date: { x: 16, w: 20 },
        session: { x: 37, w: 16 },
        animal: { x: 54, w: 26 },
        disease: { x: 81, w: 30 },
        medicines: { x: 112, w: 47 },
        medCost: { x: 160, w: 24 },
        vetCost: { x: 185, w: 24 },
        total: { x: 210, w: 26 },
        notes: { x: 237, w: 44 },
      }

      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(55, 65, 81)
      doc.text('Treatment Doses Log', 15, y - 10)

      const drawDoseHeader = () => {
        doc.setFillColor(234, 88, 12)
        doc.rect(15, y - 6, PW - 30, 8, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
        doc.text('Date', dCols.date.x, y)
        doc.text('Session', dCols.session.x, y)
        doc.text('Animal', dCols.animal.x, y)
        doc.text('Disease', dCols.disease.x, y)
        doc.text('Medicines', dCols.medicines.x, y)
        doc.text('Med Cost(RWF)', dCols.medCost.x, y)
        doc.text('Vet Cost(RWF)', dCols.vetCost.x, y)
        doc.text('Total(RWF)', dCols.total.x, y)
        doc.text('Notes', dCols.notes.x, y)
        doc.setFont('helvetica', 'normal')
      }

      drawDoseHeader()
      y += 8

      exportDoses.forEach((d, i) => {
        const medicineLines = (d.medicines && d.medicines.length > 0)
          ? d.medicines.flatMap(m => doc.splitTextToSize(`${m.medicineName} (${m.doseCount} dose${m.doseCount !== 1 ? 's' : ''}${m.volumeMl ? `, ${m.volumeMl}mL` : ''}${m.cost > 0 ? `, RWF ${m.cost.toLocaleString()}` : ''})`, dCols.medicines.w))
          : ['—']
        const cells = [
          doc.splitTextToSize(d.date || '—', dCols.date.w),
          doc.splitTextToSize(d.session || '—', dCols.session.w),
          doc.splitTextToSize(d.animalName || '—', dCols.animal.w),
          doc.splitTextToSize(d.diseaseName || '—', dCols.disease.w),
          medicineLines,
          doc.splitTextToSize(doseMedicineCost(d) > 0 ? doseMedicineCost(d).toLocaleString() : '—', dCols.medCost.w),
          doc.splitTextToSize(d.vetCost > 0 ? d.vetCost.toLocaleString() : '—', dCols.vetCost.w),
          doc.splitTextToSize(d.totalCost > 0 ? d.totalCost.toLocaleString() : '—', dCols.total.w),
          doc.splitTextToSize(d.notes || '—', dCols.notes.w),
        ]
        const rowH = Math.max(...cells.map(c => c.length), 1) * 4.5 + 4

        if (y + rowH > 195) { doc.addPage(); y = 20; drawDoseHeader(); y += 8 }

        if (i % 2 === 0) { doc.setFillColor(255, 251, 235); doc.rect(15, y - 4, PW - 30, rowH, 'F') }
        doc.setDrawColor(226, 232, 240); doc.rect(15, y - 4, PW - 30, rowH)

          ;[35, 52, 79, 110, 158, 183, 208, 235].forEach(sx =>
            doc.line(sx, y - 4, sx, y - 4 + rowH))

        doc.setFontSize(6.5)
        const keys = Object.keys(dCols) as (keyof typeof dCols)[]
        cells.forEach((cell, idx) => {
          if (keys[idx] === 'medCost') doc.setTextColor(37, 99, 235)
          else if (keys[idx] === 'vetCost') doc.setTextColor(234, 88, 12)
          else if (keys[idx] === 'total') doc.setTextColor(22, 163, 74)
          else doc.setTextColor(55, 65, 81)
          doc.text(cell, dCols[keys[idx]].x, y)
        })

        y += rowH
      })

      // Dose totals row
      if (exportDoses.length > 0) {
        const rowH = 10
        if (y + rowH > 195) { doc.addPage(); y = 20 }
        doc.setFillColor(255, 237, 213); doc.rect(15, y - 4, PW - 30, rowH, 'F')
        doc.setDrawColor(234, 88, 12); doc.rect(15, y - 4, PW - 30, rowH)
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(234, 88, 12)
        doc.text('TOTALS', 16, y + 1)
        doc.setTextColor(37, 99, 235)
        doc.text(`RWF ${totalMedicineCost.toLocaleString()}`, dCols.medCost.x, y + 1)
        doc.setTextColor(234, 88, 12)
        doc.text(`RWF ${totalVetCost.toLocaleString()}`, dCols.vetCost.x, y + 1)
        doc.setTextColor(22, 163, 74)
        doc.text(`RWF ${grandTotal.toLocaleString()}`, dCols.total.x, y + 1)
        y += rowH
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION 3 — PER-ANIMAL TREATMENT SUMMARY
      // ─────────────────────────────────────────────────────────────
      y += 12
      if (y > 170) { doc.addPage(); y = 20 }

      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(55, 65, 81)
      doc.text('Per-Animal Treatment Summary', 15, y - 10)

      const aCols = {
        animal: { x: 16, w: 34 },
        earTag: { x: 54, w: 22 },
        insurance: { x: 78, w: 28 },
        diagnoses: { x: 108, w: 18 },
        doses: { x: 130, w: 16 },
        medicine: { x: 150, w: 30 },
        vet: { x: 183, w: 28 },
        total: { x: 214, w: 30 },
      }

      const drawAnimalHeader = () => {
        doc.setFillColor(124, 58, 237)
        doc.rect(15, y - 6, PW - 30, 8, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
        doc.text('Animal', aCols.animal.x, y)
        doc.text('Ear Tag', aCols.earTag.x, y)
        doc.text('Insurance ID', aCols.insurance.x, y)
        doc.text('Diagnoses', aCols.diagnoses.x, y)
        doc.text('Doses', aCols.doses.x, y)
        doc.text('Medicine (RWF)', aCols.medicine.x, y)
        doc.text('Vet (RWF)', aCols.vet.x, y)
        doc.text('Total (RWF)', aCols.total.x, y)
        doc.setFont('helvetica', 'normal')
      }

      drawAnimalHeader()
      y += 8

      const animalRows = exportRecs
        .filter((r, idx, arr) => arr.findIndex(x => x.animalId === r.animalId) === idx)
        .map(r => ({
          animalId: r.animalId,
          animalName: r.animalName || '—',
          ...(animalStats[r.animalId] || { doses: 0, medicineCost: 0, vetCost: 0, totalCost: 0, diagnosisCount: 0 })
        }))
        .sort((a, b) => b.totalCost - a.totalCost)

      animalRows.forEach((row, i) => {
        const cells = [
          doc.splitTextToSize(row.animalName, aCols.animal.w),
          doc.splitTextToSize(getAnimalEarTagId(row.animalId), aCols.earTag.w),
          doc.splitTextToSize(getAnimalInsuranceId(row.animalId), aCols.insurance.w),
          doc.splitTextToSize(String(row.diagnosisCount), aCols.diagnoses.w),
          doc.splitTextToSize(String(row.doses), aCols.doses.w),
          doc.splitTextToSize(row.medicineCost.toLocaleString(), aCols.medicine.w),
          doc.splitTextToSize(row.vetCost.toLocaleString(), aCols.vet.w),
          doc.splitTextToSize(row.totalCost.toLocaleString(), aCols.total.w),
        ]
        const rowH = Math.max(...cells.map(c => c.length), 1) * 4.5 + 4

        if (y + rowH > 195) { doc.addPage(); y = 20; drawAnimalHeader(); y += 8 }

        if (i % 2 === 0) { doc.setFillColor(245, 243, 255); doc.rect(15, y - 4, PW - 30, rowH, 'F') }
        doc.setDrawColor(226, 232, 240); doc.rect(15, y - 4, PW - 30, rowH)

          ;[52, 76, 106, 128, 148, 181, 212].forEach(sx =>
            doc.line(sx, y - 4, sx, y - 4 + rowH))

        doc.setFontSize(6.5)
        const keys = Object.keys(aCols) as (keyof typeof aCols)[]
        cells.forEach((cell, idx) => {
          if (keys[idx] === 'medicine') doc.setTextColor(37, 99, 235)
          else if (keys[idx] === 'vet') doc.setTextColor(234, 88, 12)
          else if (keys[idx] === 'total') doc.setTextColor(22, 163, 74)
          else doc.setTextColor(55, 65, 81)
          doc.text(cell, aCols[keys[idx]].x, y)
        })

        y += rowH
      })

      // ── SECTION 4 — DAILY COST BREAKDOWN ──
      y += 12
      if (y > 170) { doc.addPage(); y = 20 }

      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(55, 65, 81)
      doc.text('Daily Cost Breakdown', 15, y - 10)

      const dailyCols = {
        date: { x: 16, w: 28 },
        mDoses: { x: 48, w: 20 },
        mCost: { x: 72, w: 28 },
        eDoses: { x: 104, w: 20 },
        eCost: { x: 128, w: 28 },
        dayTotal: { x: 158, w: 28 },
        cumul: { x: 190, w: 28 },
      }

      const drawDailyHeader = () => {
        doc.setFillColor(239, 68, 68)
        doc.rect(15, y - 6, PW - 30, 8, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
        doc.text('Date', dailyCols.date.x, y)
        doc.text('Morn. Doses', dailyCols.mDoses.x, y)
        doc.text('Morn. Cost', dailyCols.mCost.x, y)
        doc.text('Eve. Doses', dailyCols.eDoses.x, y)
        doc.text('Eve. Cost', dailyCols.eCost.x, y)
        doc.text('Day Total', dailyCols.dayTotal.x, y)
        doc.text('Cumulative', dailyCols.cumul.x, y)
        doc.setFont('helvetica', 'normal')
      }

      drawDailyHeader()
      y += 8

      daily.forEach((row, i) => {
        const mDoses = row.morning.reduce((s, d) => s + doseTotalCount(d), 0)
        const mCost = row.morning.reduce((s, d) => s + d.totalCost, 0)
        const eDoses = row.evening.reduce((s, d) => s + doseTotalCount(d), 0)
        const eCost = row.evening.reduce((s, d) => s + d.totalCost, 0)

        const cells = [
          doc.splitTextToSize(row.date, dailyCols.date.w),
          doc.splitTextToSize(mDoses > 0 ? String(mDoses) : '—', dailyCols.mDoses.w),
          doc.splitTextToSize(mCost > 0 ? `RWF ${mCost.toLocaleString()}` : '—', dailyCols.mCost.w),
          doc.splitTextToSize(eDoses > 0 ? String(eDoses) : '—', dailyCols.eDoses.w),
          doc.splitTextToSize(eCost > 0 ? `RWF ${eCost.toLocaleString()}` : '—', dailyCols.eCost.w),
          doc.splitTextToSize(`RWF ${row.dayTotal.toLocaleString()}`, dailyCols.dayTotal.w),
          doc.splitTextToSize(`RWF ${row.runningTotal.toLocaleString()}`, dailyCols.cumul.w),
        ]
        const rowH = Math.max(...cells.map(c => c.length), 1) * 5 + 4

        if (y + rowH > 195) { doc.addPage(); y = 20; drawDailyHeader(); y += 8 }

        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, PW - 30, rowH, 'F') }
        doc.setDrawColor(226, 232, 240); doc.rect(15, y - 4, PW - 30, rowH)

          ;[44, 68, 100, 124, 154, 186].forEach(sx =>
            doc.line(sx, y - 4, sx, y - 4 + rowH))

        doc.setFontSize(7)
        const keys = Object.keys(dailyCols) as (keyof typeof dailyCols)[]
        cells.forEach((cell, idx) => {
          if (keys[idx] === 'mCost') doc.setTextColor(37, 99, 235)
          else if (keys[idx] === 'eCost') doc.setTextColor(234, 88, 12)
          else if (['dayTotal', 'cumul'].includes(keys[idx])) doc.setTextColor(22, 163, 74)
          else doc.setTextColor(55, 65, 81)
          doc.text(cell, dailyCols[keys[idx]].x, y)
        })

        y += rowH
      })

      // Grand total row
      if (daily.length > 0) {
        const rowH = 10
        if (y + rowH > 195) { doc.addPage(); y = 20 }
        doc.setFillColor(209, 250, 229); doc.rect(15, y - 4, PW - 30, rowH, 'F')
        doc.setDrawColor(16, 185, 129); doc.rect(15, y - 4, PW - 30, rowH)
        doc.setTextColor(4, 120, 87); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
        doc.text('Grand Total', 16, y + 1)
        doc.text(`RWF ${grandTotal.toLocaleString()}`, dailyCols.cumul.x, y + 1)
        y += rowH
      }

      // ── FOOTER on all pages ──
      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        const ph = doc.internal.pageSize.getHeight()
        doc.setFillColor(248, 250, 252); doc.rect(0, ph - 18, PW, 18, 'F')
        doc.setDrawColor(226, 232, 240); doc.line(0, ph - 18, PW, ph - 18)
        doc.setFontSize(7); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal')
        doc.text(`NTDM Animal Hospital | Generated by: ${user?.name || 'Unknown'}`, 15, ph - 7)
        doc.text(`Page ${page} of ${totalPages}`, PW - 15, ph - 7, { align: 'right' })
      }

      doc.save(`disease-report-${caseLabel.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${today}.pdf`)
      setExportOpen(false)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const exportToExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      const caseLabel = exportCaseId === "all" ? "All Cases" : (() => {
        const r = records.find(r => r._id === exportCaseId)
        return r ? `${r.animalName} - ${r.diseaseName}` : "Unknown"
      })()
      const daily = getExportDailyBreakdown()
      const exportRecs = getExportRecords()
      const exportDoses = getExportDoses()

      // Sheet 1 — Disease Cases (ALL columns from the form)
      const casesData = exportRecs.map(r => ({
        Animal: r.animalName || '—',
        'Ear Tag ID': getAnimalEarTagId(r.animalId),
        'Insurance ID': getAnimalInsuranceId(r.animalId),
        Disease: r.diseaseName,
        Symptoms: r.symptoms || '—',
        Treatment: r.treatment || '—',
        Status: r.status,
        'Diagnosed Date': r.diagnosedDate,
        'Resolved Date': r.resolvedDate || '—',
        Veterinarian: r.veterinarianName || '—',
        'Vet Origin': r.vetOrigin || '—',
        Notes: r.notes || '—',
      }))
      const ws1 = XLSX.utils.json_to_sheet(casesData)
      ws1['!cols'] = [20, 18, 22, 28, 35, 35, 18, 16, 16, 22, 24, 35].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws1, 'Disease Cases')

      // Sheet 2 — Full Treatment Doses Log
      const dosesData = exportDoses.map(d => ({
        Date: d.date,
        Session: d.session,
        Animal: d.animalName || '—',
        Disease: d.diseaseName || '—',
        Medicines: (d.medicines && d.medicines.length > 0)
          ? d.medicines.map(m => `${m.medicineName} (${m.doseCount} dose${m.doseCount !== 1 ? 's' : ''}${m.volumeMl ? `, ${m.volumeMl}mL` : ''}, RWF ${m.cost.toLocaleString()})`).join('; ')
          : '—',
        'Total Doses': doseTotalCount(d),
        'Medicine Cost (RWF)': doseMedicineCost(d),
        'Vet Cost (RWF)': d.vetCost,
        'Total Cost (RWF)': d.totalCost,
        Notes: d.notes || '—',
      }))
      const ws2 = XLSX.utils.json_to_sheet(dosesData)
      ws2['!cols'] = [14, 12, 20, 28, 45, 14, 20, 18, 18, 35].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws2, 'Treatment Doses')

      // Sheet 3 — Daily Cost Breakdown
      const dailyData = daily.map(row => {
        const mDoses = row.morning.reduce((s, d) => s + doseTotalCount(d), 0)
        const mCost = row.morning.reduce((s, d) => s + d.totalCost, 0)
        const eDoses = row.evening.reduce((s, d) => s + doseTotalCount(d), 0)
        const eCost = row.evening.reduce((s, d) => s + d.totalCost, 0)
        return {
          Date: row.date,
          'Morning Doses': mDoses || 0,
          'Morning Cost (RWF)': mCost,
          'Evening Doses': eDoses || 0,
          'Evening Cost (RWF)': eCost,
          'Daily Total (RWF)': row.dayTotal,
          'Cumulative Total (RWF)': row.runningTotal,
        }
      })
      const ws3 = XLSX.utils.json_to_sheet(dailyData)
      ws3['!cols'] = [14, 16, 20, 16, 20, 20, 22].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws3, 'Daily Cost Breakdown')

      // Sheet 4 — Per-Animal Summary
      const animalStats: Record<string, { doses: number; medicineCost: number; vetCost: number; totalCost: number; diagnosisCount: number }> = {}
      exportRecs.forEach(r => {
        if (!animalStats[r.animalId]) animalStats[r.animalId] = { doses: 0, medicineCost: 0, vetCost: 0, totalCost: 0, diagnosisCount: 0 }
        animalStats[r.animalId].diagnosisCount += 1
      })
      exportDoses.forEach(d => {
        if (!animalStats[d.animalId]) animalStats[d.animalId] = { doses: 0, medicineCost: 0, vetCost: 0, totalCost: 0, diagnosisCount: 0 }
        animalStats[d.animalId].doses += doseTotalCount(d)
        animalStats[d.animalId].medicineCost += doseMedicineCost(d)
        animalStats[d.animalId].vetCost += d.vetCost
        animalStats[d.animalId].totalCost += d.totalCost
      })
      const animalData = exportRecs
        .filter((r, idx, arr) => arr.findIndex(x => x.animalId === r.animalId) === idx)
        .map(r => ({
          Animal: r.animalName || '—',
          'Ear Tag ID': getAnimalEarTagId(r.animalId),
          'Insurance ID': getAnimalInsuranceId(r.animalId),
          Diagnoses: animalStats[r.animalId]?.diagnosisCount || 0,
          'Total Doses': animalStats[r.animalId]?.doses || 0,
          'Medicine Cost (RWF)': animalStats[r.animalId]?.medicineCost || 0,
          'Vet Cost (RWF)': animalStats[r.animalId]?.vetCost || 0,
          'Total Cost (RWF)': animalStats[r.animalId]?.totalCost || 0,
        }))
        .sort((a, b) => b['Total Cost (RWF)'] - a['Total Cost (RWF)'])
      const ws4 = XLSX.utils.json_to_sheet(animalData)
      ws4['!cols'] = [20, 18, 22, 14, 14, 22, 18, 20].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws4, 'Per-Animal Summary')

      XLSX.writeFile(wb, `disease-report-${caseLabel.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${today}.xlsx`)
      setExportOpen(false)
    } catch (err) {
      console.error('Excel export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl">
          <ShieldAlert className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('farmer.diseases')}</h1>
          <p className="text-sm text-gray-500">Track illnesses, treatment doses, and costs per animal</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-600 to-slate-700 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-300 uppercase font-medium">Total Cases</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </div>
            <Activity className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-100 uppercase font-medium">Active</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-100 uppercase font-medium">In Treatment</p>
              <p className="text-2xl font-bold">{underTreatmentCount}</p>
            </div>
            <Clock className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-100 uppercase font-medium">Total Cost (RWF)</p>
              <p className="text-2xl font-bold">{totalTreatmentCost.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="record">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="record" className="flex items-center gap-1"><Plus className="h-4 w-4" /> Record</TabsTrigger>
          <TabsTrigger value="doses" className="flex items-center gap-1"><Syringe className="h-4 w-4" /> Doses</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1"><History className="h-4 w-4" /> History</TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Reports</TabsTrigger>
        </TabsList>

        {/* ── RECORD TAB ── */}
        <TabsContent value="record">
          <Card className="border-0 shadow-xl bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                {editRecord ? "Edit Disease Record" : "New Disease Record"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Animal *</label>
                  <Select value={animalId} onValueChange={setAnimalId}>
                    <SelectTrigger className={errors.animalId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select animal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {animals.map(a => <SelectItem key={a._id} value={a._id}>{a.name} ({a.type})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.animalId && <p className="text-xs text-red-500">{errors.animalId}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Insurance ID <span className="text-gray-400 text-xs">auto-detected</span></label>
                  <Input
                    readOnly
                    value={insuranceId || (animalId ? "No insurance registered" : "Select an animal first")}
                    className={insuranceId ? "bg-blue-50 text-blue-700 font-medium" : "bg-gray-50 text-gray-400 italic"}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Ear Tag ID <span className="text-gray-400 text-xs">auto-detected</span></label>
                  <Input
                    readOnly
                    value={earTagId || (animalId ? "No ear tag registered" : "Select an animal first")}
                    className={earTagId ? "bg-amber-50 text-amber-700 font-medium" : "bg-gray-50 text-gray-400 italic"}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Disease *</label>
                  <Select value={diseaseName} onValueChange={setDiseaseName}>
                    <SelectTrigger className={errors.diseaseName ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select disease..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_DISEASES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.diseaseName && <p className="text-xs text-red-500">{errors.diseaseName}</p>}
                </div>

                {diseaseName === "Other" && (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Specify Disease *</label>
                    <Input placeholder="Enter disease name..." value={customDisease} onChange={e => setCustomDisease(e.target.value)} className={errors.diseaseName ? "border-red-500" : ""} />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Status *</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Diagnosed Date *</label>
                  <Input type="date" value={diagnosedDate} onChange={e => setDiagnosedDate(e.target.value)} className={errors.diagnosedDate ? "border-red-500" : ""} />
                  {errors.diagnosedDate && <p className="text-xs text-red-500">{errors.diagnosedDate}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Resolved Date <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="date" value={resolvedDate} onChange={e => setResolvedDate(e.target.value)} min={diagnosedDate} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Veterinarian <span className="text-gray-400 text-xs">optional</span></label>
                  <Select value={veterinarianName || "none"} onValueChange={v => setVeterinarianName(v === "none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select veterinarian..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Not assigned —</SelectItem>
                      {doctors.map(d => (
                        <SelectItem key={d._id} value={d.name}>
                          {d.name}{d.specialization ? ` — ${d.specialization}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Vet Origin / Organization <span className="text-gray-400 text-xs">optional</span></label>
                  <Input placeholder="e.g. RAB, MINAGRI, Private Clinic" value={vetOrigin} onChange={e => setVetOrigin(e.target.value)} />

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Symptoms <span className="text-gray-400 text-xs">optional</span></label>
                    <Input placeholder="e.g. fever, loss of appetite, swollen joints..." value={symptoms} onChange={e => setSymptoms(e.target.value)} />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Treatment <span className="text-gray-400 text-xs">optional</span></label>
                    <Input placeholder="e.g. antibiotics, vaccination, isolation..." value={treatment} onChange={e => setTreatment(e.target.value)} />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Notes <span className="text-gray-400 text-xs">optional</span></label>
                    <Input placeholder="Any additional observations..." value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSubmit} disabled={saving} className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl px-6">
                    {saving ? "Saving..." : editRecord ? "Update Record" : "Save Record"}
                  </Button>
                  {editRecord && <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DOSES TAB ── */}
        <TabsContent value="doses">
          <div className="space-y-6">
            {/* Dose form */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  {editDose ? "Edit Treatment Dose" : "Log Treatment Dose"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Disease case selector */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Disease Case *</label>
                    <Select value={doseRecordId} onValueChange={setDoseRecordId}>
                      <SelectTrigger className={doseErrors.doseRecordId ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select disease case..." />
                      </SelectTrigger>
                      <SelectContent>
                        {records.filter(r => r.status === "Under Treatment").map(r => (
                          <SelectItem key={r._id} value={r._id}>
                            {r.animalName} — {r.diseaseName} ({r.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {doseErrors.doseRecordId && <p className="text-xs text-red-500">{doseErrors.doseRecordId}</p>}
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Date *</label>
                    <Input type="date" value={doseDate} onChange={e => setDoseDate(e.target.value)} className={doseErrors.doseDate ? "border-red-500" : ""} />
                    {doseErrors.doseDate && <p className="text-xs text-red-500">{doseErrors.doseDate}</p>}
                  </div>

                  {/* Session */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Session *</label>
                    <Select value={doseSession} onValueChange={setDoseSession}>
                      <SelectTrigger className={doseErrors.doseSession ? "border-red-500" : ""}>
                        <SelectValue placeholder="Morning / Evening" />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {doseErrors.doseSession && <p className="text-xs text-red-500">{doseErrors.doseSession}</p>}
                  </div>

                  {/* Medicines administered */}
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Medicines Administered *</label>
                      <Button type="button" size="sm" variant="outline" onClick={addMedicineRow} className="h-7 text-xs gap-1 rounded-lg">
                        <Plus className="h-3 w-3" /> Add Medicine
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {medicines.map((m, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_90px_110px_110px_36px] gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <Input placeholder="Medicine name, e.g. Oxytetracycline" value={m.medicineName} onChange={e => updateMedicineRow(idx, "medicineName", e.target.value)} />
                          <Input type="number" min="1" placeholder="Doses" value={m.doseCount} onChange={e => updateMedicineRow(idx, "doseCount", e.target.value)} />
                          <Input type="number" min="0" step="0.1" placeholder="Vol (mL)" value={m.volumeMl} onChange={e => updateMedicineRow(idx, "volumeMl", e.target.value)} />
                          <Input type="number" min="0" placeholder="Cost (RWF)" value={m.cost} onChange={e => updateMedicineRow(idx, "cost", e.target.value)} />
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeMedicineRow(idx)} disabled={medicines.length === 1} className="h-9 w-9 p-0 hover:bg-red-50 disabled:opacity-30">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    {doseErrors.medicines && <p className="text-xs text-red-500">{doseErrors.medicines}</p>}
                  </div>

                  {/* Vet cost */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Vet Cost (RWF) <span className="text-gray-400 text-xs">optional</span></label>
                    <Input type="number" min="0" placeholder="0" value={vetCost} onChange={e => setVetCost(e.target.value)} />
                  </div>

                  {/* Auto total */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Total Cost (RWF)</label>
                    <Input readOnly value={(medicinesTotalCost + (Number(vetCost) || 0)).toLocaleString()} className="bg-emerald-50 font-semibold text-emerald-700" />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Notes <span className="text-gray-400 text-xs">optional</span></label>
                    <Input placeholder="Any observations for this dose..." value={doseNotes} onChange={e => setDoseNotes(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleDoseSubmit} disabled={savingDose} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl px-6">
                    {savingDose ? "Saving..." : editDose ? "Update Dose" : "Log Dose"}
                  </Button>
                  {editDose && <Button variant="outline" onClick={resetDoseForm} className="rounded-xl">Cancel</Button>}
                </div>
              </CardContent>
            </Card>

            {/* Dose history table */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    Dose Log
                  </CardTitle>
                  <Select value={filterDoseRecord || "all"} onValueChange={v => setFilterDoseRecord(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-72">
                      <SelectValue placeholder="Filter by case..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cases</SelectItem>
                      {records.map(r => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.animalName} — {r.diseaseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Animal</TableHead>
                        <TableHead>Disease</TableHead>
                        <TableHead>Medicines</TableHead>
                        <TableHead>Med. Cost</TableHead>
                        <TableHead>Vet Cost</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDoses.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-400">No doses logged yet</TableCell></TableRow>
                      ) : filteredDoses.map(d => (
                        <TableRow key={d._id}>
                          <TableCell className="text-sm">{d.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={SESSION_STYLES[d.session] || ""}>{d.session}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{d.animalName || "—"}</TableCell>
                          <TableCell className="text-sm text-gray-600">{d.diseaseName || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {d.medicines && d.medicines.length > 0
                              ? d.medicines.map((m, i) => (
                                <div key={i} className="whitespace-nowrap">
                                  {m.medicineName} <span className="text-gray-400">({m.doseCount} dose{m.doseCount !== 1 ? "s" : ""}{m.volumeMl ? `, ${m.volumeMl}mL` : ""}{m.cost > 0 ? `, RWF ${m.cost.toLocaleString()}` : ""})</span>
                                </div>
                              ))
                              : <span className="text-gray-400">—</span>}
                          </TableCell>
                          <TableCell className="text-sm">{doseMedicineCost(d) > 0 ? doseMedicineCost(d).toLocaleString() : "—"}</TableCell>
                          <TableCell className="text-sm">{d.vetCost > 0 ? d.vetCost.toLocaleString() : "—"}</TableCell>
                          <TableCell className="font-semibold text-emerald-700">{d.totalCost > 0 ? d.totalCost.toLocaleString() : "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEditDose(d)} className="h-8 w-8 p-0 hover:bg-emerald-50">
                                <Pencil className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteDoseId(d._id)} className="h-8 w-8 p-0 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Dose summary footer */}
                {filteredDoses.length > 0 && (
                  <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-wrap gap-6 text-sm">
                    <span className="text-gray-600">Total doses: <strong className="text-gray-900">{filteredDoses.reduce((s, d) => s + doseTotalCount(d), 0)}</strong></span>
                    <span className="text-gray-600">Medicine cost: <strong className="text-gray-900">RWF {filteredDoses.reduce((s, d) => s + doseMedicineCost(d), 0).toLocaleString()}</strong></span>
                    <span className="text-gray-600">Vet cost: <strong className="text-gray-900">RWF {filteredDoses.reduce((s, d) => s + d.vetCost, 0).toLocaleString()}</strong></span>
                    <span className="text-emerald-700 font-semibold">Total: RWF {filteredDoses.reduce((s, d) => s + d.totalCost, 0).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history">
          <Card className="border-0 shadow-xl bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-sky-500 rounded-full" />
                Disease History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl">
                <Select value={filterStatus || "all"} onValueChange={v => setFilterStatus(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterAnimal || "all"} onValueChange={v => setFilterAnimal(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All Animals" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Animals</SelectItem>
                    {animals.map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500 whitespace-nowrap">{filteredRecords.length} found</p>
                  <Button variant="outline" onClick={() => { setFilterStatus(""); setFilterAnimal(""); setFilterMonth("") }} className="rounded-xl text-xs ml-auto">Clear</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Animal</TableHead>
                      <TableHead>Disease</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Diagnosed</TableHead>
                      <TableHead>Resolved</TableHead>
                      <TableHead>Veterinarian</TableHead>
                      <TableHead>Vet Origin</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-400">No records found</TableCell></TableRow>
                    ) : filteredRecords.map(r => (
                      <TableRow key={r._id}>
                        <TableCell className="font-medium">{r.animalName || "—"}</TableCell>
                        <TableCell className="font-semibold text-gray-800">{r.diseaseName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_STYLES[r.status] || ""}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.diagnosedDate}</TableCell>
                        <TableCell className="text-sm">{r.resolvedDate || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-sm">{r.veterinarianName || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-sm">{r.vetOrigin || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[140px] truncate">{r.treatment || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(r)} className="h-8 w-8 p-0 hover:bg-emerald-50">
                              <Pencil className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteId(r._id)} className="h-8 w-8 p-0 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
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

        {/* ── REPORTS TAB ── */}
        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Export button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setExportOpen(true)}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl gap-2"
              >
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
            {/* Daily cost breakdown */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    Daily Treatment Cost
                  </CardTitle>
                  <Select value={reportCaseId || "all"} onValueChange={v => setReportCaseId(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full sm:w-80">
                      <SelectValue placeholder="All cases" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cases</SelectItem>
                      {records.map(r => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.animalName} — {r.diseaseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {dailyCostBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No cost data yet — log doses to see the breakdown</div>
                ) : (
                  <>
                    {/* Bar chart — daily cost */}
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={dailyCostBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [`RWF ${Number(v).toLocaleString()}`, "Daily Cost"]} />
                        <Bar dataKey="dayTotal" fill="#16a34a" radius={[4, 4, 0, 0]} name="Daily Cost" />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Daily breakdown table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Morning Doses</TableHead>
                            <TableHead>Morning Cost</TableHead>
                            <TableHead>Evening Doses</TableHead>
                            <TableHead>Evening Cost</TableHead>
                            <TableHead>Daily Total</TableHead>
                            <TableHead>Cumulative Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailyCostBreakdown.map((row, i) => {
                            const mDoses = row.morning.reduce((s, d) => s + doseTotalCount(d), 0)
                            const mCost = row.morning.reduce((s, d) => s + d.totalCost, 0)
                            const eDoses = row.evening.reduce((s, d) => s + doseTotalCount(d), 0)
                            const eCost = row.evening.reduce((s, d) => s + d.totalCost, 0)
                            return (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{row.date}</TableCell>
                                <TableCell className="text-center">
                                  {mDoses > 0
                                    ? <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{mDoses} dose{mDoses !== 1 ? "s" : ""}</Badge>
                                    : <span className="text-gray-300">—</span>}
                                </TableCell>
                                <TableCell className="text-sm">{mCost > 0 ? `RWF ${mCost.toLocaleString()}` : <span className="text-gray-300">—</span>}</TableCell>
                                <TableCell className="text-center">
                                  {eDoses > 0
                                    ? <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">{eDoses} dose{eDoses !== 1 ? "s" : ""}</Badge>
                                    : <span className="text-gray-300">—</span>}
                                </TableCell>
                                <TableCell className="text-sm">{eCost > 0 ? `RWF ${eCost.toLocaleString()}` : <span className="text-gray-300">—</span>}</TableCell>
                                <TableCell className="font-semibold text-gray-800">RWF {row.dayTotal.toLocaleString()}</TableCell>
                                <TableCell className="font-bold text-emerald-700">RWF {row.runningTotal.toLocaleString()}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Grand total footer */}
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-gray-500 text-xs uppercase font-medium">Treatment Days</p>
                        <p className="text-xl font-bold text-gray-900">{dailyCostBreakdown.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase font-medium">Total Doses</p>
                        <p className="text-xl font-bold text-gray-900">
                          {dailyCostBreakdown.reduce((s, r) => s + r.morning.reduce((a, d) => a + doseTotalCount(d), 0) + r.evening.reduce((a, d) => a + doseTotalCount(d), 0), 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase font-medium">Avg Daily Cost</p>
                        <p className="text-xl font-bold text-gray-900">
                          RWF {dailyCostBreakdown.length > 0 ? Math.round(dailyCostBreakdown[dailyCostBreakdown.length - 1].runningTotal / dailyCostBreakdown.length).toLocaleString() : 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase font-medium">Grand Total</p>
                        <p className="text-xl font-bold text-emerald-700">
                          RWF {dailyCostBreakdown.length > 0 ? dailyCostBreakdown[dailyCostBreakdown.length - 1].runningTotal.toLocaleString() : 0}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Cost per animal summary */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  Total Cost per Animal
                </CardTitle>
              </CardHeader>
              <CardContent>
                {costPerAnimal.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No cost data yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Animal</TableHead>
                          <TableHead>Total Doses</TableHead>
                          <TableHead>Medicine Cost (RWF)</TableHead>
                          <TableHead>Vet Cost (RWF)</TableHead>
                          <TableHead>Total Cost (RWF)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costPerAnimal.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.animalName}</TableCell>
                            <TableCell>{row.doses}</TableCell>
                            <TableCell>{row.medicineCost.toLocaleString()}</TableCell>
                            <TableCell>{row.vetCost.toLocaleString()}</TableCell>
                            <TableCell className="font-bold text-emerald-700">{row.total.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status breakdown pie */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                        {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Most frequent diseases */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  Most Frequent Diseases
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diseaseFrequency.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={diseaseFrequency} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-500" />
              Export Disease Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Disease Case</label>
              <Select value={exportCaseId} onValueChange={setExportCaseId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cases</SelectItem>
                  {records.map(r => (
                    <SelectItem key={r._id} value={r._id}>
                      {r.animalName} — {r.diseaseName} ({r.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview summary */}
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              {(() => {
                const previewRecs = getExportRecords()
                const previewDoses = getExportDoses()
                const previewDaily = getExportDailyBreakdown()
                const grandTotal = previewDaily.length > 0 ? previewDaily[previewDaily.length - 1].runningTotal : 0
                return (
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-red-700">Preview</p>
                    <p className="text-gray-600">
                      {previewRecs.length} case{previewRecs.length !== 1 ? 's' : ''} &bull; {previewDoses.reduce((s, d) => s + doseTotalCount(d), 0)} doses &bull; {previewDaily.length} treatment day{previewDaily.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-gray-600">Total cost: <strong className="text-emerald-700">RWF {grandTotal.toLocaleString()}</strong></p>
                  </div>
                )
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline" onClick={() => setExportOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                onClick={exportToExcel}
                disabled={exporting}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Excel'}
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={exporting}
                className="col-span-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white gap-2"
              >
                <FileText className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete disease dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Disease Record</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dose dialog */}
      <AlertDialog open={!!deleteDoseId} onOpenChange={open => !open && setDeleteDoseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dose Record</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this dose entry? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDoseId && handleDeleteDose(deleteDoseId)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
