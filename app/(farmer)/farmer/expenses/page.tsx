"use client"

import { useState, useEffect, useMemo } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Receipt, Plus, Pencil, Trash2, History, Droplet, SprayCan } from "lucide-react"

interface MilkingExpense {
  _id: string; farmerId: string
  expenseType: "washing_drugs" | "milking_oil"
  quantity: number; unit: string
  amount: number; date: string; notes: string | null
}

const EXPENSE_TYPES = ["washing_drugs", "milking_oil"] as const
const EXPENSE_UNITS = ["litres", "ml", "kg", "units"]
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

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setUser(userData)
      await fetchExpenses(userData._id.toString())
      setLoading(false)
    }
    init()
  }, [])

  const fetchExpenses = async (farmerId: string) => {
    const res = await fetch(`/api/milking-expenses?farmerId=${farmerId}`)
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalWashingDrugsCost')}</p>
              <SprayCan className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-sky-600 mt-2">RWF {totalWashingDrugsCost.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalMilkingOilCost')}</p>
              <Droplet className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-amber-600 mt-2">RWF {totalMilkingOilCost.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalExpenses')}</p>
              <Receipt className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-red-600 mt-2">RWF {totalExpenses.toLocaleString()}</h3>
          </CardContent>
        </Card>
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
    </div>
  )
}
