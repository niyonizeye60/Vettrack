"use client"

import { useState, useEffect, useMemo } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { getAnimals } from "@/lib/actions"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Milk, Plus, Pencil, Trash2, BarChart3, History, TrendingUp, DollarSign, Droplets, Download, FileText, Eye } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Animal { _id: string; name: string; type: string; insuranceId?: string; earTagId?: string | null; gender?: string | null }
interface MilkRecord {
  _id: string; cowId: string; cowName: string; liters: number
  homeConsumption: number | null; soldLiters: number | null
  pricePerLiter: number | null; totalAmount: number | null
  session: string; date: string; time: string | null; notes: string | null
  waterLiters: number | null; foodType: string | null
  foodKg: number | null; foodCost: number | null
}

const SESSIONS = ["Morning", "Evening"]
const today = new Date().toISOString().split("T")[0]

export default function MilkProductionPage() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [animals, setAnimals] = useState<Animal[]>([])
  const femaleAnimals = animals.filter(a => !a.gender || a.gender === "female")
  const [records, setRecords] = useState<MilkRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editRecord, setEditRecord] = useState<MilkRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailRecord, setDetailRecord] = useState<MilkRecord | null>(null)

  // Form state
  const [cowId, setCowId] = useState("")
  const [liters, setLiters] = useState("")
  const [homeConsumption, setHomeConsumption] = useState("")
  const [pricePerLiter, setPricePerLiter] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [insuranceId, setInsuranceId] = useState("")
  const [earTagId, setEarTagId] = useState("")
  const [session, setSession] = useState("")
  const [date, setDate] = useState(today)
  const [time, setTime] = useState("")
  const [waterLiters, setWaterLiters] = useState("")
  const [foodType, setFoodType] = useState("")
  const [foodKg, setFoodKg] = useState("")
  const [foodCost, setFoodCost] = useState("")
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filter state
  const [filterCow, setFilterCow] = useState("")
  const [filterSession, setFilterSession] = useState("")
  const [filterStart, setFilterStart] = useState("")
  const [filterEnd, setFilterEnd] = useState("")
  const [filterMonth, setFilterMonth] = useState("")

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setUser(userData)
      const animalsData = await getAnimals(userData._id.toString())
      setAnimals(animalsData)
      await fetchRecords(userData._id.toString())
      setLoading(false)
    }
    init()
  }, [])

  const fetchRecords = async (farmerId: string) => {
    const res = await fetch(`/api/milk?farmerId=${farmerId}`)
    const data = await res.json()
    setRecords(Array.isArray(data) ? data : [])
  }

  // Client-side filtered records
  const filteredRecords = useMemo(() => {
    let filtered = [...records]
    if (filterCow) filtered = filtered.filter(r => r.cowId === filterCow)
    if (filterSession) filtered = filtered.filter(r => r.session === filterSession)
    if (filterMonth) {
      filtered = filtered.filter(r => r.date.startsWith(filterMonth))
    } else {
      if (filterStart) filtered = filtered.filter(r => r.date >= filterStart)
      if (filterEnd) filtered = filtered.filter(r => r.date <= filterEnd)
    }
    return filtered
  }, [records, filterCow, filterSession, filterStart, filterEnd, filterMonth])

  // Auto-calculate: soldLiters = liters - homeConsumption, totalAmount = soldLiters * pricePerLiter
  useEffect(() => {
    const total = Number(liters) || 0
    const consumed = Number(homeConsumption) || 0
    const sold = Math.max(0, total - consumed)
    if (pricePerLiter) {
      setTotalAmount((sold * Number(pricePerLiter)).toFixed(2))
    }
  }, [liters, homeConsumption, pricePerLiter])

  // Auto-detect insurance ID from selected animal
  useEffect(() => {
    const cow = animals.find(a => a._id === cowId)
    setInsuranceId(cow?.insuranceId || "")
    setEarTagId(cow?.earTagId || "")
  }, [cowId, animals])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!cowId) e.cowId = "Please select a cow"
    if (!liters || Number(liters) <= 0) e.liters = "Enter valid liters"
    if (!session) e.session = "Select a session"
    if (!date) e.date = "Select a date"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const resetForm = () => {
    setCowId(""); setLiters(""); setHomeConsumption(""); setPricePerLiter(""); setTotalAmount("")
    setInsuranceId(""); setEarTagId("")
    setSession(""); setDate(today); setTime(""); setWaterLiters(""); setFoodType(""); setFoodKg(""); setFoodCost(""); setNotes("")
    setErrors({}); setEditRecord(null)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    const cow = animals.find(a => a._id === cowId)
    const soldLiters = Math.max(0, Number(liters) - Number(homeConsumption || 0))
    const body = { farmerId: user._id.toString(), cowId, cowName: cow?.name, liters, homeConsumption, soldLiters, pricePerLiter, totalAmount, session, date, time, waterLiters, foodType, foodKg, foodCost, notes }

    if (editRecord) {
      await fetch("/api/milk", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editRecord._id, liters, homeConsumption, soldLiters, pricePerLiter, totalAmount, session, date, time, waterLiters, foodType, foodKg, foodCost, notes }) })
    } else {
      await fetch("/api/milk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchRecords(user._id.toString())
    resetForm()
    setSaving(false)
  }

  const handleEdit = (r: MilkRecord) => {
    setEditRecord(r); setCowId(r.cowId); setLiters(String(r.liters))
    setHomeConsumption(r.homeConsumption != null ? String(r.homeConsumption) : "")
    setPricePerLiter(r.pricePerLiter ? String(r.pricePerLiter) : "")
    setTotalAmount(r.totalAmount ? String(r.totalAmount) : "")
    const cow = animals.find(a => a._id === r.cowId)
    setInsuranceId(cow?.insuranceId || "")
    setEarTagId(cow?.earTagId || "")
    setSession(r.session); setDate(r.date); setTime(r.time || "")
    setWaterLiters(r.waterLiters ? String(r.waterLiters) : "")
    setFoodType(r.foodType || "")
    setFoodKg(r.foodKg ? String(r.foodKg) : "")
    setFoodCost(r.foodCost ? String(r.foodCost) : "")
    setNotes(r.notes || "")
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/milk?id=${id}`, { method: "DELETE" })
    await fetchRecords(user._id.toString())
    setDeleteId(null)
  }

  const clearFilters = () => {
    setFilterCow(""); setFilterSession(""); setFilterStart(""); setFilterEnd(""); setFilterMonth("")
  }

  // Export state
  const [exportOpen, setExportOpen] = useState(false)
  const [exportCow, setExportCow] = useState("all")
  const [exportType, setExportType] = useState<"daily" | "monthly" | "total">("total")
  const [exportDate, setExportDate] = useState(today)
  const [exportMonth, setExportMonth] = useState(today.slice(0, 7))
  const [exporting, setExporting] = useState(false)

  const getExportRecords = () => {
    let data = [...records]
    if (exportCow !== "all") data = data.filter(r => r.cowId === exportCow)
    if (exportType === "daily") data = data.filter(r => r.date === exportDate)
    if (exportType === "monthly") data = data.filter(r => r.date.startsWith(exportMonth))
    return data.sort((a, b) => a.date.localeCompare(b.date))
  }

  const getAnimalInsuranceId = (cowId: string) =>
    animals.find(a => a._id === cowId)?.insuranceId || '—'

  const getAnimalEarTagId = (cowId: string) =>
    animals.find(a => a._id === cowId)?.earTagId || '—'

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const doc = new jsPDF('l', 'mm', 'a4')
      const pageWidth0 = doc.internal.pageSize.getWidth()
      const exportRecords = getExportRecords()
      const cowName = exportCow === "all" ? "All Animals" : animals.find(a => a._id === exportCow)?.name || "Unknown"
      const totalL = exportRecords.reduce((s, r) => s + r.liters, 0)
      const totalRev = exportRecords.reduce((s, r) => s + (r.totalAmount || 0), 0)
      const reportLabel = exportType === "daily" ? `Daily Report — ${exportDate}` : exportType === "monthly" ? `Monthly Report — ${exportMonth}` : "Total Production Report"

      // Header
      doc.setFillColor(22, 163, 74)
      doc.rect(0, 0, pageWidth0, 38, 'F')

      // Logo
      try {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        logoImg.src = '/logo/NTDM.png'
        await new Promise((resolve, reject) => { logoImg.onload = resolve; logoImg.onerror = reject })
        doc.addImage(logoImg, 'PNG', 15, 7, 22, 22)
      } catch { }

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Milk Production Report', 45, 18)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('NTDM Animal Hospital', 45, 27)

      // Meta
      doc.setTextColor(55, 65, 81)
      doc.setFontSize(10)
      doc.text(`Animal: ${cowName}`, 15, 50)
      doc.text(`Report Type: ${reportLabel}`, 15, 58)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 66)
      doc.text(`Generated by: ${user?.name || 'Unknown'}`, 15, 74)

      // Summary box
      const tableWidth = pageWidth0 - 30
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.rect(15, 82, tableWidth, 28, 'FD')
      doc.setTextColor(22, 163, 74)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary', 20, 93)
      doc.setTextColor(55, 65, 81)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Total Liters: ${totalL.toFixed(1)} L`, 20, 103)
      doc.text(`Total Revenue: RWF ${totalRev.toLocaleString()}`, 120, 103)
      doc.text(`Records: ${exportRecords.length}`, 220, 103)

      // Table header
      let y = 122

      const cols = {
        date: { x: 15, width: 18 },
        animal: { x: 33, width: 24 },
        earTag: { x: 57, width: 20 },
        insurance: { x: 77, width: 24 },
        session: { x: 101, width: 16 },
        liters: { x: 117, width: 14 },
        price: { x: 131, width: 18 },
        consumed: { x: 149, width: 16 },
        consumedVal: { x: 165, width: 20 },
        total: { x: 185, width: 20 },
        water: { x: 205, width: 16 },
        foodType: { x: 221, width: 24 },
        foodKg: { x: 245, width: 16 },
        foodCost: { x: 261, width: 21 }
      }
      const colBoundaries = [33, 57, 77, 101, 117, 131, 149, 165, 185, 205, 221, 245, 261]

      const drawTableHeader = () => {
        doc.setFillColor(22, 163, 74)
        doc.rect(15, y - 6, tableWidth, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(6.5)
        doc.setFont("helvetica", "bold")
        doc.text("Date", cols.date.x, y)
        doc.text("Animal", cols.animal.x, y)
        doc.text("Ear Tag", cols.earTag.x, y)
        doc.text("Insurance", cols.insurance.x, y)
        doc.text("Session", cols.session.x, y)
        doc.text("Liters", cols.liters.x, y)
        doc.text("Price/L", cols.price.x, y)
        doc.text("Home use", cols.consumed.x, y)
        doc.text("Home.Val", cols.consumedVal.x, y)
        doc.text("Total(RWF)", cols.total.x, y)
        doc.text("Water(L)", cols.water.x, y)
        doc.text("Food Type", cols.foodType.x, y)
        doc.text("Food(KG)", cols.foodKg.x, y)
        doc.text("Food Cost", cols.foodCost.x, y)
        doc.setFont("helvetica", "normal")
      }

      drawTableHeader()

      y += 8

      exportRecords.forEach((r, i) => {
        const animalLines = doc.splitTextToSize(
          r.cowName || "-",
          cols.animal.width
        )

        const earTagLines = doc.splitTextToSize(
          getAnimalEarTagId(r.cowId) || "-",
          cols.earTag.width
        )

        const insuranceLines = doc.splitTextToSize(
          getAnimalInsuranceId(r.cowId) || "-",
          cols.insurance.width
        )

        const rowHeight =
          Math.max(
            animalLines.length,
            earTagLines.length,
            insuranceLines.length,
            1
          ) * 5 + 4

        // Page break
        if (y + rowHeight > 180) {
          doc.addPage()

          y = 20

          drawTableHeader()

          y += 8
        }

        // Alternate row background
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(15, y - 4, tableWidth, rowHeight, "F")
        }

        // Border
        doc.setDrawColor(226, 232, 240)
        doc.rect(15, y - 4, tableWidth, rowHeight)

        // Column separators
        colBoundaries.forEach(x => doc.line(x, y - 4, x, y - 4 + rowHeight))

        doc.setTextColor(55, 65, 81)
        doc.text(new Date(r.date).toLocaleDateString(), cols.date.x, y)
        doc.text(animalLines, cols.animal.x, y)
        doc.text(earTagLines, cols.earTag.x, y)
        doc.text(insuranceLines, cols.insurance.x, y)
        doc.text(r.session || "-", cols.session.x, y)
        doc.setTextColor(22, 163, 74)
        doc.text(`${Number(r.liters || 0).toFixed(1)}L`, cols.liters.x, y)
        doc.text(r.pricePerLiter ? `RWF ${Number(r.pricePerLiter).toFixed(2)}` : "-", cols.price.x, y)
        doc.setTextColor(234, 88, 12)
        doc.text(r.homeConsumption ? `${r.homeConsumption}L` : "-", cols.consumed.x, y)
        doc.text(
          r.homeConsumption && r.pricePerLiter
            ? `RWF ${(r.homeConsumption * r.pricePerLiter).toLocaleString()}`
            : "-",
          cols.consumedVal.x, y
        )
        doc.setTextColor(55, 65, 81)
        doc.text(r.totalAmount ? r.totalAmount.toLocaleString() : "-", cols.total.x, y)
        doc.setTextColor(55, 65, 81)
        doc.text(r.waterLiters ? `${r.waterLiters}L` : "-", cols.water.x, y)
        doc.text(
          r.foodType
            ? doc.splitTextToSize(r.foodType, cols.foodType.width)[0]
            : "-",
          cols.foodType.x, y
        )
        doc.text(r.foodKg ? `${r.foodKg}kg` : "-", cols.foodKg.x, y)
        doc.text(r.foodCost ? `${r.foodCost.toLocaleString()}` : "-", cols.foodCost.x, y)
        y += rowHeight
      })

      // Footer
      const totalPages = doc.getNumberOfPages()

      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)

        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        // Footer background
        doc.setFillColor(248, 250, 252)
        doc.rect(0, pageHeight - 18, pageWidth, 18, "F")

        // Top border line
        doc.setDrawColor(226, 232, 240)
        doc.line(
          0,
          pageHeight - 18,
          pageWidth,
          pageHeight - 18
        )

        doc.setFontSize(7)
        doc.setTextColor(107, 114, 128)

        // Left side
        doc.text(
          `NTDM Animal Hospital | Generated by: ${user?.name || "Unknown"
          }`,
          15,
          pageHeight - 7
        )

        // Right side page number
        doc.text(
          `Page ${page} of ${totalPages}`,
          pageWidth - 15,
          pageHeight - 7,
          { align: "right" }
        )
      }

      doc.save(`milk-report-${cowName.replace(/\s+/g, '-')}-${exportType}-${new Date().toISOString().split('T')[0]}.pdf`)
      setExportOpen(false)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const exportToExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const exportRecords = getExportRecords()
      const cowName = exportCow === "all" ? "All Animals" : animals.find(a => a._id === exportCow)?.name || "Unknown"

      const data = exportRecords.map(r => ({
        Date: r.date,
        Time: r.time || '-',
        Animal: r.cowName || '-',
        'Ear Tag ID': getAnimalEarTagId(r.cowId),
        'Insurance ID': getAnimalInsuranceId(r.cowId),
        Session: r.session,
        'Total Liters': r.liters,
        'Consumed (L)': r.homeConsumption ?? '-',
        'Consumed Value (RWF)': r.homeConsumption && r.pricePerLiter
          ? Number((r.homeConsumption * r.pricePerLiter).toFixed(2))
          : '-',
        'Sold (L)': r.soldLiters ?? Math.max(0, r.liters - (r.homeConsumption || 0)),
        'Price per Liter (RWF)': r.pricePerLiter ?? '-',
        'Total Amount (RWF)': r.totalAmount ?? '-',
        'Water Intake (L)': r.waterLiters ?? '-',
        'Food Type': r.foodType || '-',
        'Food Eaten (KG)': r.foodKg ?? '-',
        'Food Cost (RWF)': r.foodCost ?? '-',
        Notes: r.notes || '-',
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      ws['!cols'] = [14, 10, 18, 18, 20, 12, 14, 14, 22, 12, 22, 22, 16, 20, 16, 18, 30].map(w => ({ wch: w }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Milk Production')
      XLSX.writeFile(wb, `milk-report-${cowName.replace(/\s+/g, '-')}-${exportType}-${today}.xlsx`)
      setExportOpen(false)
    } catch (err) {
      console.error('Excel export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  // Reports calculations
  const totalLiters = useMemo(() => filteredRecords.reduce((s, r) => s + r.liters, 0), [filteredRecords])
  const totalConsumed = useMemo(() => filteredRecords.reduce((s, r) => s + (r.homeConsumption || 0), 0), [filteredRecords])
  const totalSold = useMemo(() => filteredRecords.reduce((s, r) => s + (r.soldLiters ?? Math.max(0, r.liters - (r.homeConsumption || 0))), 0), [filteredRecords])
  const totalRevenue = useMemo(() => filteredRecords.reduce((s, r) => s + (r.totalAmount || 0), 0), [filteredRecords])
  const avgPerDay = useMemo(() => {
    const days = new Set(filteredRecords.map(r => r.date)).size
    return days > 0 ? (totalLiters / days).toFixed(1) : "0"
  }, [filteredRecords, totalLiters])

  const dailyData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredRecords.forEach(r => { map[r.date] = (map[r.date] || 0) + r.liters })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, liters]) => ({ date: date.slice(5), liters }))
  }, [filteredRecords])

  const cowData = useMemo(() => {
    const map: Record<string, { name: string; liters: number; consumed: number; sold: number; revenue: number; water: number; foodTypes: Set<string>; foodKg: number; foodCost: number }> = {}
    filteredRecords.forEach(r => {
      if (!map[r.cowId]) map[r.cowId] = { name: r.cowName, liters: 0, consumed: 0, sold: 0, revenue: 0, water: 0, foodTypes: new Set(), foodKg: 0, foodCost: 0 }
      map[r.cowId].liters += r.liters
      map[r.cowId].consumed += r.homeConsumption || 0
      map[r.cowId].sold += r.soldLiters ?? Math.max(0, r.liters - (r.homeConsumption || 0))
      map[r.cowId].revenue += r.totalAmount || 0
      map[r.cowId].water += r.waterLiters || 0
      map[r.cowId].foodKg += r.foodKg || 0
      map[r.cowId].foodCost += r.foodCost || 0
      if (r.foodType) r.foodType.split(',').map(f => f.trim()).filter(Boolean).forEach(f => map[r.cowId].foodTypes.add(f))
    })
    return Object.values(map).map(c => ({ ...c, foodTypes: Array.from(c.foodTypes).join(', ') || '—' }))
  }, [filteredRecords])

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredRecords.forEach(r => {
      const month = r.date.slice(0, 7)
      map[month] = (map[month] || 0) + r.liters
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, liters]) => ({ month, liters }))
  }, [filteredRecords])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl">
          <Milk className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Milk Production</h1>
          <p className="text-sm text-gray-500">Record and track daily milk production</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-100 uppercase font-medium">Total Produced</p>
              <p className="text-2xl font-bold">{totalLiters.toFixed(1)}L</p>
            </div>
            <Droplets className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-500 to-amber-500 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-100 uppercase font-medium">Home Consumed</p>
              <p className="text-2xl font-bold">{totalConsumed.toFixed(1)}L</p>
            </div>
            <Milk className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-sky-100 uppercase font-medium">Sold</p>
              <p className="text-xl font-bold">{totalSold.toFixed(1)}L</p>
              <p className="text-xs text-sky-100">RWF {totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-100 uppercase font-medium">Avg/Day</p>
              <p className="text-2xl font-bold">{avgPerDay}L</p>
            </div>
            <TrendingUp className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="record">
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
                {editRecord ? "Edit Milk Record" : "New Milk Record"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cow */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Cow *</label>
                  <Select value={cowId} onValueChange={setCowId}>
                    <SelectTrigger className={errors.cowId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select cow..." />
                    </SelectTrigger>
                    <SelectContent>
                      {femaleAnimals.map(a => <SelectItem key={a._id} value={a._id}>{a.name} ({a.type})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.cowId && <p className="text-xs text-red-500">{errors.cowId}</p>}
                </div>

                {/* Session */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Session *</label>
                  <Select value={session} onValueChange={setSession}>
                    <SelectTrigger className={errors.session ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select session..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.session && <p className="text-xs text-red-500">{errors.session}</p>}
                </div>

                {/* Liters */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Milk Quantity (Liters) *</label>
                  <Input type="number" min="0" step="0.1" placeholder="e.g. 12.5" value={liters} onChange={e => setLiters(e.target.value)} className={errors.liters ? "border-red-500" : ""} />
                  {errors.liters && <p className="text-xs text-red-500">{errors.liters}</p>}
                </div>

                {/* Home Consumption */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Home Consumption (Liters) <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="number" min="0" step="0.1" placeholder="e.g. 2" value={homeConsumption} onChange={e => setHomeConsumption(e.target.value)} />
                  {liters && homeConsumption && (
                    <p className="text-xs text-sky-600">Sold: {Math.max(0, Number(liters) - Number(homeConsumption)).toFixed(1)}L</p>
                  )}
                </div>

                {/* Price per liter */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Price per Liter (RWF) <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="number" min="0" placeholder="e.g. 500" value={pricePerLiter} onChange={e => setPricePerLiter(e.target.value)} />
                </div>

                {/* Total amount */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Total Amount (RWF) <span className="text-gray-400 text-xs">auto-calculated</span></label>
                  <Input type="number" min="0" placeholder="Auto-calculated" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="bg-emerald-50" />
                </div>

                {/* Insurance ID */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Insurance ID <span className="text-gray-400 text-xs">auto-detected</span></label>
                  <Input
                    readOnly
                    value={insuranceId || (cowId ? "No insurance registered" : "Select a cow first")}
                    className={`${insuranceId ? "bg-blue-50 text-blue-700 font-medium" : "bg-gray-50 text-gray-400 italic"}`}
                  />
                </div>

                {/* Ear Tag ID */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Ear Tag ID <span className="text-gray-400 text-xs">auto-detected</span></label>
                  <Input
                    readOnly
                    value={earTagId || (cowId ? "No ear tag registered" : "Select a cow first")}
                    className={`${earTagId ? "bg-amber-50 text-amber-700 font-medium" : "bg-gray-50 text-gray-400 italic"}`}
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Date *</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className={errors.date ? "border-red-500" : ""} />
                  {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Time <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
                </div>

                {/* Water Intake */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Water Intake (Liters) <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="number" min="0" step="0.5" placeholder="e.g. 40" value={waterLiters} onChange={e => setWaterLiters(e.target.value)} />
                </div>

                {/* Food Type */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Food Type <span className="text-gray-400 text-xs">optional</span></label>
                  <Input placeholder="e.g. Hay, Silage, Grass, Concentrate" value={foodType} onChange={e => setFoodType(e.target.value)} />
                </div>

                {/* Food Eaten (KGs) */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Food Eaten (KGs) <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="number" min="0" step="0.1" placeholder="e.g. 15" value={foodKg} onChange={e => setFoodKg(e.target.value)} />
                </div>

                {/* Food Cost */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Food Cost (RWF) <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="number" min="0" step="0.01" placeholder="e.g. 3000" value={foodCost} onChange={e => setFoodCost(e.target.value)} />
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
                {editRecord && (
                  <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
                )}
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
                Milk History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-xl">
                <Select value={filterCow || "all"} onValueChange={v => setFilterCow(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All Cows" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cows</SelectItem>
                    {femaleAnimals.map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterSession || "all"} onValueChange={v => setFilterSession(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All Sessions" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterStart(""); setFilterEnd("") }} />
                <Input type="date" value={filterStart} onChange={e => { setFilterStart(e.target.value); setFilterMonth("") }} placeholder="Start date" />
                <Input type="date" value={filterEnd} onChange={e => { setFilterEnd(e.target.value); setFilterMonth("") }} placeholder="End date" />
                <div className="flex items-center gap-3 col-span-2 md:col-span-3 lg:col-span-5">
                  <p className="text-sm text-gray-500">{filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""} found</p>
                  <Button variant="outline" onClick={clearFilters} className="rounded-xl ml-auto">Clear Filters</Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Cow</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Home Use</TableHead>
                      <TableHead>Home Use Value (RWF)</TableHead>
                      <TableHead>Sold</TableHead>
                      <TableHead>Price/L</TableHead>
                      <TableHead>Revenue (RWF)</TableHead>
                      <TableHead>Food (KG)</TableHead>
                      <TableHead>Food Cost (RWF)</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow><TableCell colSpan={13} className="text-center py-8 text-gray-400">No records found</TableCell></TableRow>
                    ) : filteredRecords.map(r => {
                      const sold = r.soldLiters ?? Math.max(0, r.liters - (r.homeConsumption || 0))
                      return (
                        <TableRow key={r._id}>
                          <TableCell className="text-sm">{r.date}{r.time ? ` ${r.time}` : ""}</TableCell>
                          <TableCell className="font-medium">{r.cowName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={r.session === "Morning" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}>
                              {r.session}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-700">{r.liters}L</TableCell>
                          <TableCell className="text-orange-600">{r.homeConsumption ? `${r.homeConsumption}L` : "—"}</TableCell>
                          <TableCell className="text-orange-700 font-medium">
                            {r.homeConsumption && r.pricePerLiter
                              ? `RWF ${(r.homeConsumption * r.pricePerLiter).toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sky-700 font-medium">{sold > 0 ? `${sold.toFixed(1)}L` : "—"}</TableCell>
                          <TableCell>{r.pricePerLiter ? `${r.pricePerLiter}` : "—"}</TableCell>
                          <TableCell>{r.totalAmount ? r.totalAmount.toLocaleString() : "—"}</TableCell>
                          <TableCell className="text-gray-700">{r.foodKg ? `${r.foodKg} kg` : "—"}</TableCell>
                          <TableCell className="text-orange-700 font-medium">{r.foodCost ? `RWF ${r.foodCost.toLocaleString()}` : "—"}</TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-[120px] truncate">{r.notes || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setDetailRecord(r)} className="h-8 w-8 p-0 hover:bg-sky-50">
                                <Eye className="h-3.5 w-3.5 text-sky-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(r)} className="h-8 w-8 p-0 hover:bg-emerald-50">
                                <Pencil className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteId(r._id)} className="h-8 w-8 p-0 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTS TAB */}
        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Export Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setExportOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl gap-2"
              >
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
            {/* Per Cow Summary */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  Production per Cow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cow</TableHead>
                        <TableHead>Total (L)</TableHead>
                        <TableHead>Consumed (L)</TableHead>
                        <TableHead>Sold (L)</TableHead>
                        <TableHead>Revenue (RWF)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cowData.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-6 text-gray-400">No data</TableCell></TableRow>
                      ) : cowData.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-emerald-700 font-semibold">{c.liters.toFixed(1)}</TableCell>
                          <TableCell className="text-orange-600">{c.consumed > 0 ? c.consumed.toFixed(1) : "—"}</TableCell>
                          <TableCell className="text-sky-700 font-semibold">{c.sold > 0 ? c.sold.toFixed(1) : "—"}</TableCell>
                          <TableCell>{c.revenue > 0 ? c.revenue.toLocaleString() : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Water Intake & Food Type per Cow */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-sky-500 rounded-full" />
                  Water Intake &amp; Food Type per Cow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cow</TableHead>
                        <TableHead>Total Water Intake (L)</TableHead>
                        <TableHead>Food Types Used</TableHead>
                        <TableHead>Food Eaten (KG)</TableHead>
                        <TableHead>Food Cost (RWF)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cowData.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-gray-400">No data</TableCell></TableRow>
                      ) : cowData.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-sky-700 font-semibold">{c.water > 0 ? `${c.water.toFixed(1)} L` : <span className="text-gray-400">Not recorded</span>}</TableCell>
                          <TableCell className="text-gray-700">{c.foodTypes !== '—' ? c.foodTypes : <span className="text-gray-400">Not recorded</span>}</TableCell>
                          <TableCell className="text-gray-700">{c.foodKg > 0 ? `${c.foodKg.toFixed(1)} kg` : <span className="text-gray-400">Not recorded</span>}</TableCell>
                          <TableCell className="text-orange-700 font-medium">{c.foodCost > 0 ? `RWF ${c.foodCost.toLocaleString()}` : <span className="text-gray-400">Not recorded</span>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Daily Trend Chart */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  Daily Production (Last 14 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyData.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [`${v}L`, "Liters"]} />
                      <Bar dataKey="liters" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend Chart */}
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-sky-500 rounded-full" />
                  Monthly Production Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [`${v}L`, "Liters"]} />
                      <Legend />
                      <Line type="monotone" dataKey="liters" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: "#0ea5e9" }} name="Liters" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Per Cow Bar Chart */}
            {cowData.length > 0 && (
              <Card className="border-0 shadow-xl bg-white/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    Production by Cow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={cowData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [`${v}L`, "Liters"]} />
                      <Bar dataKey="liters" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Report Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Export Milk Production Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Animal</label>
              <Select value={exportCow} onValueChange={setExportCow}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Animals</SelectItem>
                  {femaleAnimals.map(a => <SelectItem key={a._id} value={a._id}>{a.name} ({a.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Report Type</label>
              <Select value={exportType} onValueChange={v => setExportType(v as "daily" | "monthly" | "total")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Report</SelectItem>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="total">Total Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportType === "daily" && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Select Date</label>
                <Input type="date" value={exportDate} onChange={e => setExportDate(e.target.value)} />
              </div>
            )}

            {exportType === "monthly" && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Select Month</label>
                <Input type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} />
              </div>
            )}

            {/* Preview summary */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              {(() => {
                const preview = getExportRecords()
                const previewLiters = preview.reduce((s, r) => s + r.liters, 0)
                const previewRev = preview.reduce((s, r) => s + (r.totalAmount || 0), 0)
                return (
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-emerald-700">Preview</p>
                    <p className="text-gray-600">{preview.length} records &bull; {previewLiters.toFixed(1)}L &bull; RWF {previewRev.toLocaleString()}</p>
                  </div>
                )
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline" onClick={() => setExportOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                onClick={exportToExcel}
                disabled={exporting || getExportRecords().length === 0}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Excel'}
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={exporting || getExportRecords().length === 0}
                className="col-span-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl gap-2"
              >
                <FileText className="h-4 w-4" />
                {exporting ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={!!detailRecord} onOpenChange={open => !open && setDetailRecord(null)}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-sky-600" />
              Milk Record Details
            </DialogTitle>
          </DialogHeader>

          {detailRecord && (() => {
            const sold =
              detailRecord.soldLiters ??
              Math.max(0, detailRecord.liters - (detailRecord.homeConsumption || 0))

            const consumedValue =
              detailRecord.homeConsumption && detailRecord.pricePerLiter
                ? (detailRecord.homeConsumption * detailRecord.pricePerLiter).toLocaleString()
                : null

            const animal = animals.find(a => a._id === detailRecord.cowId)

            const Row = ({
              label,
              value,
              color
            }: {
              label: string
              value: React.ReactNode
              color?: string
            }) => (
              <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500 w-44 shrink-0">{label}</span>
                <span className={`text-sm text-right ${color || 'text-gray-800'}`}>
                  {value}
                </span>
              </div>
            )

            const Section = ({
              title,
              children
            }: {
              title: string
              children: React.ReactNode
            }) => (
              <div className="border rounded-lg p-4 space-y-1 bg-white">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                  {title}
                </h3>
                {children}
              </div>
            )

            return (
              <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-2">

                {/* ANIMAL */}
                <Section title="Animal Information">
                  <Row label="Animal" value={detailRecord.cowName} />
                  <Row
                    label="Ear Tag ID"
                    value={
                      animal?.earTagId || (
                        <span className="text-gray-400 italic">Not registered</span>
                      )
                    }
                  />
                  <Row
                    label="Insurance ID"
                    value={
                      animal?.insuranceId || (
                        <span className="text-gray-400 italic">Not registered</span>
                      )
                    }
                  />
                </Section>

                {/* PRODUCTION */}
                <Section title="Milk Production">
                  <Row label="Date" value={detailRecord.date} />
                  <Row
                    label="Time"
                    value={detailRecord.time || <span className="text-gray-400">—</span>}
                  />
                  <Row
                    label="Session"
                    value={
                      <Badge
                        variant="outline"
                        className={
                          detailRecord.session === 'Morning'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }
                      >
                        {detailRecord.session}
                      </Badge>
                    }
                  />
                  <Row
                    label="Total Milk (L)"
                    value={`${detailRecord.liters} L`}
                    color="text-emerald-700 font-semibold"
                  />
                  <Row
                    label="Home Consumed (L)"
                    value={
                      detailRecord.homeConsumption
                        ? `${detailRecord.homeConsumption} L`
                        : <span className="text-gray-400">—</span>
                    }
                    color="text-orange-600"
                  />
                  <Row
                    label="Sold (L)"
                    value={
                      sold > 0 ? `${sold.toFixed(1)} L` : <span className="text-gray-400">—</span>
                    }
                    color="text-sky-700 font-semibold"
                  />
                </Section>

                {/* FINANCE */}
                <Section title="Financial Summary">
                  <Row
                    label="Price per Liter (RWF)"
                    value={
                      detailRecord.pricePerLiter
                        ? `RWF ${detailRecord.pricePerLiter}`
                        : <span className="text-gray-400">—</span>
                    }
                  />
                  <Row
                    label="Consumed Value (RWF)"
                    value={
                      consumedValue ? `RWF ${consumedValue}` : <span className="text-gray-400">—</span>
                    }
                    color="text-orange-700"
                  />
                  <Row
                    label="Total Revenue (RWF)"
                    value={
                      detailRecord.totalAmount
                        ? `RWF ${detailRecord.totalAmount.toLocaleString()}`
                        : <span className="text-gray-400">—</span>
                    }
                    color="text-emerald-700 font-semibold"
                  />
                </Section>

                {/* FEED */}
                <Section title="Feed & Notes">
                  <Row
                    label="Water Intake (L)"
                    value={
                      detailRecord.waterLiters
                        ? `${detailRecord.waterLiters} L`
                        : <span className="text-gray-400">—</span>
                    }
                    color="text-sky-600"
                  />
                  <Row
                    label="Food Type"
                    value={detailRecord.foodType || <span className="text-gray-400">—</span>}
                  />
                  <Row
                    label="Food Eaten (KGs)"
                    value={
                      detailRecord.foodKg
                        ? `${detailRecord.foodKg} kg`
                        : <span className="text-gray-400">—</span>
                    }
                  />
                  <Row
                    label="Food Cost (RWF)"
                    value={
                      detailRecord.foodCost
                        ? `RWF ${detailRecord.foodCost.toLocaleString()}`
                        : <span className="text-gray-400">—</span>
                    }
                    color="text-orange-700"
                  />
                  <Row
                    label="Notes"
                    value={detailRecord.notes || <span className="text-gray-400">—</span>}
                  />
                </Section>

              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milk Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this milk record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
