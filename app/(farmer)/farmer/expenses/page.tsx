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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Receipt, Plus, Pencil, Trash2, History, Droplet, SprayCan, PawPrint } from "lucide-react"

interface MilkingExpense {
  _id: string; farmerId: string
  expenseType: "washing_drugs" | "milking_oil"
  quantity: number; unit: string
  amount: number; date: string; notes: string | null
}
interface Animal { _id: string; name: string; type: string }
interface AnimalExpense {
  _id: string; farmerId: string; animalId: string; animalName: string | null
  expenseType: "feed" | "water" | "health" | "other"
  description: string | null; amount: number; date: string; notes: string | null
}

const EXPENSE_TYPES = ["washing_drugs", "milking_oil"] as const
const EXPENSE_UNITS = ["litres", "ml", "kg", "units"]
const ANIMAL_EXPENSE_TYPES = ["feed", "water", "health", "other"] as const
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
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filters
  const [filterType, setFilterType] = useState("")
  const [filterMonth, setFilterMonth] = useState("")

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
  const [aNotes, setANotes] = useState("")
  const [aErrors, setAErrors] = useState<Record<string, string>>({})
  const [filterAAnimal, setFilterAAnimal] = useState("")
  const [filterAType, setFilterAType] = useState("")

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

  const resetForm = () => {
    setExpenseType("washing_drugs"); setQuantity(""); setUnit(""); setAmount("")
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
    const body = { farmerId: user._id.toString(), expenseType, quantity, unit, amount, date, notes }

    if (editExpense) {
      await fetch("/api/milking-expenses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editExpense._id, expenseType, quantity, unit, amount, date, notes }) })
    } else {
      await fetch("/api/milking-expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchExpenses(user._id.toString())
    resetForm()
    setSaving(false)
  }

  const handleEdit = (e: MilkingExpense) => {
    setEditExpense(e); setExpenseType(e.expenseType); setQuantity(String(e.quantity))
    setUnit(e.unit); setAmount(String(e.amount)); setDate(e.date); setNotes(e.notes || "")
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/milking-expenses?id=${id}`, { method: "DELETE" })
    await fetchExpenses(user._id.toString())
    setDeleteId(null)
  }

  // ---- Animal expenses (feed/water/health/other, any animal - dry cows, males, etc.) ----
  const totalAnimalExpenses = useMemo(() => aExpenses.reduce((s, e) => s + e.amount, 0), [aExpenses])
  const grandTotalExpenses = totalExpenses + totalAnimalExpenses

  const filteredAExpenses = useMemo(() => {
    let filtered = [...aExpenses]
    if (filterAAnimal) filtered = filtered.filter(e => e.animalId === filterAAnimal)
    if (filterAType) filtered = filtered.filter(e => e.expenseType === filterAType)
    return filtered
  }, [aExpenses, filterAAnimal, filterAType])

  const aTypeLabel = (ty: string) => ty === "feed" ? t('farmer.feed') : ty === "water" ? t('farmer.water') : ty === "health" ? t('farmer.health') : t('farmer.other')
  const aTypeColor = (ty: string) => ty === "feed" ? "bg-orange-50 text-orange-700 border-orange-200" : ty === "water" ? "bg-sky-50 text-sky-700 border-sky-200" : ty === "health" ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200"

  const resetAForm = () => {
    setAAnimalId(""); setAExpenseType("feed"); setADescription(""); setAAmount("")
    setADate(today); setANotes(""); setAErrors({}); setEditAExpense(null)
  }

  const validateAExpense = () => {
    const e: Record<string, string> = {}
    if (!aAnimalId) e.aAnimalId = "Select an animal"
    if (!aAmount || Number(aAmount) <= 0) e.aAmount = "Enter a valid amount"
    if (!aDate) e.aDate = "Select a date"
    setAErrors(e)
    return Object.keys(e).length === 0
  }

  const handleASubmit = async () => {
    if (!validateAExpense()) return
    setSaving(true)
    const animal = animals.find(a => a._id === aAnimalId)
    const body = { farmerId: user._id.toString(), animalId: aAnimalId, animalName: animal?.name, expenseType: aExpenseType, description: aDescription, amount: aAmount, date: aDate, notes: aNotes }

    if (editAExpense) {
      await fetch("/api/animal-expenses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editAExpense._id, expenseType: aExpenseType, description: aDescription, amount: aAmount, date: aDate, notes: aNotes }) })
    } else {
      await fetch("/api/animal-expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchAnimalExpenses(user._id.toString())
    resetAForm()
    setSaving(false)
  }

  const handleAEdit = (e: AnimalExpense) => {
    setEditAExpense(e); setAAnimalId(e.animalId); setAExpenseType(e.expenseType)
    setADescription(e.description || ""); setAAmount(String(e.amount)); setADate(e.date); setANotes(e.notes || "")
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

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.amount')} *</label>
                  <Input type="number" min="0" placeholder="e.g. 1500" value={amount} onChange={e => setAmount(e.target.value)} className={errors.amount ? "border-red-500" : ""} />
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
                      <TableHead>{t('farmer.amount')}</TableHead>
                      <TableHead>{t('farmer.notes')}</TableHead>
                      <TableHead>{t('farmer.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">{t('farmer.noExpensesYet')}</TableCell></TableRow>
                    ) : filteredExpenses.map(e => (
                      <TableRow key={e._id}>
                        <TableCell className="text-sm">{e.date}</TableCell>
                        <TableCell><Badge variant="outline" className={typeColor(e.expenseType)}>{typeLabel(e.expenseType)}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-700">{e.quantity} {e.unit}</TableCell>
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
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">{t('farmer.selectAnimal')} *</label>
                          <Select value={aAnimalId} onValueChange={setAAnimalId} disabled={!!editAExpense}>
                            <SelectTrigger className={aErrors.aAnimalId ? "border-red-500" : ""}><SelectValue placeholder={t('farmer.selectAnimal')} /></SelectTrigger>
                            <SelectContent>
                              {animals.map(a => <SelectItem key={a._id} value={a._id}>{a.name} ({a.type})</SelectItem>)}
                            </SelectContent>
                          </Select>
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

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">{t('farmer.expenseDescription')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                          <Input placeholder="e.g. 40kg maize bran" value={aDescription} onChange={e => setADescription(e.target.value)} />
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">{t('farmer.amount')} *</label>
                          <Input type="number" min="0" placeholder="e.g. 1500" value={aAmount} onChange={e => setAAmount(e.target.value)} className={aErrors.aAmount ? "border-red-500" : ""} />
                          {aErrors.aAmount && <p className="text-xs text-red-500">{aErrors.aAmount}</p>}
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">{t('farmer.date')} *</label>
                          <Input type="date" value={aDate} onChange={e => setADate(e.target.value)} className={aErrors.aDate ? "border-red-500" : ""} />
                          {aErrors.aDate && <p className="text-xs text-red-500">{aErrors.aDate}</p>}
                        </div>

                        <div className="space-y-1">
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
                    <Select value={filterAAnimal || "all"} onValueChange={v => setFilterAAnimal(v === "all" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder={t('farmer.allAnimals')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('farmer.allAnimals')}</SelectItem>
                        {animals.map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filterAType || "all"} onValueChange={v => setFilterAType(v === "all" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder={t('farmer.allTypes')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('farmer.allTypes')}</SelectItem>
                        {ANIMAL_EXPENSE_TYPES.map(ty => <SelectItem key={ty} value={ty}>{aTypeLabel(ty)}</SelectItem>)}
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
                          <TableHead>{t('farmer.name')}</TableHead>
                          <TableHead>{t('farmer.expenseType')}</TableHead>
                          <TableHead>{t('farmer.description')}</TableHead>
                          <TableHead>{t('farmer.amount')}</TableHead>
                          <TableHead>{t('farmer.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAExpenses.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">{t('farmer.noAnimalExpensesYet')}</TableCell></TableRow>
                        ) : filteredAExpenses.map(e => (
                          <TableRow key={e._id}>
                            <TableCell className="text-sm">{e.date}</TableCell>
                            <TableCell className="font-medium">{e.animalName || "—"}</TableCell>
                            <TableCell><Badge variant="outline" className={aTypeColor(e.expenseType)}>{aTypeLabel(e.expenseType)}</Badge></TableCell>
                            <TableCell className="text-sm text-gray-500">{e.description || "—"}</TableCell>
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
