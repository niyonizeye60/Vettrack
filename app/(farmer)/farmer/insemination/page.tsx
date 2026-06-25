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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Syringe, Plus, Pencil, Trash2, History, ChevronDown, Baby, FlaskConical, BarChart3, Download, FileText } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Animal { _id: string; name: string; type: string; gender?: string | null; insuranceId?: string | null; earTagId?: string | null }
interface Vet { _id: string; name: string; specialization: string }
interface InseminationRecord {
  _id: string
  animalId: string | null
  animalName: string | null
  semenTypes: string[]
  semenPrice: number | null
  vetPrice: number | null
  injectionTime: string | null
  expectedBirthDate: string | null
  deliveredBabies: number | null
  vetName: string | null
  vetOrigin: string | null
  date: string
  notes: string | null
  previousRecordId?: string | null
  pregnancyFailed?: boolean | null
}

const SEMEN_TYPES = ["Sexed Freisian", "Sexed Jersey", "Ordinary Freisian", "Ordinary Jersey", "Fleckv", "Girolando"]

const today = new Date().toISOString().split("T")[0]

function BirthCountdown({ targetDate }: { targetDate: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const target = new Date(targetDate).setHours(0, 0, 0, 0)
  const diff = target - now

  if (diff <= 0) {
    const overMs = Math.abs(diff)
    const overDays = Math.floor(overMs / (1000 * 60 * 60 * 24))
    const overHrs = Math.floor((overMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const overMins = Math.floor((overMs % (1000 * 60 * 60)) / (1000 * 60))
    const overSecs = Math.floor((overMs % (1000 * 60)) / 1000)
    return (
      <div className="text-center">
        <span className="text-xs text-red-600 font-semibold block">{targetDate}</span>
        <span className="text-xs text-red-500 font-mono">
          {overDays}d {overHrs}h {overSecs}s overdue
        </span>
      </div>
    )
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const secs = Math.floor((diff % (1000 * 60)) / 1000)

  const urgency = days <= 7 ? "text-amber-600" : "text-emerald-600"

  return (
    <div className="text-center">
      {/* <span className="text-xs text-gray-500 block">{targetDate}</span> */}
      <span className={`text-xs font-mono font-semibold ${urgency}`}>
        {days}d {hrs}h {mins}m {secs}s
      </span>
    </div>
  )
}

export default function InseminationPage() {
  const [user, setUser] = useState<any>(null)
  const [animals, setAnimals] = useState<Animal[]>([])
  const [vets, setVets] = useState<Vet[]>([])
  // include females + animals with undefined/null gender (exclude confirmed males)
  const femaleAnimals = animals.filter(a => a.gender !== "male")
  const [records, setRecords] = useState<InseminationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editRecord, setEditRecord] = useState<InseminationRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [genderAlertAnimal, setGenderAlertAnimal] = useState<Animal | null>(null)
  const [semenTypeOpen, setSemenTypeOpen] = useState(false)
  const [reinseminateFrom, setReinseminateFrom] = useState<InseminationRecord | null>(null)
  const [reinseminateConfirm, setReinseminateConfirm] = useState<InseminationRecord | null>(null)
  const [activeTab, setActiveTab] = useState("record")

  // Form fields
  const [animalId, setAnimalId] = useState("")
  const [semenTypes, setSemenTypes] = useState<string[]>([])
  const [semenPrice, setSemenPrice] = useState("")
  const [vetPrice, setVetPrice] = useState("")
  const [injectionTime, setInjectionTime] = useState("")
  const [expectedBirthDate, setExpectedBirthDate] = useState("")
  const [deliveredBabies, setDeliveredBabies] = useState("")
  const [vetName, setVetName] = useState("")
  const [vetOrigin, setVetOrigin] = useState("")
  const [insuranceId, setInsuranceId] = useState("")
  const [earTagId, setEarTagId] = useState("")
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pregnant animal IDs — those with a future expectedBirthDate, no deliveredBabies yet,
  // and not explicitly marked as a failed pregnancy (which frees the animal up for re-insemination)
  const pregnantAnimalIds = useMemo(() => {
    const now = today
    return new Set(
      records
        .filter(r => r.animalId && r.expectedBirthDate && r.expectedBirthDate >= now && !r.deliveredBabies && !r.pregnancyFailed)
        .map(r => r.animalId as string)
    )
  }, [records])

  const availableAnimals = useMemo(
    () => femaleAnimals.filter(a => !pregnantAnimalIds.has(a._id) || a._id === animalId),
    [femaleAnimals, pregnantAnimalIds, animalId]
  )

  const calcExpectedBirth = (insemDate: string) => {
    if (!insemDate) return ""
    const d = new Date(insemDate)
    d.setDate(d.getDate() + 283)
    return d.toISOString().split("T")[0]
  }

  const handleDateChange = (val: string) => {
    setDate(val)
    const selectedAnimal = animals.find(a => a._id === animalId)
    if (selectedAnimal?.type?.toLowerCase() === "cow") {
      setExpectedBirthDate(calcExpectedBirth(val))
    }
  }

  const handleAnimalChange = (val: string) => {
    setAnimalId(val)
    const selectedAnimal = animals.find(a => a._id === val)
    setInsuranceId(selectedAnimal?.insuranceId || "")
    setEarTagId(selectedAnimal?.earTagId || "")
    if (selectedAnimal?.type?.toLowerCase() === "cow" && date) {
      setExpectedBirthDate(calcExpectedBirth(date))
    }
  }

  const birthCountdown = useMemo(() => {
    if (!expectedBirthDate) return null
    const diff = Math.ceil((new Date(expectedBirthDate).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
    return diff
  }, [expectedBirthDate])

  // Filters
  const [filterAnimal, setFilterAnimal] = useState("")
  const [filterMonth, setFilterMonth] = useState("")

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setUser(userData)
      const animalsData = await getAnimals(userData._id.toString())
      setAnimals(animalsData)
      const vetsData = await getDoctorsList()
      setVets(vetsData)
      await fetchRecords(userData._id.toString())
      setLoading(false)
    }
    init()
  }, [])

  const fetchRecords = async (farmerId: string) => {
    const res = await fetch(`/api/insemination?farmerId=${farmerId}`)
    const data = await res.json()
    setRecords(Array.isArray(data) ? data : [])
  }

  const filteredRecords = useMemo(() => {
    let data = [...records]
    if (filterAnimal) data = data.filter(r => r.animalId === filterAnimal)
    if (filterMonth) data = data.filter(r => r.date.startsWith(filterMonth))
    return data
  }, [records, filterAnimal, filterMonth])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!animalId) e.animalId = "Select an animal"
    if (!semenTypes.length) e.semenTypes = "Select at least one semen type"
    if (!date) e.date = "Select a date"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const resetForm = () => {
    setAnimalId(""); setInsuranceId(""); setEarTagId(""); setSemenTypes([]); setSemenPrice(""); setVetPrice("")
    setInjectionTime(""); setExpectedBirthDate(""); setDeliveredBabies(""); setVetName(""); setVetOrigin("")
    setDate(today); setNotes(""); setErrors({}); setEditRecord(null)
    setSemenTypeOpen(false); setReinseminateFrom(null)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    // Block save if selected animal has no gender defined
    const selectedAnimal = animals.find(a => a._id === animalId)
    if (selectedAnimal && !selectedAnimal.gender) {
      setGenderAlertAnimal(selectedAnimal)
      return
    }
    setSaving(true)
    const animal = animals.find(a => a._id === animalId)
    const body = {
      farmerId: user._id.toString(),
      animalId: animalId || null,
      animalName: animal?.name || null,
      semenTypes, semenPrice, vetPrice, injectionTime,
      expectedBirthDate, deliveredBabies: deliveredBabies ? Number(deliveredBabies) : null,
      vetName, vetOrigin, date, notes,
      // Preserve lineage/outcome on edit; attach lineage to the previous attempt when re-inseminating
      previousRecordId: editRecord ? (editRecord.previousRecordId || null) : (reinseminateFrom?._id || null),
      pregnancyFailed: editRecord ? !!editRecord.pregnancyFailed : false,
    }

    if (editRecord) {
      await fetch("/api/insemination", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editRecord._id, ...body }) })
    } else {
      await fetch("/api/insemination", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchRecords(user._id.toString())
    resetForm()
    setSaving(false)
  }

  // Mark the previous attempt as a failed pregnancy (keeping it in history) and
  // pre-fill a fresh insemination record for the same animal.
  const handleReinseminate = async (r: InseminationRecord) => {
    await fetch("/api/insemination", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: r._id,
        animalId: r.animalId, animalName: r.animalName, semenTypes: r.semenTypes,
        semenPrice: r.semenPrice, vetPrice: r.vetPrice, injectionTime: r.injectionTime,
        expectedBirthDate: r.expectedBirthDate, deliveredBabies: r.deliveredBabies,
        vetName: r.vetName, vetOrigin: r.vetOrigin, date: r.date, notes: r.notes,
        previousRecordId: r.previousRecordId || null,
        pregnancyFailed: true,
      }),
    })
    await fetchRecords(user._id.toString())

    resetForm()
    setReinseminateFrom(r)
    setAnimalId(r.animalId || "")
    const animal = animals.find(a => a._id === r.animalId)
    setInsuranceId(animal?.insuranceId || "")
    setEarTagId(animal?.earTagId || "")
    if (animal?.type?.toLowerCase() === "cow") setExpectedBirthDate(calcExpectedBirth(today))
    setActiveTab("record")
  }

  const handleEdit = (r: InseminationRecord) => {
    setEditRecord(r)
    setAnimalId(r.animalId || "")
    setInsuranceId(animals.find(a => a._id === r.animalId)?.insuranceId || "")
    setEarTagId(animals.find(a => a._id === r.animalId)?.earTagId || "")
    setSemenTypes(r.semenTypes || [])
    setSemenPrice(r.semenPrice != null ? String(r.semenPrice) : "")
    setVetPrice(r.vetPrice != null ? String(r.vetPrice) : "")
    setInjectionTime(r.injectionTime || "")
    setExpectedBirthDate(r.expectedBirthDate || "")
    setDeliveredBabies(r.deliveredBabies != null ? String(r.deliveredBabies) : "")
    setVetName(r.vetName || "")
    setVetOrigin(r.vetOrigin || "")
    setDate(r.date)
    setNotes(r.notes || "")
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/insemination?id=${id}`, { method: "DELETE" })
    await fetchRecords(user._id.toString())
    setDeleteId(null)
  }

  const totalCost = useMemo(() =>
    filteredRecords.reduce((s, r) => s + (r.semenPrice || 0) + (r.vetPrice || 0), 0),
    [filteredRecords]
  )

  const upcoming = useMemo(() =>
    records.filter(r => r.expectedBirthDate && new Date(r.expectedBirthDate) >= new Date()).length,
    [records]
  )

  const totalBabies = useMemo(() =>
    records.reduce((s, r) => s + (r.deliveredBabies || 0), 0),
    [records]
  )

  // Per-cow summary for reports
  const summarizeByAnimal = (list: InseminationRecord[]) => {
    const map: Record<string, { name: string; inseminations: number; failedAttempts: number; babies: number; totalCost: number; lastDate: string }> = {}
    list.forEach(r => {
      const key = r.animalId || "general"
      if (!map[key]) map[key] = { name: r.animalName || "General", inseminations: 0, failedAttempts: 0, babies: 0, totalCost: 0, lastDate: "" }
      map[key].inseminations += 1
      if (r.pregnancyFailed) map[key].failedAttempts += 1
      map[key].babies += r.deliveredBabies || 0
      map[key].totalCost += (r.semenPrice || 0) + (r.vetPrice || 0)
      if (!map[key].lastDate || r.date > map[key].lastDate) map[key].lastDate = r.date
    })
    return Object.values(map).sort((a, b) => b.inseminations - a.inseminations)
  }

  const cowSummary = useMemo(() => summarizeByAnimal(records), [records])

  const getAnimalInsuranceId = (id: string | null) =>
    animals.find(a => a._id === id)?.insuranceId || "—"

  // Export
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportAnimalFilter, setExportAnimalFilter] = useState("")

  const exportFilteredRecords = useMemo(
    () => exportAnimalFilter ? records.filter(r => r.animalId === exportAnimalFilter) : records,
    [records, exportAnimalFilter]
  )
  const exportSummary = useMemo(() => summarizeByAnimal(exportFilteredRecords), [exportFilteredRecords])
  const exportTotalBabies = useMemo(
    () => exportFilteredRecords.reduce((s, r) => s + (r.deliveredBabies || 0), 0),
    [exportFilteredRecords]
  )
  const exportTotalCost = useMemo(
    () => exportFilteredRecords.reduce((s, r) => s + (r.semenPrice || 0) + (r.vetPrice || 0), 0),
    [exportFilteredRecords]
  )
  const exportAnimalName = exportAnimalFilter ? animals.find(a => a._id === exportAnimalFilter)?.name || "" : ""

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF()

      // Header
      doc.setFillColor(22, 163, 74)
      doc.rect(0, 0, 210, 38, "F")
      try {
        const logoImg = new Image(); logoImg.crossOrigin = "anonymous"; logoImg.src = "/logo/NTDM.png"
        await new Promise((res, rej) => { logoImg.onload = res; logoImg.onerror = rej })
        doc.addImage(logoImg, "PNG", 15, 7, 22, 22)
      } catch { }
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16); doc.setFont("helvetica", "bold")
      doc.text(exportAnimalName ? `Insemination Report — ${exportAnimalName}` : "Insemination Report", 45, 18)
      doc.setFontSize(10); doc.setFont("helvetica", "normal")
      doc.text("NTDM Animal Hospital", 45, 27)

      // Meta
      doc.setTextColor(55, 65, 81); doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 50)
      doc.text(`Generated by: ${user?.name || "Unknown"}`, 15, 58)

      // Summary box
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240)
      doc.rect(15, 66, 180, 28, "FD")
      doc.setTextColor(22, 163, 74); doc.setFontSize(11); doc.setFont("helvetica", "bold")
      doc.text("Summary", 20, 77)
      doc.setTextColor(55, 65, 81); doc.setFont("helvetica", "normal"); doc.setFontSize(10)
      doc.text(`Total Records: ${exportFilteredRecords.length}`, 20, 87)
      doc.text(`Total Babies Delivered: ${exportTotalBabies}`, 80, 87)
      doc.text(`Total Cost: RWF ${exportTotalCost.toLocaleString()}`, 145, 87)

      // Per-cow summary table
      let y = 106

      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(55, 65, 81)
      doc.text("Animal Details", 15, y - 4)
      y += 6

      const summaryCols = {
        animal: { x: 17, width: 20 },
        insurance: { x: 39, width: 22 },
        earTag: { x: 63, width: 18 },
        inseminations: { x: 84, width: 16 },
        failed: { x: 103, width: 14 },
        babies: { x: 120, width: 14 },
        cost: { x: 138, width: 26 },
      }

      doc.setFillColor(22, 163, 74)
      doc.rect(15, y - 6, 180, 8, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8); doc.setFont("helvetica", "bold")
      doc.text("Animal", summaryCols.animal.x, y)
      doc.text("Insurance ID", summaryCols.insurance.x, y)
      doc.text("Ear Tag ID", summaryCols.earTag.x, y)
      doc.text("Insem.", summaryCols.inseminations.x, y)
      doc.text("Failed", summaryCols.failed.x, y)
      doc.text("Babies", summaryCols.babies.x, y)
      doc.text("Cost", summaryCols.cost.x, y)
      doc.setFont("helvetica", "normal")
      y += 8

      exportSummary.forEach((c, i) => {
        const animal = animals.find(a => a.name === c.name)

        const animalLines = doc.splitTextToSize(c.name || "—", summaryCols.animal.width)
        const insuranceLines = doc.splitTextToSize(animal?.insuranceId || "—", summaryCols.insurance.width)
        const earTagLines = doc.splitTextToSize(animal?.earTagId || "—", summaryCols.earTag.width)

        const rowHeight = Math.max(animalLines.length, insuranceLines.length, earTagLines.length, 1) * 5 + 4

        if (y + rowHeight > 270) { doc.addPage(); y = 20 }

        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, 180, rowHeight, "F") }
        doc.setDrawColor(226, 232, 240); doc.rect(15, y - 4, 180, rowHeight)
        doc.setTextColor(55, 65, 81)
        doc.text(animalLines, summaryCols.animal.x, y)
        doc.text(insuranceLines, summaryCols.insurance.x, y)
        doc.text(earTagLines, summaryCols.earTag.x, y)
        doc.text(String(c.inseminations), summaryCols.inseminations.x, y)
        doc.setTextColor(220, 38, 38)
        doc.text(c.failedAttempts > 0 ? String(c.failedAttempts) : "—", summaryCols.failed.x, y)
        doc.setTextColor(22, 163, 74)
        doc.text(String(c.babies), summaryCols.babies.x, y)
        doc.setTextColor(55, 65, 81)
        doc.text(c.totalCost > 0 ? c.totalCost.toLocaleString() : "—", summaryCols.cost.x, y)
        y += rowHeight
      })

      // Detailed records section
      y += 16
      if (y > 240) { doc.addPage(); y = 20 }

      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(55, 65, 81)
      doc.text("Semen Details & Days to Birth", 15, y - 4)
      y += 6

      // ── Column layout (narrowed to fit new "Days to Birth" column) ──
      const detailCols = {
        date: { x: 18, width: 18 },
        animal: { x: 37, width: 20 },
        semen: { x: 58, width: 26 },
        semenPrice: { x: 86, width: 17 },
        vetPrice: { x: 105, width: 15 },
        expectedBirth: { x: 122, width: 24 },
        babies: { x: 150, width: 10 },
        daysToBirth: { x: 162, width: 33 },
      }

      const drawDetailHeader = () => {
        doc.setFillColor(22, 163, 74)
        doc.rect(15, y - 6, 180, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8); doc.setFont("helvetica", "bold")
        doc.text("Date", detailCols.date.x, y)
        doc.text("Animal", detailCols.animal.x, y)
        doc.text("Semen Type", detailCols.semen.x, y)
        doc.text("Semen Price", detailCols.semenPrice.x, y)
        doc.text("Vet Price", detailCols.vetPrice.x, y)
        doc.text("Exp. Birth", detailCols.expectedBirth.x, y)
        doc.text("Babies", detailCols.babies.x, y)
        doc.text("Outcome", detailCols.daysToBirth.x, y)
        doc.setFont("helvetica", "normal")
        y += 8
      }

      drawDetailHeader()

      exportFilteredRecords.forEach((r, i) => {
        const semenText = Array.isArray(r.semenTypes) ? r.semenTypes.join(", ") : r.semenTypes || "—"
        const semenLines = doc.splitTextToSize(semenText, detailCols.semen.width)
        const animalLines = doc.splitTextToSize(r.animalName || "General", detailCols.animal.width)
        const rowHeight = Math.max(semenLines.length, animalLines.length, 1) * 5 + 4

        // ── Compute days to birth ──────────────────────────────────────
        let daysToBirthText = "—"
        let daysToBirthColor: [number, number, number] = [156, 163, 175] // gray

        if (r.pregnancyFailed) {
          daysToBirthText = "Not Pregnant"
          daysToBirthColor = [220, 38, 38]   // red
        } else if (r.expectedBirthDate && r.deliveredBabies == null) {
          const diffDays = Math.ceil(
            (new Date(r.expectedBirthDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0))
            / (1000 * 60 * 60 * 24)
          )
          if (diffDays > 7) {
            daysToBirthText = `${diffDays}d remaining`
            daysToBirthColor = [22, 163, 74]   // green
          } else if (diffDays >= 0) {
            daysToBirthText = diffDays === 0 ? "Due today!" : `${diffDays}d remaining`
            daysToBirthColor = [217, 119, 6]   // amber
          } else {
            daysToBirthText = `${Math.abs(diffDays)}d overdue`
            daysToBirthColor = [220, 38, 38]   // red
          }
        } else if (r.deliveredBabies != null) {
          daysToBirthText = "Delivered"
          daysToBirthColor = [100, 116, 139]   // slate
        }
        // ──────────────────────────────────────────────────────────────

        if (y + rowHeight > 270) {
          doc.addPage()
          y = 20
          drawDetailHeader()
        }

        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, 180, rowHeight, "F") }
        doc.setDrawColor(226, 232, 240); doc.rect(15, y - 4, 180, rowHeight)

        doc.setTextColor(55, 65, 81)
        doc.text(new Date(r.date).toLocaleDateString(), detailCols.date.x, y)
        doc.text(animalLines, detailCols.animal.x, y)
        doc.text(semenLines, detailCols.semen.x, y)
        doc.text(r.semenPrice != null ? r.semenPrice.toLocaleString() : "—", detailCols.semenPrice.x, y)
        doc.text(r.vetPrice != null ? r.vetPrice.toLocaleString() : "—", detailCols.vetPrice.x, y)
        doc.text(r.expectedBirthDate || "—", detailCols.expectedBirth.x, y)

        doc.setTextColor(22, 163, 74)
        doc.text(r.deliveredBabies != null ? String(r.deliveredBabies) : "—", detailCols.babies.x, y)

        // ── Render Days to Birth with its color ──
        doc.setTextColor(...daysToBirthColor)
        doc.text(daysToBirthText, detailCols.daysToBirth.x, y)

        y += rowHeight
      })

      // ── Third table: Vet & Injection Details ──────────────────────────
      y += 16
      if (y > 240) { doc.addPage(); y = 20 }

      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(55, 65, 81)
      doc.text("Vet & Injection Details", 15, y - 4)
      y += 6

      const vetCols = {
        animal: { x: 18, width: 30 },
        vetName: { x: 50, width: 40 },
        vetOrigin: { x: 92, width: 45 },
        injection: { x: 139, width: 25 },
        notes: { x: 166, width: 29 },
      }

      const drawVetHeader = () => {
        doc.setFillColor(22, 163, 74)
        doc.rect(15, y - 6, 180, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8); doc.setFont("helvetica", "bold")
        doc.text("Animal", vetCols.animal.x, y)
        doc.text("Vet Name", vetCols.vetName.x, y)
        doc.text("Organization", vetCols.vetOrigin.x, y)
        doc.text("Injection Time", vetCols.injection.x, y)
        doc.text("Notes", vetCols.notes.x, y)
        doc.setFont("helvetica", "normal")
        y += 8
      }

      drawVetHeader()

      exportFilteredRecords.forEach((r, i) => {
        const animalLines = doc.splitTextToSize(r.animalName || "General", vetCols.animal.width)
        const vetNameLines = doc.splitTextToSize(r.vetName || "—", vetCols.vetName.width)
        const originLines = doc.splitTextToSize(r.vetOrigin || "—", vetCols.vetOrigin.width)
        const notesLines = doc.splitTextToSize(r.notes || "—", vetCols.notes.width)
        const rowHeight = Math.max(animalLines.length, vetNameLines.length, originLines.length, notesLines.length, 1) * 5 + 4

        if (y + rowHeight > 270) {
          doc.addPage(); y = 20
          drawVetHeader()
        }

        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, 180, rowHeight, "F") }
        doc.setDrawColor(226, 232, 240); doc.rect(15, y - 4, 180, rowHeight)
        doc.setTextColor(55, 65, 81)
        doc.text(animalLines, vetCols.animal.x, y)
        doc.text(vetNameLines, vetCols.vetName.x, y)
        doc.text(originLines, vetCols.vetOrigin.x, y)
        doc.text(r.injectionTime || "—", vetCols.injection.x, y)
        doc.text(notesLines, vetCols.notes.x, y)
        y += rowHeight
      })
      // ──────────────────────────────────────────────────────────────────

      // Footer
      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        doc.setFillColor(248, 250, 252)
        doc.rect(0, pageHeight - 18, pageWidth, 18, "F")
        doc.setDrawColor(226, 232, 240)
        doc.line(0, pageHeight - 18, pageWidth, pageHeight - 18)
        doc.setFontSize(7); doc.setTextColor(107, 114, 128)
        doc.text(`NTDM Animal Hospital | Generated by: ${user?.name || "Unknown"}`, 15, pageHeight - 7)
        doc.text(`Page ${page} of ${totalPages}`, pageWidth - 15, pageHeight - 7, { align: "right" })
      }

      const pdfSuffix = exportAnimalName ? `-${exportAnimalName.replace(/\s+/g, "_")}` : ""
      doc.save(`insemination-report${pdfSuffix}-${today}.pdf`)
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

      // Sheet 1 — Per-cow summary with babies counter
      const summaryData = exportSummary.map(c => ({
        Animal: c.name,
        "Insurance ID": animals.find(a => a.name === c.name)?.insuranceId || "—",
        "Ear Tag ID": animals.find(a => a.name === c.name)?.earTagId || "—",
        "Total Inseminations": c.inseminations,
        "Failed Attempts": c.failedAttempts,
        "Calfs Born": c.babies,
        "Total Cost (RWF)": c.totalCost,
        "Last Insemination": c.lastDate,
      }))
      const ws1 = XLSX.utils.json_to_sheet(summaryData)
      ws1["!cols"] = [20, 22, 22, 14, 14, 20, 20].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws1, "Per-Cow Summary")

      // Sheet 2 — All records
      const recordsData = exportFilteredRecords.map(r => ({
        Date: r.date,
        Animal: r.animalName || "General",
        "Insurance ID": getAnimalInsuranceId(r.animalId),
        "Ear Tag ID": animals.find(a => a._id === r.animalId)?.earTagId || "—",
        "Semen Types": (r.semenTypes || []).join(", "),
        "Semen Price (RWF)": r.semenPrice ?? "—",
        "Vet Price (RWF)": r.vetPrice ?? "—",
        "Injection Time": r.injectionTime || "—",
        "Expected Birth Date": r.expectedBirthDate || "—",
        "Babies Delivered": r.deliveredBabies ?? "—",
        Outcome: r.pregnancyFailed ? "Not Pregnant" : r.deliveredBabies != null ? "Delivered" : "Pending",
        "Re-attempt Of": r.previousRecordId ? (records.find(x => x._id === r.previousRecordId)?.date || "—") : "—",
        Vet: r.vetName || "—",
        Organization: r.vetOrigin || "—",
        Notes: r.notes || "—",
      }))
      const ws2 = XLSX.utils.json_to_sheet(recordsData)
      ws2["!cols"] = [14, 18, 22, 22, 18, 16, 16, 20, 18, 20, 16, 16, 22, 30].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws2, "All Records")

      // Sheet 3 — Vet & Injection Details
      const vetData = exportFilteredRecords.map(r => ({
        Date: r.date,
        Animal: r.animalName || "General",
        "Vet Name": r.vetName || "—",
        "Organization": r.vetOrigin || "—",
        "Injection Time": r.injectionTime || "—",
        Notes: r.notes || "—",
      }))
      const ws3 = XLSX.utils.json_to_sheet(vetData)
      ws3["!cols"] = [14, 22, 28, 32, 18, 40].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws3, "Vet & Injection Details")

      const excelSuffix = exportAnimalName ? `-${exportAnimalName.replace(/\s+/g, "_")}` : ""
      XLSX.writeFile(wb, `insemination-report${excelSuffix}-${today}.xlsx`)
      setExportOpen(false)
    } catch (err) {
      console.error("Excel export failed:", err)
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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl">
          <Syringe className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insemination</h1>
          <p className="text-sm text-gray-500">Track artificial insemination records</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-100 uppercase font-medium">Total Records</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </div>
            <Syringe className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-100 uppercase font-medium">Total Cost (RWF)</p>
              <p className="text-2xl font-bold">{totalCost.toLocaleString()}</p>
            </div>
            <FlaskConical className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-100 uppercase font-medium">Expected Births</p>
              <p className="text-2xl font-bold">{upcoming}</p>
            </div>
            <Baby className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-sky-100 uppercase font-medium">Calf(s) Born</p>
              <p className="text-2xl font-bold">{totalBabies}</p>
            </div>
            <Baby className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="record" className="flex items-center gap-1"><Plus className="h-4 w-4" /> Record</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1"><History className="h-4 w-4" /> History</TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Reports</TabsTrigger>
        </TabsList>

        {/* RECORD TAB */}
        <TabsContent value="record">
          <Card className="border-0 shadow-xl bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                {editRecord ? "Edit Insemination Record" : "New Insemination Record"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reinseminateFrom && (
                <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <span>
                    Re-inseminating <strong>{reinseminateFrom.animalName || "this animal"}</strong> — the attempt on {reinseminateFrom.date} did not result in pregnancy. That record has been kept in History.
                  </span>
                  <Button size="sm" variant="ghost" onClick={resetForm} className="text-amber-700 hover:bg-amber-100 shrink-0">Cancel</Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Animal — only non-pregnant females */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Animal *</label>
                  <Select value={animalId} onValueChange={handleAnimalChange} disabled={availableAnimals.length === 0}>
                    <SelectTrigger className={errors.animalId ? "border-red-500" : ""}>
                      <SelectValue placeholder={
                        availableAnimals.length === 0
                          ? (femaleAnimals.length === 0 ? "No animals registered" : "All animals are pregnant")
                          : "Select animal..."
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAnimals.map(a => (
                        <SelectItem key={a._id} value={a._id}>{a.name} ({a.type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableAnimals.length === 0
                    ? (
                      femaleAnimals.length === 0
                        ? <p className="text-xs text-red-500">Please register animals first</p>
                        : <p className="text-xs text-amber-600">All animals are pregnant</p>
                    )
                    : pregnantAnimalIds.size > 0 && <p className="text-xs text-amber-600">{pregnantAnimalIds.size} animal(s) hidden — currently pregnant</p>
                  }
                  {animalId && !animals.find(a => a._id === animalId)?.gender && (
                    <p className="text-xs text-amber-600">Gender not defined — you will be prompted to fix this before saving</p>
                  )}
                  {errors.animalId && <p className="text-xs text-red-500">{errors.animalId}</p>}
                </div>

                {/* Insurance ID */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Insurance ID <span className="text-gray-400 text-xs">auto-detected</span></label>
                  <Input
                    readOnly
                    value={insuranceId || (animalId ? "No insurance registered" : "Select an animal first")}
                    className={`${insuranceId ? "bg-blue-50 text-blue-700 font-medium" : "bg-gray-50 text-gray-400 italic"}`}
                  />
                </div>

                {/* Ear Tag ID */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Ear Tag ID <span className="text-gray-400 text-xs">auto-detected</span></label>
                  <Input
                    readOnly
                    value={earTagId || (animalId ? "No ear tag registered" : "Select an animal first")}
                    className={`${earTagId ? "bg-amber-50 text-amber-700 font-medium" : "bg-gray-50 text-gray-400 italic"}`}
                  />
                </div>

                {/* Semen Types */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Types of Semen *</label>
                  <button
                    type="button"
                    onClick={() => setSemenTypeOpen(o => !o)}
                    className={`w-full flex items-center justify-between border rounded-md px-3 py-2 bg-white text-sm text-left${errors.semenTypes ? " border-red-500" : " border-input"}`}
                  >
                    <span className="flex flex-wrap gap-1 flex-1 min-w-0">
                      {semenTypes.length === 0
                        ? <span className="text-gray-400">Select semen type(s)...</span>
                        : semenTypes.map(t => (
                          <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs border bg-emerald-50 text-emerald-700 border-emerald-200">{t}</span>
                        ))
                      }
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 ml-2 shrink-0 transition-transform${semenTypeOpen ? " rotate-180" : ""}`} />
                  </button>
                  {semenTypeOpen && (
                    <div className="border border-input rounded-md bg-white shadow-sm p-2 space-y-1">
                      {SEMEN_TYPES.map(t => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1">
                          <input
                            type="checkbox"
                            checked={semenTypes.includes(t)}
                            onChange={() => setSemenTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                            className="accent-emerald-600 h-4 w-4"
                          />
                          <span className="text-sm">{t}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {errors.semenTypes && <p className="text-xs text-red-500">{errors.semenTypes}</p>}
                </div>

                {/* Semen Price */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Price of Semen <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="number" min="0" step="0.01" placeholder="e.g. 5000" value={semenPrice} onChange={e => setSemenPrice(e.target.value)} />
                </div>

                {/* Vet Price */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Vet Price <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="number" min="0" step="0.01" placeholder="e.g. 3000" value={vetPrice} onChange={e => setVetPrice(e.target.value)} />
                </div>

                {/* Time of Injection */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Time of Injection <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="time" value={injectionTime} onChange={e => setInjectionTime(e.target.value)} />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Date *</label>
                  <Input type="date" value={date} onChange={e => handleDateChange(e.target.value)} className={errors.date ? "border-red-500" : ""} />
                  {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                </div>

                {/* Expected Birth Date */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Expected Birth Date <span className="text-gray-400 text-xs">optional</span></label>
                    {birthCountdown !== null && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${birthCountdown > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : birthCountdown === 0
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-600"
                        }`}>
                        {birthCountdown > 0 ? `${birthCountdown}d remaining` : birthCountdown === 0 ? "Due today" : `${Math.abs(birthCountdown)}d overdue`}
                      </span>
                    )}
                  </div>
                  <Input type="date" value={expectedBirthDate} onChange={e => setExpectedBirthDate(e.target.value)} />
                  {(() => {
                    const sel = animals.find(a => a._id === animalId)
                    return sel?.type?.toLowerCase() === "cow" && date ? (
                      <p className="text-xs text-emerald-600">Auto-estimated: AI date + 283 days</p>
                    ) : null
                  })()}
                </div>

                {/* Babies Delivered */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Babies Delivered <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="number" min="0" placeholder="e.g. 1" value={deliveredBabies} onChange={e => setDeliveredBabies(e.target.value)} />
                </div>

                {/* Vet Name */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Name of the Vet <span className="text-gray-400 text-xs">optional</span></label>
                  <Select
                    value={vetName || "none"}
                    onValueChange={v => {
                      if (v === "none") { setVetName(""); setVetOrigin("") }
                      else {
                        const vet = vets.find(d => d.name === v)
                        setVetName(v)
                        if (vet?.specialization) setVetOrigin(vet.specialization)
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select vet..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Not specified —</SelectItem>
                      {vets.map(d => (
                        <SelectItem key={d._id} value={d.name}>
                          {d.name}{d.specialization ? ` — ${d.specialization}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vet Origin */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Vet Origin / Organization <span className="text-gray-400 text-xs">optional</span></label>
                  <Input placeholder="e.g. RAB, MINAGRI, Private Clinic" value={vetOrigin} onChange={e => setVetOrigin(e.target.value)} />
                </div>

                {/* Notes */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Notes <span className="text-gray-400 text-xs">optional</span></label>
                  <Input placeholder="Any observations..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSubmit} disabled={saving} className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl px-6">
                  {saving ? "Saving..." : editRecord ? "Update Record" : "Save Record"}
                </Button>
                {editRecord && <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card className="border-0 shadow-xl bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-sky-500 rounded-full" />
                Insemination History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                <Select value={filterAnimal || "all"} onValueChange={v => setFilterAnimal(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All Animals" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Animals</SelectItem>
                    {femaleAnimals.map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
                <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                  <p className="text-sm text-gray-500">{filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}</p>
                  <Button variant="outline" onClick={() => { setFilterAnimal(""); setFilterMonth("") }} className="rounded-xl ml-auto text-xs">Clear</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead>Semen Types</TableHead>
                      <TableHead>Semen Price</TableHead>
                      <TableHead>Vet Price</TableHead>
                      <TableHead>Injection Time</TableHead>
                      <TableHead>Expected Birth / Outcome</TableHead>
                      <TableHead>Babies</TableHead>
                      <TableHead>Vet</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-400">No records found</TableCell></TableRow>
                    ) : filteredRecords.map(r => (
                      <TableRow key={r._id}>
                        <TableCell className="text-sm">{r.date}</TableCell>
                        <TableCell className="text-sm">
                          {r.animalName || <span className="text-gray-400">General</span>}
                          {r.previousRecordId && (
                            <Badge variant="outline" className="ml-1.5 bg-amber-50 text-amber-700 border-amber-200 text-[10px]" title="Follows a failed attempt">
                              Re-attempt
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(r.semenTypes || []).map(t => (
                              <Badge key={t} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.semenPrice != null ? r.semenPrice : <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-sm">{r.vetPrice != null ? r.vetPrice : <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-sm">{r.injectionTime || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>
                          {r.deliveredBabies != null
                            ? r.expectedBirthDate
                              ? <span className="text-xs text-gray-400">{r.expectedBirthDate}</span>
                              : <span className="text-gray-400">—</span>
                            : r.pregnancyFailed
                              ? <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">Not Pregnant</Badge>
                              : r.expectedBirthDate
                                ? <BirthCountdown targetDate={r.expectedBirthDate} />
                                : <span className="text-gray-400">—</span>
                          }
                        </TableCell>
                        <TableCell className="text-center font-semibold text-sky-700">
                          {r.deliveredBabies != null ? r.deliveredBabies : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">{r.vetName || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-sm">{r.vetOrigin || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {r.deliveredBabies == null && (
                              <Button size="sm" variant="ghost" onClick={() => setReinseminateConfirm(r)} className="h-8 w-8 p-0 hover:bg-amber-50" title="Re-inseminate">
                                <Syringe className="h-3.5 w-3.5 text-amber-600" />
                              </Button>
                            )}
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

        {/* REPORTS TAB */}
        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Export button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setExportOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl gap-2"
              >
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>

            {/* Per-cow summary table */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  Summary per Animal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Animal</TableHead>
                        <TableHead>Inseminations</TableHead>
                        <TableHead>Failed Attempts</TableHead>
                        <TableHead>Calf(s) Born</TableHead>
                        <TableHead>Total Cost (RWF)</TableHead>
                        <TableHead>Last Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cowSummary.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-6 text-gray-400">No data</TableCell></TableRow>
                      ) : cowSummary.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-emerald-700 font-semibold">{c.inseminations}</TableCell>
                          <TableCell className="text-red-600 font-semibold">{c.failedAttempts > 0 ? c.failedAttempts : "—"}</TableCell>
                          <TableCell className="text-sky-700 font-semibold">{c.babies > 0 ? c.babies : "—"}</TableCell>
                          <TableCell>{c.totalCost > 0 ? c.totalCost.toLocaleString() : "—"}</TableCell>
                          <TableCell className="text-sm text-gray-500">{c.lastDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Babies per cow bar chart */}
            {cowSummary.some(c => c.babies > 0) && (
              <Card className="border-0 shadow-xl bg-white/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-sky-500 rounded-full" />
                    Calf(s) Born per Animal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={cowSummary.filter(c => c.babies > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip formatter={(v: any) => [v, "Calfs Born"]} />
                      <Bar dataKey="babies" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Inseminations per cow bar chart */}
            {cowSummary.length > 0 && (
              <Card className="border-0 shadow-xl bg-white/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    Inseminations per Animal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={cowSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip formatter={(v: any) => [v, "Inseminations"]} />
                      <Bar dataKey="inseminations" fill="#16a34a" radius={[4, 4, 0, 0]} />
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
              <FileText className="h-5 w-5 text-emerald-600" />
              Export Insemination Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Animal</label>
              <Select value={exportAnimalFilter || "all"} onValueChange={v => setExportAnimalFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Animals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Animals</SelectItem>
                  {femaleAnimals.map(a => (
                    <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-sm space-y-1">
                <p className="font-medium text-emerald-700">Preview{exportAnimalName ? ` — ${exportAnimalName}` : ""}</p>
                <p className="text-gray-600">
                  {exportFilteredRecords.length} records &bull; {exportTotalBabies} calf(s) born &bull; {exportSummary.length} animal(s)
                </p>
                <p className="text-gray-600">Total cost: <strong className="text-emerald-700">RWF {exportTotalCost.toLocaleString()}</strong></p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline" onClick={() => setExportOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                onClick={exportToExcel}
                disabled={exporting || exportFilteredRecords.length === 0}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? "Exporting..." : "Excel"}
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={exporting || exportFilteredRecords.length === 0}
                className="col-span-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl gap-2"
              >
                <FileText className="h-4 w-4" />
                {exporting ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Re-inseminate Confirm Dialog */}
      <AlertDialog open={!!reinseminateConfirm} onOpenChange={open => !open && setReinseminateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Re-insemination</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the attempt on <strong>{reinseminateConfirm?.date}</strong> for{" "}
              <strong>{reinseminateConfirm?.animalName || "this animal"}</strong> as <strong>Not Pregnant</strong> (kept in History) and open a new insemination record for the same animal. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReinseminateConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reinseminateConfirm) handleReinseminate(reinseminateConfirm)
                setReinseminateConfirm(null)
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Yes, Re-inseminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gender Alert Dialog */}
      <AlertDialog open={!!genderAlertAnimal} onOpenChange={open => !open && setGenderAlertAnimal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gender Not Defined</AlertDialogTitle>
            <AlertDialogDescription>
              The animal <strong>{genderAlertAnimal?.name}</strong> does not have a gender defined. Please go to the Animals page and set its gender to <strong>Female</strong> before recording an insemination.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setGenderAlertAnimal(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Insemination Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
