"use client"

import { useState, useEffect, useMemo } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { getAnimals } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Trash2, Plus, Pencil, BarChart3, History, Weight, ChevronDown, Download, FileText } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLanguage } from "@/contexts/LanguageContext"

interface Animal { _id: string; name: string; type: string; insuranceId?: string | null }
interface WasteRecord {
  _id: string; animalId: string | null; animalName: string | null
  wasteType: string | string[]; quantity: number; unit: string
  homeConsumption: number | null; soldQuantity: number | null
  pricePerUnit: number | null; totalAmount: number | null
  disposalMethod: string | null; date: string; notes: string | null
}

const WASTE_TYPES = ["Manure", "Urine", "Bedding", "Feed Waste", "Dead Animals", "Wastewater", "Other"]
const UNITS = ["kg", "litres", "bags", "tonnes"]
const DISPOSAL_METHODS = ["Composting", "Biogas", "Landfill", "Sold", "Spread on Fields", "Other"]

const today = new Date().toISOString().split("T")[0]

const WASTE_COLORS: Record<string, string> = {
  Manure: "bg-amber-50 text-amber-700 border-amber-200",
  Urine: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Bedding: "bg-orange-50 text-orange-700 border-orange-200",
  "Feed Waste": "bg-lime-50 text-lime-700 border-lime-200",
  "Dead Animals": "bg-red-50 text-red-700 border-red-200",
  Wastewater: "bg-sky-50 text-sky-700 border-sky-200",
  Other: "bg-gray-50 text-gray-700 border-gray-200",
}

export default function WasteManagementPage() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [animals, setAnimals] = useState<Animal[]>([])
  const [records, setRecords] = useState<WasteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editRecord, setEditRecord] = useState<WasteRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form
  const [animalId, setAnimalId] = useState("")
  const [wasteType, setWasteType] = useState<string[]>([])
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("")
  const [disposalMethod, setDisposalMethod] = useState("")
  const [homeConsumption, setHomeConsumption] = useState("")
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [wasteTypeOpen, setWasteTypeOpen] = useState(false)
  const [insuranceId, setInsuranceId] = useState("")

  // Filter
  const [filterType, setFilterType] = useState("")
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
    const res = await fetch(`/api/waste?farmerId=${farmerId}`)
    const data = await res.json()
    setRecords(Array.isArray(data) ? data : [])
  }

  const filteredRecords = useMemo(() => {
    let data = [...records]
    if (filterType) data = data.filter(r => {
      const types = Array.isArray(r.wasteType) ? r.wasteType : [r.wasteType]
      return types.includes(filterType)
    })
    if (filterMonth) data = data.filter(r => r.date.startsWith(filterMonth))
    return data
  }, [records, filterType, filterMonth])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!wasteType.length) e.wasteType = "Select at least one waste type"
    if (!quantity || Number(quantity) <= 0) e.quantity = "Enter a valid quantity"
    if (!unit) e.unit = "Select a unit"
    if (!date) e.date = "Select a date"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Auto-calculate: soldQuantity = quantity - homeConsumption, totalAmount = soldQuantity * pricePerUnit
  useEffect(() => {
    const total = Number(quantity) || 0
    const consumed = Number(homeConsumption) || 0
    const sold = Math.max(0, total - consumed)
    if (pricePerUnit) setTotalAmount((sold * Number(pricePerUnit)).toFixed(2))
    else setTotalAmount("")
  }, [quantity, homeConsumption, pricePerUnit])

  const resetForm = () => {
    setAnimalId(""); setWasteType([]); setQuantity(""); setUnit("")
    setDisposalMethod(""); setHomeConsumption(""); setPricePerUnit(""); setTotalAmount("")
    setDate(today); setNotes("")
    setInsuranceId("")
    setErrors({}); setEditRecord(null)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    const animal = animals.find(a => a._id === animalId)
    const soldQuantity = Math.max(0, Number(quantity) - Number(homeConsumption || 0))
    const body = {
      farmerId: user._id.toString(), animalId: animalId || null,
      animalName: animal?.name || null, wasteType: wasteType.join(", "), quantity, unit,
      homeConsumption: homeConsumption ? Number(homeConsumption) : null,
      soldQuantity, pricePerUnit: pricePerUnit ? Number(pricePerUnit) : null,
      totalAmount: totalAmount ? Number(totalAmount) : null,
      disposalMethod: disposalMethod || null, date, notes,
    }

    if (editRecord) {
      await fetch("/api/waste", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editRecord._id, ...body }) })
    } else {
      await fetch("/api/waste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchRecords(user._id.toString())
    resetForm()
    setSaving(false)
  }

  const handleEdit = (r: WasteRecord) => {
    setEditRecord(r)
    setAnimalId(r.animalId || "")
    setInsuranceId(animals.find(a => a._id === r.animalId)?.insuranceId || "")
    setWasteType(Array.isArray(r.wasteType) ? r.wasteType : r.wasteType.split(", ").map(s => s.trim()))
    setQuantity(String(r.quantity))
    setUnit(r.unit)
    setHomeConsumption(r.homeConsumption != null ? String(r.homeConsumption) : "")
    setPricePerUnit(r.pricePerUnit ? String(r.pricePerUnit) : "")
    setTotalAmount(r.totalAmount ? String(r.totalAmount) : "")
    setDisposalMethod(r.disposalMethod || "")
    setDate(r.date)
    setNotes(r.notes || "")
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/waste?id=${id}`, { method: "DELETE" })
    await fetchRecords(user._id.toString())
    setDeleteId(null)
  }

  // Summary stats
  const totalByType = useMemo(() => {
    const map: Record<string, number> = {}
    filteredRecords.forEach(r => {
      const types = Array.isArray(r.wasteType) ? r.wasteType : r.wasteType.split(", ").map(s => s.trim())
      types.forEach(t => { map[t] = (map[t] || 0) + r.quantity })
    })
    return Object.entries(map).map(([type, quantity]) => ({ type, quantity }))
  }, [filteredRecords])

  const totalQuantity = useMemo(() => filteredRecords.reduce((s, r) => s + r.quantity, 0), [filteredRecords])
  const totalConsumed = useMemo(() => filteredRecords.reduce((s, r) => s + (r.homeConsumption || 0), 0), [filteredRecords])
  const totalSold = useMemo(() => filteredRecords.reduce((s, r) => s + (r.soldQuantity ?? Math.max(0, r.quantity - (r.homeConsumption || 0))), 0), [filteredRecords])
  const totalRevenue = useMemo(() => filteredRecords.reduce((s, r) => s + (r.totalAmount || 0), 0), [filteredRecords])

  // Auto-detect insurance ID from selected animal
  useEffect(() => {
    const animal = animals.find(a => a._id === animalId)
    setInsuranceId(animal?.insuranceId || "")
  }, [animalId, animals])

  const getAnimalInsuranceId = (id: string | null) =>
    animals.find(a => a._id === id)?.insuranceId || '—'

  // Export state
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const doc = new jsPDF({ orientation: 'landscape' })

      // Header
      doc.setFillColor(22, 163, 74)
      doc.rect(0, 0, 297, 38, 'F')
      try {
        const logoImg = new Image(); logoImg.crossOrigin = 'anonymous'; logoImg.src = '/logo/NTDM.png'
        await new Promise((res, rej) => { logoImg.onload = res; logoImg.onerror = rej })
        doc.addImage(logoImg, 'PNG', 15, 7, 22, 22)
      } catch { }
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16); doc.setFont('helvetica', 'bold')
      doc.text(t('farmer.wasteManagementReportTitle'), 45, 18)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('NTDM Animal Hospital', 45, 27)

      // Meta
      doc.setTextColor(55, 65, 81); doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 50)
      doc.text(`Generated by: ${user?.name || 'Unknown'}`, 15, 58)

      // Summary box
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240)
      doc.rect(15, 66, 267, 22, 'FD')
      doc.setTextColor(22, 163, 74); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.text('Summary', 20, 76)
      doc.setTextColor(55, 65, 81); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(`Records: ${filteredRecords.length}`, 20, 84)
      doc.text(`Total Quantity: ${totalQuantity.toFixed(1)}`, 80, 84)
      doc.text(`Total Sold: ${totalSold.toFixed(1)}`, 160, 84)
      doc.text(`Revenue: RWF ${totalRevenue.toLocaleString()}`, 220, 84)

      // ── Column layout (landscape = 297mm wide, margins 15 each → 267 usable) ──
      const cols = {
        date:     { x: 18,  width: 22 },
        animal:   { x: 42,  width: 28 },
        type:     { x: 72,  width: 38 },
        qty:      { x: 112, width: 18 },
        homeUse:  { x: 132, width: 18 },
        sold:     { x: 152, width: 20 },
        price:    { x: 174, width: 20 },
        revenue:  { x: 196, width: 24 },
        disposal: { x: 222, width: 28 },
        notes:    { x: 252, width: 28 },
      }

      let y = 100

      const drawHeader = () => {
        doc.setFillColor(22, 163, 74)
        doc.rect(15, y - 6, 267, 8, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
        doc.text('Date',          cols.date.x,     y)
        doc.text('Animal',        cols.animal.x,   y)
        doc.text('Waste Type',    cols.type.x,     y)
        doc.text('Qty & Unit',    cols.qty.x,      y)
        doc.text('Home Use',      cols.homeUse.x,  y)
        doc.text('Sold',          cols.sold.x,     y)
        doc.text('Price/Unit',    cols.price.x,    y)
        doc.text('Revenue (RWF)', cols.revenue.x,  y)
        doc.text('Disposal',      cols.disposal.x, y)
        doc.text('Notes',         cols.notes.x,    y)
        doc.setFont('helvetica', 'normal')
        y += 8
      }

      drawHeader()

      filteredRecords.forEach((r, i) => {
        const wasteText = Array.isArray(r.wasteType) ? r.wasteType.join(', ') : r.wasteType || ''
        const soldQty = r.soldQuantity ?? Math.max(0, r.quantity - (r.homeConsumption || 0))

        const typeLines     = doc.splitTextToSize(wasteText,               cols.type.width)
        const animalLines   = doc.splitTextToSize(r.animalName || 'General', cols.animal.width)
        const disposalLines = doc.splitTextToSize(r.disposalMethod || '—', cols.disposal.width)
        const notesLines    = doc.splitTextToSize(r.notes || '—',          cols.notes.width)

        const rowHeight = Math.max(typeLines.length, animalLines.length, disposalLines.length, notesLines.length, 1) * 5 + 4

        if (y + rowHeight > 190) { doc.addPage(); y = 20; drawHeader() }

        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, 267, rowHeight, 'F') }
        doc.setDrawColor(226, 232, 240); doc.rect(15, y - 4, 267, rowHeight)

        doc.setFontSize(7.5); doc.setTextColor(55, 65, 81)
        doc.text(new Date(r.date).toLocaleDateString(), cols.date.x, y)
        doc.text(animalLines,                            cols.animal.x,   y)
        doc.text(typeLines,                              cols.type.x,     y)

        // Quantity + unit
        doc.setTextColor(22, 163, 74)
        doc.text(`${r.quantity} ${r.unit}`,              cols.qty.x,      y)

        // Home use
        doc.setTextColor(217, 119, 6)
        doc.text(r.homeConsumption ? `${r.homeConsumption} ${r.unit}` : '—', cols.homeUse.x, y)

        // Sold
        doc.setTextColor(14, 165, 233)
        doc.text(soldQty > 0 ? `${soldQty.toFixed(1)} ${r.unit}` : '—', cols.sold.x, y)

        // Price per unit
        doc.setTextColor(55, 65, 81)
        doc.text(r.pricePerUnit != null ? String(r.pricePerUnit) : '—', cols.price.x, y)

        // Revenue
        doc.setTextColor(22, 163, 74)
        doc.text(r.totalAmount ? r.totalAmount.toLocaleString() : '—', cols.revenue.x, y)

        // Disposal & Notes
        doc.setTextColor(55, 65, 81)
        doc.text(disposalLines, cols.disposal.x, y)
        doc.text(notesLines,    cols.notes.x,    y)

        y += rowHeight
      })

      // Footer
      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        const pw = doc.internal.pageSize.getWidth()
        const ph = doc.internal.pageSize.getHeight()
        doc.setFillColor(248, 250, 252); doc.rect(0, ph - 18, pw, 18, 'F')
        doc.setDrawColor(226, 232, 240); doc.line(0, ph - 18, pw, ph - 18)
        doc.setFontSize(7); doc.setTextColor(107, 114, 128)
        doc.text(`NTDM Animal Hospital | Generated by: ${user?.name || 'Unknown'}`, 15, ph - 7)
        doc.text(`Page ${page} of ${totalPages}`, pw - 15, ph - 7, { align: 'right' })
      }

      doc.save(`waste-report-${today}.pdf`)
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
      const data = filteredRecords.map(r => {
        const soldQty = r.soldQuantity ?? Math.max(0, r.quantity - (r.homeConsumption || 0))
        return {
          Date: r.date,
          Animal: r.animalName || 'General',
          'Waste Type': Array.isArray(r.wasteType) ? r.wasteType.join(', ') : r.wasteType,
          'Quantity': r.quantity,
          'Unit': r.unit,
          'Home Use': r.homeConsumption ?? '—',
          'Sold Quantity': soldQty > 0 ? soldQty : '—',
          'Price per Unit (RWF)': r.pricePerUnit ?? '—',
          'Revenue (RWF)': r.totalAmount ?? '—',
          'Disposal Method': r.disposalMethod || '—',
          'Notes': r.notes || '—',
        }
      })
      const ws = XLSX.utils.json_to_sheet(data)
      ws['!cols'] = [14, 20, 24, 10, 10, 12, 16, 20, 16, 22, 30].map(w => ({ wch: w }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Waste Records')
      XLSX.writeFile(wb, `waste-report-${today}.xlsx`)
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
        <div className="p-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl">
          <Trash2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waste Management</h1>
          <p className="text-sm text-gray-500">Track and manage farm waste disposal</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-100 uppercase font-medium">Total Quantity</p>
              <p className="text-2xl font-bold">{totalQuantity.toFixed(1)}</p>
            </div>
            <Weight className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-500 to-amber-500 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-100 uppercase font-medium">Home Used</p>
              <p className="text-2xl font-bold">{totalConsumed.toFixed(1)}</p>
            </div>
            <Trash2 className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-sky-100 uppercase font-medium">Sold</p>
              <p className="text-xl font-bold">{totalSold.toFixed(1)}</p>
              <p className="text-xs text-sky-100">RWF {totalRevenue.toLocaleString()}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-100 uppercase font-medium">Waste Types</p>
              <p className="text-2xl font-bold">{totalByType.length}</p>
            </div>
            <Trash2 className="h-8 w-8 text-white/40" />
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
                {editRecord ? "Edit Waste Record" : "New Waste Record"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Animal (optional) */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Animal <span className="text-gray-400 text-xs">optional</span></label>
                  <Select value={animalId || "none"} onValueChange={v => setAnimalId(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select animal..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All / General</SelectItem>
                      {animals.map(a => <SelectItem key={a._id} value={a._id}>{a.name} ({a.type})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Insurance ID */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Insurance ID <span className="text-gray-400 text-xs">auto-detected</span></label>
                  <Input
                    readOnly
                    value={insuranceId || (animalId ? "No insurance registered" : "Select an animal first")}
                    className={insuranceId ? "bg-blue-50 text-blue-700 font-medium" : "bg-gray-50 text-gray-400 italic"}
                  />
                </div>

                {/* Waste Type */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Waste Type *</label>
                  <button
                    type="button"
                    onClick={() => setWasteTypeOpen(o => !o)}
                    className={`w-full flex items-center justify-between border rounded-md px-3 py-2 bg-white text-sm text-left${errors.wasteType ? " border-red-500" : " border-input"}`}
                  >
                    <span className="flex flex-wrap gap-1 flex-1 min-w-0">
                      {wasteType.length === 0
                        ? <span className="text-gray-400">Select waste type(s)...</span>
                        : wasteType.map(t => (
                          <span key={t} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${WASTE_COLORS[t] || WASTE_COLORS.Other}`}>{t}</span>
                        ))
                      }
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 ml-2 shrink-0 transition-transform${wasteTypeOpen ? " rotate-180" : ""}`} />
                  </button>
                  {wasteTypeOpen && (
                    <div className="border border-input rounded-md bg-white shadow-sm p-2 space-y-1">
                      {WASTE_TYPES.map(w => (
                        <label key={w} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1">
                          <input
                            type="checkbox"
                            checked={wasteType.includes(w)}
                            onChange={() => setWasteType(prev => prev.includes(w) ? prev.filter(t => t !== w) : [...prev, w])}
                            className="accent-emerald-600 h-4 w-4"
                          />
                          <span className="text-sm">{w}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {errors.wasteType && <p className="text-xs text-red-500">{errors.wasteType}</p>}
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Quantity *</label>
                  <Input type="number" min="0" step="0.1" placeholder="e.g. 50" value={quantity} onChange={e => setQuantity(e.target.value)} className={errors.quantity ? "border-red-500" : ""} />
                  {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
                </div>

                {/* Unit */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Unit *</label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className={errors.unit ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.unit && <p className="text-xs text-red-500">{errors.unit}</p>}
                </div>

                {/* Home Consumption */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Home Use <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="number" min="0" step="0.1" placeholder="e.g. 10" value={homeConsumption} onChange={e => setHomeConsumption(e.target.value)} />
                  {quantity && homeConsumption && (
                    <p className="text-xs text-sky-600">Sold: {Math.max(0, Number(quantity) - Number(homeConsumption)).toFixed(1)}</p>
                  )}
                </div>

                {/* Price per unit */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Price per Unit (RWF) <span className="text-gray-400 text-xs">optional</span></label>
                  <Input type="number" min="0" placeholder="e.g. 200" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} />
                </div>

                {/* Total amount */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Total Amount (RWF) <span className="text-gray-400 text-xs">auto-calculated</span></label>
                  <Input type="number" min="0" placeholder="Auto-calculated" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="bg-emerald-50" />
                </div>

                {/* Disposal Method */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Disposal Method <span className="text-gray-400 text-xs">optional</span></label>
                  <Select value={disposalMethod || "none"} onValueChange={v => setDisposalMethod(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Not specified —</SelectItem>
                      {DISPOSAL_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Date *</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className={errors.date ? "border-red-500" : ""} />
                  {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
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
                Waste History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                <Select value={filterType || "all"} onValueChange={v => setFilterType(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {WASTE_TYPES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
                <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                  <p className="text-sm text-gray-500">{filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}</p>
                  <Button variant="outline" onClick={() => { setFilterType(""); setFilterMonth("") }} className="rounded-xl ml-auto text-xs">Clear</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Waste Type</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Home Use</TableHead>
                      <TableHead>Sold</TableHead>
                      <TableHead>Price/Unit</TableHead>
                      <TableHead>Revenue (RWF)</TableHead>
                      <TableHead>Disposal</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-400">No records found</TableCell></TableRow>
                    ) : filteredRecords.map(r => (
                      <TableRow key={r._id}>
                        <TableCell className="text-sm">{r.date}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(r.wasteType) ? r.wasteType : r.wasteType.split(", ").map(s => s.trim())).map(t => (
                              <Badge key={t} variant="outline" className={WASTE_COLORS[t] || WASTE_COLORS.Other}>{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.animalName || <span className="text-gray-400">General</span>}</TableCell>
                        <TableCell className="font-semibold text-emerald-700">{r.quantity} {r.unit}</TableCell>
                        <TableCell className="text-orange-600">{r.homeConsumption ? `${r.homeConsumption} ${r.unit}` : "—"}</TableCell>
                        <TableCell className="text-sky-700 font-medium">{(() => { const s = r.soldQuantity ?? Math.max(0, r.quantity - (r.homeConsumption || 0)); return s > 0 ? `${s.toFixed(1)} ${r.unit}` : "—" })()}</TableCell>
                        <TableCell>{r.pricePerUnit ? r.pricePerUnit : "—"}</TableCell>
                        <TableCell>{r.totalAmount ? r.totalAmount.toLocaleString() : "—"}</TableCell>
                        <TableCell className="text-sm">{r.disposalMethod || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[120px] truncate">{r.notes || "—"}</TableCell>
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
            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  Waste by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {totalByType.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={totalByType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  Summary by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waste Type</TableHead>
                        <TableHead>Total Quantity</TableHead>
                        <TableHead>Records</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {totalByType.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-6 text-gray-400">No data</TableCell></TableRow>
                      ) : totalByType.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant="outline" className={WASTE_COLORS[row.type] || WASTE_COLORS.Other}>{row.type}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-700">{row.quantity.toFixed(1)}</TableCell>
                          <TableCell>{filteredRecords.filter(r => {
                            const types = Array.isArray(r.wasteType) ? r.wasteType : r.wasteType.split(", ").map(s => s.trim())
                            return types.includes(row.type)
                          }).length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
              <FileText className="h-5 w-5 text-emerald-600" />
              Export Waste Management Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-sm space-y-1">
                <p className="font-medium text-emerald-700">Preview</p>
                <p className="text-gray-600">
                  {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""} &bull; {totalQuantity.toFixed(1)} total quantity &bull; {totalByType.length} waste type{totalByType.length !== 1 ? "s" : ""}
                </p>
                <p className="text-gray-600">Revenue: <strong className="text-emerald-700">RWF {totalRevenue.toLocaleString()}</strong></p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline" onClick={() => setExportOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                onClick={exportToExcel}
                disabled={exporting || filteredRecords.length === 0}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? "Exporting..." : "Excel"}
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={exporting || filteredRecords.length === 0}
                className="col-span-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl gap-2"
              >
                <FileText className="h-4 w-4" />
                {exporting ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Waste Record</AlertDialogTitle>
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

