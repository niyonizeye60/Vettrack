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
import { Combobox } from "@/components/ui/combobox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Receipt, Plus, Pencil, Trash2, History, Droplet, SprayCan, PawPrint, Download, FileText } from "lucide-react"

interface MilkingExpense {
  _id: string; farmerId: string
  expenseType: "washing_drugs" | "milking_oil"
  quantity: number; unit: string
  pricePerUnit?: number | null
  amount: number; date: string; notes: string | null
}
interface Animal { _id: string; name: string; type: string; lactationStatus?: string | null }
interface AnimalExpense {
  _id: string; farmerId: string; animalId: string; animalName: string | null
  expenseType: "feed" | "water" | "health" | "other"
  description: string | null; amount: number; date: string; notes: string | null
  time?: string | null
  foodKg?: number | null; foodCost?: number | null
  waterLiters?: number | null; waterCost?: number | null
  saltKg?: number | null; saltCost?: number | null
}

const EXPENSE_TYPES = ["washing_drugs", "milking_oil"] as const
const EXPENSE_UNITS = ["litres", "ml", "kg", "units"]
// "water" is kept out of the picker: feed/water/salt are now recorded together under "feed"
// (still supported for reading legacy records saved before this change).
const ANIMAL_EXPENSE_TYPES = ["feed", "health", "other"] as const
const today = new Date().toISOString().split("T")[0]

export default function ExpensesPage() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [expenses, setExpenses] = useState<MilkingExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editExpense, setEditExpense] = useState<MilkingExpense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form
  const [expenseType, setExpenseType] = useState<string>("washing_drugs")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("")
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-calculate: amount = quantity * pricePerUnit
  useEffect(() => {
    if (quantity && pricePerUnit) {
      setAmount((Number(quantity) * Number(pricePerUnit)).toFixed(2))
    }
  }, [quantity, pricePerUnit])

  // Filters
  const [filterType, setFilterType] = useState("")
  const [filterMonth, setFilterMonth] = useState("")

  // Milking Supplies report export
  const [msExportOpen, setMsExportOpen] = useState(false)
  const [msExportType, setMsExportType] = useState<"daily" | "monthly" | "total" | "custom">("total")
  const [msExportExpenseType, setMsExportExpenseType] = useState("all")
  const [msExportDate, setMsExportDate] = useState(today)
  const [msExportMonth, setMsExportMonth] = useState(today.slice(0, 7))
  const [msExportStart, setMsExportStart] = useState(today)
  const [msExportEnd, setMsExportEnd] = useState(today)
  const [msExporting, setMsExporting] = useState(false)

  // Animal expenses
  const [animals, setAnimals] = useState<Animal[]>([])
  const [aExpenses, setAExpenses] = useState<AnimalExpense[]>([])
  const [editAExpense, setEditAExpense] = useState<AnimalExpense | null>(null)
  const [deleteAExpenseId, setDeleteAExpenseId] = useState<string | null>(null)
  const [aAnimalId, setAAnimalId] = useState("")
  const [aExpenseType, setAExpenseType] = useState<string>("feed")
  const [aDescription, setADescription] = useState("")
  const [aAmount, setAAmount] = useState("")
  const [aDate, setADate] = useState(today)
  const [aTime, setATime] = useState("")
  const [aFoodKg, setAFoodKg] = useState("")
  const [aFoodCost, setAFoodCost] = useState("")
  const [aWaterLiters, setAWaterLiters] = useState("")
  const [aWaterCost, setAWaterCost] = useState("")
  const [aSaltKg, setASaltKg] = useState("")
  const [aSaltCost, setASaltCost] = useState("")
  const [aNotes, setANotes] = useState("")
  const [aErrors, setAErrors] = useState<Record<string, string>>({})
  const [filterAAnimal, setFilterAAnimal] = useState("")
  const [filterAType, setFilterAType] = useState("")

  // Animal Expenses report export
  const [aeExportOpen, setAeExportOpen] = useState(false)
  const [aeExportType, setAeExportType] = useState<"daily" | "monthly" | "total" | "custom">("total")
  const [aeExportAnimal, setAeExportAnimal] = useState("all")
  const [aeExportDate, setAeExportDate] = useState(today)
  const [aeExportMonth, setAeExportMonth] = useState(today.slice(0, 7))
  const [aeExportStart, setAeExportStart] = useState(today)
  const [aeExportEnd, setAeExportEnd] = useState(today)
  const [aeExporting, setAeExporting] = useState(false)

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setUser(userData)
      const animalsData = await getAnimals(userData._id.toString())
      setAnimals(animalsData)
      await Promise.all([
        fetchExpenses(userData._id.toString()),
        fetchAnimalExpenses(userData._id.toString()),
      ])
      setLoading(false)
    }
    init()
  }, [])

  const fetchExpenses = async (farmerId: string) => {
    const res = await fetch(`/api/milking-expenses?farmerId=${farmerId}`)
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
  }
  const fetchAnimalExpenses = async (farmerId: string) => {
    const res = await fetch(`/api/animal-expenses?farmerId=${farmerId}`)
    const data = await res.json()
    setAExpenses(Array.isArray(data) ? data : [])
  }

  const totalWashingDrugsCost = useMemo(() => expenses.filter(e => e.expenseType === "washing_drugs").reduce((s, e) => s + e.amount, 0), [expenses])
  const totalMilkingOilCost = useMemo(() => expenses.filter(e => e.expenseType === "milking_oil").reduce((s, e) => s + e.amount, 0), [expenses])
  const totalExpenses = totalWashingDrugsCost + totalMilkingOilCost

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses]
    if (filterType) filtered = filtered.filter(e => e.expenseType === filterType)
    if (filterMonth) filtered = filtered.filter(e => e.date.startsWith(filterMonth))
    return filtered
  }, [expenses, filterType, filterMonth])

  const typeLabel = (ty: string) => ty === "washing_drugs" ? t('farmer.washingDrugs') : t('farmer.milkingOil')
  const typeColor = (ty: string) => ty === "washing_drugs" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-amber-50 text-amber-700 border-amber-200"

  const getMsExportRecords = () => {
    let data = [...expenses]
    if (msExportExpenseType !== "all") data = data.filter(e => e.expenseType === msExportExpenseType)
    if (msExportType === "daily") data = data.filter(e => e.date === msExportDate)
    if (msExportType === "monthly") data = data.filter(e => e.date.startsWith(msExportMonth))
    if (msExportType === "custom") data = data.filter(e => e.date >= msExportStart && e.date <= msExportEnd)
    return data.sort((a, b) => b.date.localeCompare(a.date))
  }

  const msReportLabel = () => msExportType === "daily" ? `Daily Report — ${msExportDate}` : msExportType === "monthly" ? `Monthly Report — ${msExportMonth}` : msExportType === "custom" ? `Custom Report — ${msExportStart} to ${msExportEnd}` : "All Time Report"

  const exportMsToPDF = async () => {
    setMsExporting(true)
    try {
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF("p", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()
      const records = getMsExportRecords()
      const totalAmount = records.reduce((s, e) => s + e.amount, 0)

      doc.setTextColor(17, 24, 39)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("Milking Supplies Report", 15, 18)
      doc.setTextColor(75, 85, 99)
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.setDrawColor(226, 232, 240)
      doc.line(0, 26, pageWidth, 26)

      doc.setTextColor(55, 65, 81)
      doc.text(`Report Type: ${msReportLabel()}`, 15, 34)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 40)
      doc.text(`Generated by: ${user?.name || "Unknown"}`, 15, 46)

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.rect(15, 52, pageWidth - 30, 16, "FD")
      doc.setFont("helvetica", "bold")
      doc.setTextColor(55, 65, 81)
      doc.text(`Records: ${records.length}`, 20, 62)
      doc.text(`Total Amount: RWF ${totalAmount.toLocaleString()}`, pageWidth - 20, 62, { align: "right" })
      doc.setFont("helvetica", "normal")

      let y = 78
      doc.setFillColor(22, 163, 74)
      doc.rect(15, y - 6, pageWidth - 30, 8, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.text("Date", 18, y)
      doc.text("Type", 48, y)
      doc.text("Quantity", 88, y)
      doc.text("Price/Unit", 128, y)
      doc.text("Amount (RWF)", pageWidth - 18, y, { align: "right" })
      doc.setFont("helvetica", "normal")
      y += 8

      doc.setFontSize(8)
      records.forEach((e, i) => {
        if (y > 280) { doc.addPage(); y = 20 }
        if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(15, y - 5, pageWidth - 30, 7, "F") }
        doc.setTextColor(55, 65, 81)
        doc.text(e.date, 18, y)
        doc.text(e.expenseType === "washing_drugs" ? "Washing Drugs" : "Milking Oil", 48, y)
        doc.text(`${e.quantity} ${e.unit}`, 88, y)
        doc.text(e.pricePerUnit ? `RWF ${e.pricePerUnit.toLocaleString()}` : "—", 128, y)
        doc.text(e.amount.toLocaleString(), pageWidth - 18, y, { align: "right" })
        y += 7
      })

      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        const pw = doc.internal.pageSize.getWidth()
        const ph = doc.internal.pageSize.getHeight()
        doc.setFillColor(248, 250, 252); doc.rect(0, ph - 14, pw, 14, "F")
        doc.setDrawColor(226, 232, 240); doc.line(0, ph - 14, pw, ph - 14)
        doc.setFontSize(7); doc.setTextColor(107, 114, 128)
        doc.text(`Page ${page} of ${totalPages}`, pw - 15, ph - 5, { align: "right" })
      }

      doc.save(`milking-supplies-report-${msExportType}-${new Date().toISOString().split("T")[0]}.pdf`)
    } finally {
      setMsExporting(false)
    }
  }

  const exportMsToExcel = async () => {
    setMsExporting(true)
    try {
      const XLSX = await import("xlsx")
      const records = getMsExportRecords()
      const sheet = XLSX.utils.json_to_sheet(records.map(e => ({
        Date: e.date,
        Type: e.expenseType === "washing_drugs" ? "Washing Drugs" : "Milking Oil",
        Quantity: e.quantity, Unit: e.unit,
        "Price per Unit (RWF)": e.pricePerUnit || "",
        "Amount (RWF)": e.amount,
        Notes: e.notes || "",
      })))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, sheet, "Milking Supplies")
      XLSX.writeFile(wb, `milking-supplies-report-${msExportType}-${today}.xlsx`)
    } finally {
      setMsExporting(false)
    }
  }

  const resetForm = () => {
    setExpenseType("washing_drugs"); setQuantity(""); setUnit(""); setPricePerUnit(""); setAmount("")
    setDate(today); setNotes(""); setErrors({}); setEditExpense(null)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!quantity || Number(quantity) <= 0) e.quantity = "Enter a valid quantity"
    if (!unit) e.unit = "Select a unit"
    if (!amount || Number(amount) <= 0) e.amount = "Enter a valid amount"
    if (!date) e.date = "Select a date"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    const body = { farmerId: user._id.toString(), expenseType, quantity, unit, pricePerUnit, amount, date, notes }

    if (editExpense) {
      await fetch("/api/milking-expenses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editExpense._id, expenseType, quantity, unit, pricePerUnit, amount, date, notes }) })
    } else {
      await fetch("/api/milking-expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchExpenses(user._id.toString())
    resetForm()
    setSaving(false)
  }

  const handleEdit = (e: MilkingExpense) => {
    setEditExpense(e); setExpenseType(e.expenseType); setQuantity(String(e.quantity))
    setUnit(e.unit); setPricePerUnit(e.pricePerUnit ? String(e.pricePerUnit) : "")
    setAmount(String(e.amount)); setDate(e.date); setNotes(e.notes || "")
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/milking-expenses?id=${id}`, { method: "DELETE" })
    await fetchExpenses(user._id.toString())
    setDeleteId(null)
  }

  // ---- Animal expenses (feed/water/health/other, dry/non-lactating animals only -
  // lactating cows' feed/water/salt costs are tracked in Milk Production instead) ----
  const dryAnimals = useMemo(() => animals.filter(a => !(a.type === "cow" && a.lactationStatus === "lactating")), [animals])
  const totalAnimalExpenses = useMemo(() => aExpenses.reduce((s, e) => s + e.amount, 0), [aExpenses])
  const grandTotalExpenses = totalExpenses + totalAnimalExpenses

  const filteredAExpenses = useMemo(() => {
    let filtered = [...aExpenses]
    if (filterAAnimal) filtered = filtered.filter(e => e.animalId === filterAAnimal)
    if (filterAType) filtered = filtered.filter(e => e.expenseType === filterAType)
    return filtered
  }, [aExpenses, filterAAnimal, filterAType])

  const aTypeLabel = (ty: string) => ty === "feed" ? t('farmer.feedWaterSalt') : ty === "water" ? t('farmer.water') : ty === "health" ? t('farmer.health') : t('farmer.other')
  const aTypeColor = (ty: string) => ty === "feed" ? "bg-orange-50 text-orange-700 border-orange-200" : ty === "water" ? "bg-sky-50 text-sky-700 border-sky-200" : ty === "health" ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200"

  const getAeExportRecords = () => {
    let data = [...aExpenses]
    if (aeExportAnimal !== "all") data = data.filter(e => e.animalId === aeExportAnimal)
    if (aeExportType === "daily") data = data.filter(e => e.date === aeExportDate)
    if (aeExportType === "monthly") data = data.filter(e => e.date.startsWith(aeExportMonth))
    if (aeExportType === "custom") data = data.filter(e => e.date >= aeExportStart && e.date <= aeExportEnd)
    return data.sort((a, b) => b.date.localeCompare(a.date))
  }

  const aeReportLabel = () => aeExportType === "daily" ? `Daily Report — ${aeExportDate}` : aeExportType === "monthly" ? `Monthly Report — ${aeExportMonth}` : aeExportType === "custom" ? `Custom Report — ${aeExportStart} to ${aeExportEnd}` : "All Time Report"

  const exportAeToPDF = async () => {
    setAeExporting(true)
    try {
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF("l", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()
      const records = getAeExportRecords()
      const totalAmount = records.reduce((s, e) => s + e.amount, 0)
      const animalName = aeExportAnimal === "all" ? "All Animals" : (animals.find(a => a._id === aeExportAnimal)?.name || "Unknown")

      doc.setTextColor(17, 24, 39)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("Animal Expenses Report (Dry Animals)", 15, 18)
      doc.setTextColor(75, 85, 99)
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.setDrawColor(226, 232, 240)
      doc.line(0, 26, pageWidth, 26)

      doc.setTextColor(55, 65, 81)
      doc.text(`Animal: ${animalName}`, 15, 34)
      doc.text(`Report Type: ${aeReportLabel()}`, 15, 40)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 46)
      doc.text(`Generated by: ${user?.name || "Unknown"}`, 15, 52)

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.rect(15, 58, pageWidth - 30, 16, "FD")
      doc.setFont("helvetica", "bold")
      doc.setTextColor(55, 65, 81)
      doc.text(`Records: ${records.length}`, 20, 68)
      doc.text(`Total Amount: RWF ${totalAmount.toLocaleString()}`, pageWidth - 20, 68, { align: "right" })
      doc.setFont("helvetica", "normal")

      let y = 84
      const cols = { date: 18, animal: 40, type: 65, time: 90, feed: 108, water: 140, salt: 172, desc: 200, amount: pageWidth - 18 }
      doc.setFillColor(22, 163, 74)
      doc.rect(15, y - 6, pageWidth - 30, 8, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7.5)
      doc.setFont("helvetica", "bold")
      doc.text("Date", cols.date, y)
      doc.text("Animal", cols.animal, y)
      doc.text("Type", cols.type, y)
      doc.text("Time", cols.time, y)
      doc.text("Feed (RWF)", cols.feed, y)
      doc.text("Water (RWF)", cols.water, y)
      doc.text("Salt (RWF)", cols.salt, y)
      doc.text("Amount (RWF)", cols.amount, y, { align: "right" })
      doc.setFont("helvetica", "normal")
      y += 8

      doc.setFontSize(7.5)
      records.forEach((e, i) => {
        if (y > 190) { doc.addPage(); y = 20 }
        if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(15, y - 5, pageWidth - 30, 7, "F") }
        doc.setTextColor(55, 65, 81)
        doc.text(e.date, cols.date, y)
        doc.text(e.animalName || "—", cols.animal, y)
        doc.text(aTypeLabel(e.expenseType), cols.type, y)
        doc.text(e.time || "—", cols.time, y)
        doc.text(e.foodCost ? e.foodCost.toLocaleString() : "—", cols.feed, y)
        doc.text(e.waterCost ? e.waterCost.toLocaleString() : "—", cols.water, y)
        doc.text(e.saltCost ? e.saltCost.toLocaleString() : "—", cols.salt, y)
        doc.text(e.amount.toLocaleString(), cols.amount, y, { align: "right" })
        y += 7
      })

      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        const pw = doc.internal.pageSize.getWidth()
        const ph = doc.internal.pageSize.getHeight()
        doc.setFillColor(248, 250, 252); doc.rect(0, ph - 14, pw, 14, "F")
        doc.setDrawColor(226, 232, 240); doc.line(0, ph - 14, pw, ph - 14)
        doc.setFontSize(7); doc.setTextColor(107, 114, 128)
        doc.text(`Page ${page} of ${totalPages}`, pw - 15, ph - 5, { align: "right" })
      }

      doc.save(`animal-expenses-report-${aeExportType}-${new Date().toISOString().split("T")[0]}.pdf`)
    } finally {
      setAeExporting(false)
    }
  }

  const exportAeToExcel = async () => {
    setAeExporting(true)
    try {
      const XLSX = await import("xlsx")
      const records = getAeExportRecords()
      const sheet = XLSX.utils.json_to_sheet(records.map(e => ({
        Date: e.date, Animal: e.animalName || "", Type: aTypeLabel(e.expenseType), Time: e.time || "",
        "Feed (kg)": e.foodKg || "", "Feed Cost (RWF)": e.foodCost || "",
        "Water (L)": e.waterLiters || "", "Water Cost (RWF)": e.waterCost || "",
        "Salt (kg)": e.saltKg || "", "Salt Cost (RWF)": e.saltCost || "",
        Description: e.description || "", "Amount (RWF)": e.amount, Notes: e.notes || "",
      })))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, sheet, "Animal Expenses")
      XLSX.writeFile(wb, `animal-expenses-report-${aeExportType}-${today}.xlsx`)
    } finally {
      setAeExporting(false)
    }
  }

  const isFeedWaterSalt = aExpenseType === "feed"
  const aComputedTotal = useMemo(() => (Number(aFoodCost) || 0) + (Number(aWaterCost) || 0) + (Number(aSaltCost) || 0), [aFoodCost, aWaterCost, aSaltCost])

  const resetAForm = () => {
    setAAnimalId(""); setAExpenseType("feed"); setADescription(""); setAAmount("")
    setADate(today); setATime(""); setAFoodKg(""); setAFoodCost(""); setAWaterLiters(""); setAWaterCost(""); setASaltKg(""); setASaltCost("")
    setANotes(""); setAErrors({}); setEditAExpense(null)
  }

  const validateAExpense = () => {
    const e: Record<string, string> = {}
    if (!aAnimalId) e.aAnimalId = "Select an animal"
    if (aExpenseType === "feed") {
      if (aComputedTotal <= 0) e.aAmount = "Enter at least one of feed, water, or salt cost"
    } else if (!aAmount || Number(aAmount) <= 0) {
      e.aAmount = "Enter a valid amount"
    }
    if (!aDate) e.aDate = "Select a date"
    setAErrors(e)
    return Object.keys(e).length === 0
  }

  const handleASubmit = async () => {
    if (!validateAExpense()) return
    setSaving(true)
    const animal = animals.find(a => a._id === aAnimalId)
    const body = {
      farmerId: user._id.toString(), animalId: aAnimalId, animalName: animal?.name, expenseType: aExpenseType,
      description: aDescription, amount: aAmount, date: aDate, notes: aNotes,
      time: aTime, foodKg: aFoodKg, foodCost: aFoodCost, waterLiters: aWaterLiters, waterCost: aWaterCost, saltKg: aSaltKg, saltCost: aSaltCost,
    }

    if (editAExpense) {
      await fetch("/api/animal-expenses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editAExpense._id, ...body }) })
    } else {
      await fetch("/api/animal-expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchAnimalExpenses(user._id.toString())
    resetAForm()
    setSaving(false)
  }

  const handleAEdit = (e: AnimalExpense) => {
    setEditAExpense(e); setAAnimalId(e.animalId); setAExpenseType(e.expenseType)
    setADescription(e.description || ""); setAAmount(String(e.amount)); setADate(e.date); setATime(e.time || "")
    setAFoodKg(e.foodKg ? String(e.foodKg) : ""); setAFoodCost(e.foodCost ? String(e.foodCost) : "")
    setAWaterLiters(e.waterLiters ? String(e.waterLiters) : ""); setAWaterCost(e.waterCost ? String(e.waterCost) : "")
    setASaltKg(e.saltKg ? String(e.saltKg) : ""); setASaltCost(e.saltCost ? String(e.saltCost) : "")
    setANotes(e.notes || "")
  }

  const handleADelete = async (id: string) => {
    await fetch(`/api/animal-expenses?id=${id}`, { method: "DELETE" })
    await fetchAnimalExpenses(user._id.toString())
    setDeleteAExpenseId(null)
  }

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 bg-gray-200 rounded w-40" />
        <div className="h-4 bg-gray-200 rounded w-64 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('farmer.expenses')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('farmer.expensesDesc')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalWashingDrugsCost')}</p>
              <SprayCan className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-sky-600 mt-2">RWF {totalWashingDrugsCost.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalMilkingOilCost')}</p>
              <Droplet className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-amber-600 mt-2">RWF {totalMilkingOilCost.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalAnimalExpenses')}</p>
              <PawPrint className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-orange-600 mt-2">RWF {totalAnimalExpenses.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalExpenses')}</p>
              <Receipt className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-red-600 mt-2">RWF {grandTotalExpenses.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="milking">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="milking" className="flex items-center gap-1"><SprayCan className="h-4 w-4" /> {t('farmer.tabMilkingSupplies')}</TabsTrigger>
          <TabsTrigger value="animal" className="flex items-center gap-1"><PawPrint className="h-4 w-4" /> {t('farmer.tabAnimalExpenses')}</TabsTrigger>
        </TabsList>

        {/* MILKING SUPPLIES TAB */}
        <TabsContent value="milking" className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setMsExportOpen(true)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2">
          <Download className="h-4 w-4" /> {t('farmer.exportReport')}
        </Button>
      </div>
      <Tabs defaultValue="record">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="record" className="flex items-center gap-1"><Plus className="h-4 w-4" /> {t('farmer.tabRecord')}</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1"><History className="h-4 w-4" /> {t('farmer.tabHistory')}</TabsTrigger>
        </TabsList>

        {/* RECORD TAB */}
        <TabsContent value="record">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {editExpense ? t('farmer.editExpense') : t('farmer.recordExpense')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Expense Type */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.expenseType')} *</label>
                  <Select value={expenseType} onValueChange={setExpenseType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_TYPES.map(ty => <SelectItem key={ty} value={ty}>{typeLabel(ty)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.quantity')} *</label>
                  <Input type="number" min="0" step="0.1" placeholder="e.g. 2" value={quantity} onChange={e => setQuantity(e.target.value)} className={errors.quantity ? "border-red-500" : ""} />
                  {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
                </div>

                {/* Unit */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.unit')} *</label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className={errors.unit ? "border-red-500" : ""}>
                      <SelectValue placeholder={t('farmer.unit')} />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.unit && <p className="text-xs text-red-500">{errors.unit}</p>}
                </div>

                {/* Price per Unit */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.pricePerUnit')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input type="number" min="0" placeholder="e.g. 750" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.amount')} * <span className="text-gray-400 text-xs">{t('farmer.autoCalculated')}</span></label>
                  <Input type="number" min="0" placeholder="e.g. 1500" value={amount} onChange={e => setAmount(e.target.value)} className={errors.amount ? "border-red-500" : "bg-green-50"} />
                  {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.date')} *</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className={errors.date ? "border-red-500" : ""} />
                  {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                </div>

                {/* Notes */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.notes')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input placeholder={t('farmer.anyObservations')} value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6">
                  {saving ? t('farmer.savingRecord') : editExpense ? t('farmer.updateRecord') : t('farmer.saveRecord')}
                </Button>
                {editExpense && (
                  <Button variant="outline" onClick={resetForm} className="rounded-lg">{t('farmer.cancel')}</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-sky-500 rounded-full" />
                {t('farmer.tabHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                <Select value={filterType || "all"} onValueChange={v => setFilterType(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t('farmer.allTypes')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('farmer.allTypes')}</SelectItem>
                    {EXPENSE_TYPES.map(ty => <SelectItem key={ty} value={ty}>{typeLabel(ty)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-500">{filteredExpenses.length}</p>
                  <Button variant="outline" onClick={() => { setFilterType(""); setFilterMonth("") }} className="rounded-lg ml-auto">{t('farmer.clearFilters')}</Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('farmer.date')}</TableHead>
                      <TableHead>{t('farmer.expenseType')}</TableHead>
                      <TableHead>{t('farmer.quantity')}</TableHead>
                      <TableHead>{t('farmer.pricePerUnit')}</TableHead>
                      <TableHead>{t('farmer.amount')}</TableHead>
                      <TableHead>{t('farmer.notes')}</TableHead>
                      <TableHead>{t('farmer.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">{t('farmer.noExpensesYet')}</TableCell></TableRow>
                    ) : filteredExpenses.map(e => (
                      <TableRow key={e._id}>
                        <TableCell className="text-sm">{e.date}</TableCell>
                        <TableCell><Badge variant="outline" className={typeColor(e.expenseType)}>{typeLabel(e.expenseType)}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-700">{e.quantity} {e.unit}</TableCell>
                        <TableCell className="text-sm text-gray-700">{e.pricePerUnit ? `RWF ${e.pricePerUnit.toLocaleString()}` : "—"}</TableCell>
                        <TableCell className="font-semibold text-red-700">RWF {e.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[160px] truncate">{e.notes || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(e)} className="h-8 w-8 p-0 hover:bg-green-50">
                              <Pencil className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteId(e._id)} className="h-8 w-8 p-0 hover:bg-red-50">
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
      </Tabs>
        </TabsContent>

        {/* ANIMAL EXPENSES TAB */}
        <TabsContent value="animal" className="space-y-6">
          <p className="text-sm text-gray-500 -mt-2">{t('farmer.animalExpensesTabDesc')}</p>
          <div className="flex justify-end">
            <Button onClick={() => setAeExportOpen(true)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2">
              <Download className="h-4 w-4" /> {t('farmer.exportReport')}
            </Button>
          </div>
          <Tabs defaultValue="record">
            <TabsList className="grid grid-cols-2 w-full max-w-sm">
              <TabsTrigger value="record" className="flex items-center gap-1"><Plus className="h-4 w-4" /> {t('farmer.tabRecord')}</TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1"><History className="h-4 w-4" /> {t('farmer.tabHistory')}</TabsTrigger>
            </TabsList>

            {/* RECORD TAB */}
            <TabsContent value="record">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    {editAExpense ? t('farmer.editExpense') : t('farmer.recordExpense')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {animals.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">{t('farmer.selectAnimalRegisterFirst')}</p>
                  ) : dryAnimals.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">{t('farmer.noDryAnimalsAvailable')}</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">{t('farmer.selectAnimal')} *</label>
                          <Combobox
                            value={aAnimalId}
                            onValueChange={setAAnimalId}
                            options={dryAnimals.map(a => ({ value: a._id, label: `${a.name} (${a.type})` }))}
                            placeholder={t('farmer.selectAnimal')}
                            searchPlaceholder={t('farmer.searchAnimals') || "Search animals…"}
                            emptyText={t('farmer.noResultsFound') || "No animals found."}
                            disabled={!!editAExpense}
                            className={aErrors.aAnimalId ? "border-red-500" : ""}
                          />
                          {aErrors.aAnimalId && <p className="text-xs text-red-500">{aErrors.aAnimalId}</p>}
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">{t('farmer.expenseType')} *</label>
                          <Select value={aExpenseType} onValueChange={setAExpenseType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ANIMAL_EXPENSE_TYPES.map(ty => <SelectItem key={ty} value={ty}>{aTypeLabel(ty)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {!isFeedWaterSalt && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">{t('farmer.expenseDescription')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                            <Input placeholder="e.g. 40kg maize bran" value={aDescription} onChange={e => setADescription(e.target.value)} />
                          </div>
                        )}

                        {isFeedWaterSalt && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">{t('farmer.time')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                            <Input type="time" value={aTime} onChange={e => setATime(e.target.value)} />
                          </div>
                        )}

                        {!isFeedWaterSalt && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">{t('farmer.amount')} *</label>
                            <Input type="number" min="0" placeholder="e.g. 1500" value={aAmount} onChange={e => setAAmount(e.target.value)} className={aErrors.aAmount ? "border-red-500" : ""} />
                            {aErrors.aAmount && <p className="text-xs text-red-500">{aErrors.aAmount}</p>}
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">{t('farmer.date')} *</label>
                          <Input type="date" value={aDate} onChange={e => setADate(e.target.value)} className={aErrors.aDate ? "border-red-500" : ""} />
                          {aErrors.aDate && <p className="text-xs text-red-500">{aErrors.aDate}</p>}
                        </div>

                        {isFeedWaterSalt && (
                          <>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700">{t('farmer.foodEaten')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                              <Input type="number" min="0" step="0.1" placeholder="e.g. 15" value={aFoodKg} onChange={e => setAFoodKg(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700">{t('farmer.foodCost')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                              <Input type="number" min="0" step="0.01" placeholder="e.g. 3000" value={aFoodCost} onChange={e => setAFoodCost(e.target.value)} />
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700">{t('farmer.waterIntake')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                              <Input type="number" min="0" step="0.5" placeholder="e.g. 40" value={aWaterLiters} onChange={e => setAWaterLiters(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700">{t('farmer.waterCost')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                              <Input type="number" min="0" step="0.01" placeholder="e.g. 1000" value={aWaterCost} onChange={e => setAWaterCost(e.target.value)} />
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700">{t('farmer.saltConsumed')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                              <Input type="number" min="0" step="0.1" placeholder="e.g. 0.5" value={aSaltKg} onChange={e => setASaltKg(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700">{t('farmer.saltCost')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                              <Input type="number" min="0" step="0.01" placeholder="e.g. 500" value={aSaltCost} onChange={e => setASaltCost(e.target.value)} />
                            </div>

                            <div className="space-y-1 md:col-span-2 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
                              <span className="text-sm font-medium text-orange-800">{t('farmer.totalCost')}</span>
                              <span className="text-lg font-bold text-orange-700">RWF {aComputedTotal.toLocaleString()}</span>
                            </div>
                            {aErrors.aAmount && <p className="text-xs text-red-500 md:col-span-2">{aErrors.aAmount}</p>}
                          </>
                        )}

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">{t('farmer.notes')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                          <Input placeholder={t('farmer.anyObservations')} value={aNotes} onChange={e => setANotes(e.target.value)} />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button onClick={handleASubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6">
                          {saving ? t('farmer.savingRecord') : editAExpense ? t('farmer.updateRecord') : t('farmer.saveRecord')}
                        </Button>
                        {editAExpense && (
                          <Button variant="outline" onClick={resetAForm} className="rounded-lg">{t('farmer.cancel')}</Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* HISTORY TAB */}
            <TabsContent value="history">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-sky-500 rounded-full" />
                    {t('farmer.tabHistory')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                    <Combobox
                      value={filterAAnimal || "all"}
                      onValueChange={v => setFilterAAnimal(v === "all" ? "" : v)}
                      options={[
                        { value: "all", label: t('farmer.allAnimals') },
                        ...dryAnimals.map(a => ({ value: a._id, label: a.name })),
                      ]}
                      placeholder={t('farmer.allAnimals')}
                      searchPlaceholder={t('farmer.searchAnimals') || "Search animals…"}
                      emptyText={t('farmer.noResultsFound') || "No animals found."}
                    />
                    <Select value={filterAType || "all"} onValueChange={v => setFilterAType(v === "all" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder={t('farmer.allTypes')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('farmer.allTypes')}</SelectItem>
                        {[...ANIMAL_EXPENSE_TYPES, "water"].map(ty => <SelectItem key={ty} value={ty}>{aTypeLabel(ty)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-500">{filteredAExpenses.length}</p>
                      <Button variant="outline" onClick={() => { setFilterAAnimal(""); setFilterAType("") }} className="rounded-lg ml-auto">{t('farmer.clearFilters')}</Button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('farmer.date')}</TableHead>
                          <TableHead>{t('farmer.time')}</TableHead>
                          <TableHead>{t('farmer.name')}</TableHead>
                          <TableHead>{t('farmer.expenseType')}</TableHead>
                          <TableHead>{t('farmer.description')}</TableHead>
                          <TableHead>{t('farmer.amount')}</TableHead>
                          <TableHead>{t('farmer.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAExpenses.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">{t('farmer.noAnimalExpensesYet')}</TableCell></TableRow>
                        ) : filteredAExpenses.map(e => (
                          <TableRow key={e._id}>
                            <TableCell className="text-sm">{e.date}</TableCell>
                            <TableCell className="text-sm text-gray-500">{e.time || "—"}</TableCell>
                            <TableCell className="font-medium">{e.animalName || "—"}</TableCell>
                            <TableCell><Badge variant="outline" className={aTypeColor(e.expenseType)}>{aTypeLabel(e.expenseType)}</Badge></TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {e.expenseType === "feed" ? (
                                <div className="flex flex-col gap-0.5">
                                  {e.foodCost != null && <span>{t('farmer.foodEaten')}: {e.foodKg ?? "—"}kg / RWF {e.foodCost.toLocaleString()}</span>}
                                  {e.waterCost != null && <span>{t('farmer.waterIntake')}: {e.waterLiters ?? "—"}L / RWF {e.waterCost.toLocaleString()}</span>}
                                  {e.saltCost != null && <span>{t('farmer.saltConsumed')}: {e.saltKg ?? "—"}kg / RWF {e.saltCost.toLocaleString()}</span>}
                                  {e.description && <span>{e.description}</span>}
                                </div>
                              ) : (e.description || "—")}
                            </TableCell>
                            <TableCell className="font-semibold text-red-700">RWF {e.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleAEdit(e)} className="h-8 w-8 p-0 hover:bg-green-50">
                                  <Pencil className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setDeleteAExpenseId(e._id)} className="h-8 w-8 p-0 hover:bg-red-50">
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
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Milking Supplies — Export Report Dialog */}
      <Dialog open={msExportOpen} onOpenChange={setMsExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              {t('farmer.exportMilkingSuppliesReport')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t('farmer.expenseType')}</label>
              <Select value={msExportExpenseType} onValueChange={setMsExportExpenseType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('farmer.allTypes')}</SelectItem>
                  {EXPENSE_TYPES.map(ty => <SelectItem key={ty} value={ty}>{typeLabel(ty)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t('farmer.reportType')}</label>
              <Select value={msExportType} onValueChange={v => setMsExportType(v as "daily" | "monthly" | "total" | "custom")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('farmer.dailyReport')}</SelectItem>
                  <SelectItem value="monthly">{t('farmer.monthlyReport')}</SelectItem>
                  <SelectItem value="total">{t('farmer.allTime')}</SelectItem>
                  <SelectItem value="custom">{t('farmer.customReport')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {msExportType === "daily" && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.selectDate')}</label>
                <Input type="date" value={msExportDate} onChange={e => setMsExportDate(e.target.value)} />
              </div>
            )}
            {msExportType === "monthly" && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.selectMonth')}</label>
                <Input type="month" value={msExportMonth} onChange={e => setMsExportMonth(e.target.value)} />
              </div>
            )}
            {msExportType === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.startDate')}</label>
                  <Input type="date" value={msExportStart} max={msExportEnd} onChange={e => setMsExportStart(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.endDate')}</label>
                  <Input type="date" value={msExportEnd} min={msExportStart} onChange={e => setMsExportEnd(e.target.value)} />
                </div>
              </div>
            )}

            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
              {(() => {
                const preview = getMsExportRecords()
                const previewTotal = preview.reduce((s, e) => s + e.amount, 0)
                return (
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-green-700">{t('farmer.preview')}</p>
                    <p className="text-gray-600">{preview.length} records &bull; RWF {previewTotal.toLocaleString()}</p>
                  </div>
                )
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline" onClick={() => setMsExportOpen(false)} className="rounded-lg">{t('farmer.cancel')}</Button>
              <Button onClick={exportMsToExcel} disabled={msExporting || getMsExportRecords().length === 0} className="rounded-lg bg-green-600 hover:bg-green-700 text-white gap-2">
                <Download className="h-4 w-4" /> {msExporting ? t('farmer.exporting') : t('farmer.exportExcel')}
              </Button>
              <Button onClick={exportMsToPDF} disabled={msExporting || getMsExportRecords().length === 0} className="col-span-2 bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2">
                <FileText className="h-4 w-4" /> {msExporting ? t('farmer.exporting') : t('farmer.exportPDF')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Animal Expenses — Export Report Dialog */}
      <Dialog open={aeExportOpen} onOpenChange={setAeExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              {t('farmer.exportAnimalExpensesReport')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t('farmer.animal')}</label>
              <Combobox
                value={aeExportAnimal}
                onValueChange={setAeExportAnimal}
                options={[
                  { value: "all", label: t('farmer.allAnimals') },
                  ...dryAnimals.map(a => ({ value: a._id, label: a.name })),
                ]}
                searchPlaceholder={t('farmer.searchAnimals') || "Search animals…"}
                emptyText={t('farmer.noResultsFound') || "No animals found."}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t('farmer.reportType')}</label>
              <Select value={aeExportType} onValueChange={v => setAeExportType(v as "daily" | "monthly" | "total" | "custom")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('farmer.dailyReport')}</SelectItem>
                  <SelectItem value="monthly">{t('farmer.monthlyReport')}</SelectItem>
                  <SelectItem value="total">{t('farmer.allTime')}</SelectItem>
                  <SelectItem value="custom">{t('farmer.customReport')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {aeExportType === "daily" && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.selectDate')}</label>
                <Input type="date" value={aeExportDate} onChange={e => setAeExportDate(e.target.value)} />
              </div>
            )}
            {aeExportType === "monthly" && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.selectMonth')}</label>
                <Input type="month" value={aeExportMonth} onChange={e => setAeExportMonth(e.target.value)} />
              </div>
            )}
            {aeExportType === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.startDate')}</label>
                  <Input type="date" value={aeExportStart} max={aeExportEnd} onChange={e => setAeExportStart(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.endDate')}</label>
                  <Input type="date" value={aeExportEnd} min={aeExportStart} onChange={e => setAeExportEnd(e.target.value)} />
                </div>
              </div>
            )}

            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
              {(() => {
                const preview = getAeExportRecords()
                const previewTotal = preview.reduce((s, e) => s + e.amount, 0)
                return (
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-green-700">{t('farmer.preview')}</p>
                    <p className="text-gray-600">{preview.length} records &bull; RWF {previewTotal.toLocaleString()}</p>
                  </div>
                )
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline" onClick={() => setAeExportOpen(false)} className="rounded-lg">{t('farmer.cancel')}</Button>
              <Button onClick={exportAeToExcel} disabled={aeExporting || getAeExportRecords().length === 0} className="rounded-lg bg-green-600 hover:bg-green-700 text-white gap-2">
                <Download className="h-4 w-4" /> {aeExporting ? t('farmer.exporting') : t('farmer.exportExcel')}
              </Button>
              <Button onClick={exportAeToPDF} disabled={aeExporting || getAeExportRecords().length === 0} className="col-span-2 bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2">
                <FileText className="h-4 w-4" /> {aeExporting ? t('farmer.exporting') : t('farmer.exportPDF')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.deleteExpense')}</AlertDialogTitle>
            <AlertDialogDescription>{t('farmer.deleteExpenseConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('farmer.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-600 hover:bg-red-700 text-white">{t('farmer.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAExpenseId} onOpenChange={open => !open && setDeleteAExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.deleteExpense')}</AlertDialogTitle>
            <AlertDialogDescription>{t('farmer.deleteExpenseConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('farmer.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAExpenseId && handleADelete(deleteAExpenseId)} className="bg-red-600 hover:bg-red-700 text-white">{t('farmer.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
