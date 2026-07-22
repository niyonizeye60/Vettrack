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
import { Baby, Plus, Pencil, Trash2, History, Scale, Milk, Receipt, TrendingUp } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface Animal { _id: string; name: string; type: string }
interface Calf {
  _id: string; farmerId: string; name: string; motherAnimalId: string | null; motherName: string | null
  gender: "male" | "female"; breed: string | null; birthDate: string; birthWeight: number | null
  status: "active" | "weaned" | "sold" | "deceased"; notes: string | null
}
interface WeightRecord {
  _id: string; farmerId: string; calfId: string; calfName: string | null; weight: number; date: string; notes: string | null
}
interface CalfExpense {
  _id: string; farmerId: string; calfId: string; calfName: string | null
  expenseType: "milk" | "feed" | "veterinary" | "other"; milkLiters: number | null
  description: string | null; amount: number; date: string; notes: string | null
}

const STATUSES = ["active", "weaned", "sold", "deceased"] as const
const EXPENSE_TYPES = ["milk", "feed", "veterinary", "other"] as const
const today = new Date().toISOString().split("T")[0]

function formatAge(birthDate: string, t: (k: string) => string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000))
  if (days < 60) return `${days} ${t('farmer.days')}`
  return `${Math.floor(days / 30)} ${t('farmer.months')}`
}

export default function CalvesPage() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [animals, setAnimals] = useState<Animal[]>([])
  const [calves, setCalves] = useState<Calf[]>([])
  const [weights, setWeights] = useState<WeightRecord[]>([])
  const [expenses, setExpenses] = useState<CalfExpense[]>([])

  // Calf form
  const [editCalf, setEditCalf] = useState<Calf | null>(null)
  const [deleteCalfId, setDeleteCalfId] = useState<string | null>(null)
  const [calfName, setCalfName] = useState("")
  const [motherAnimalId, setMotherAnimalId] = useState("")
  const [gender, setGender] = useState("")
  const [breed, setBreed] = useState("")
  const [birthDate, setBirthDate] = useState(today)
  const [birthWeight, setBirthWeight] = useState("")
  const [status, setStatus] = useState("active")
  const [calfNotes, setCalfNotes] = useState("")
  const [calfErrors, setCalfErrors] = useState<Record<string, string>>({})

  // Weight form
  const [editWeight, setEditWeight] = useState<WeightRecord | null>(null)
  const [deleteWeightId, setDeleteWeightId] = useState<string | null>(null)
  const [weightCalfId, setWeightCalfId] = useState("")
  const [weightValue, setWeightValue] = useState("")
  const [weightDate, setWeightDate] = useState(today)
  const [weightNotes, setWeightNotes] = useState("")
  const [weightErrors, setWeightErrors] = useState<Record<string, string>>({})
  const [chartCalfId, setChartCalfId] = useState("")

  // Expense form
  const [editExpense, setEditExpense] = useState<CalfExpense | null>(null)
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)
  const [expCalfId, setExpCalfId] = useState("")
  const [expenseType, setExpenseType] = useState("milk")
  const [milkLiters, setMilkLiters] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [expDate, setExpDate] = useState(today)
  const [expNotes, setExpNotes] = useState("")
  const [expErrors, setExpErrors] = useState<Record<string, string>>({})
  const [filterExpCalf, setFilterExpCalf] = useState("")
  const [filterExpType, setFilterExpType] = useState("")

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setUser(userData)
      const animalsData = await getAnimals(userData._id.toString())
      setAnimals(animalsData)
      await Promise.all([
        fetchCalves(userData._id.toString()),
        fetchWeights(userData._id.toString()),
        fetchExpenses(userData._id.toString()),
      ])
      setLoading(false)
    }
    init()
  }, [])

  const fetchCalves = async (farmerId: string) => {
    const res = await fetch(`/api/calves?farmerId=${farmerId}`)
    const data = await res.json()
    setCalves(Array.isArray(data) ? data : [])
  }
  const fetchWeights = async (farmerId: string) => {
    const res = await fetch(`/api/calf-weights?farmerId=${farmerId}`)
    const data = await res.json()
    setWeights(Array.isArray(data) ? data : [])
  }
  const fetchExpenses = async (farmerId: string) => {
    const res = await fetch(`/api/calf-expenses?farmerId=${farmerId}`)
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
  }

  const activeCalves = useMemo(() => calves.filter(c => c.status === "active"), [calves])
  const totalMilkGiven = useMemo(() => expenses.filter(e => e.expenseType === "milk").reduce((s, e) => s + (e.milkLiters || 0), 0), [expenses])
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])

  // ---- Calf CRUD ----
  const resetCalfForm = () => {
    setCalfName(""); setMotherAnimalId(""); setGender(""); setBreed(""); setBirthDate(today)
    setBirthWeight(""); setStatus("active"); setCalfNotes(""); setCalfErrors({}); setEditCalf(null)
  }

  const validateCalf = () => {
    const e: Record<string, string> = {}
    if (!calfName.trim()) e.calfName = "Enter a calf name"
    if (!gender) e.gender = "Select gender"
    if (!birthDate) e.birthDate = "Select a birth date"
    setCalfErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCalfSubmit = async () => {
    if (!validateCalf()) return
    setSaving(true)
    const mother = animals.find(a => a._id === motherAnimalId)
    const body = { farmerId: user._id.toString(), name: calfName, motherAnimalId: motherAnimalId || null, motherName: mother?.name || null, gender, breed, birthDate, birthWeight, status, notes: calfNotes }

    if (editCalf) {
      await fetch("/api/calves", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editCalf._id, name: calfName, motherAnimalId: motherAnimalId || null, motherName: mother?.name || null, gender, breed, birthDate, birthWeight, status, notes: calfNotes }) })
    } else {
      await fetch("/api/calves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchCalves(user._id.toString())
    resetCalfForm()
    setSaving(false)
  }

  const handleCalfEdit = (c: Calf) => {
    setEditCalf(c)
    setCalfName(c.name); setMotherAnimalId(c.motherAnimalId || ""); setGender(c.gender)
    setBreed(c.breed || ""); setBirthDate(c.birthDate); setBirthWeight(c.birthWeight ? String(c.birthWeight) : "")
    setStatus(c.status); setCalfNotes(c.notes || "")
  }

  const handleCalfDelete = async (id: string) => {
    await fetch(`/api/calves?id=${id}`, { method: "DELETE" })
    await Promise.all([fetchCalves(user._id.toString()), fetchWeights(user._id.toString()), fetchExpenses(user._id.toString())])
    setDeleteCalfId(null)
  }

  // ---- Weight CRUD ----
  const resetWeightForm = () => {
    setWeightCalfId(""); setWeightValue(""); setWeightDate(today); setWeightNotes(""); setWeightErrors({}); setEditWeight(null)
  }

  const validateWeight = () => {
    const e: Record<string, string> = {}
    if (!weightCalfId) e.weightCalfId = "Select a calf"
    if (!weightValue || Number(weightValue) <= 0) e.weightValue = "Enter a valid weight"
    if (!weightDate) e.weightDate = "Select a date"
    setWeightErrors(e)
    return Object.keys(e).length === 0
  }

  const handleWeightSubmit = async () => {
    if (!validateWeight()) return
    setSaving(true)
    const calf = calves.find(c => c._id === weightCalfId)
    const body = { farmerId: user._id.toString(), calfId: weightCalfId, calfName: calf?.name, weight: weightValue, date: weightDate, notes: weightNotes }

    if (editWeight) {
      await fetch("/api/calf-weights", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editWeight._id, weight: weightValue, date: weightDate, notes: weightNotes }) })
    } else {
      await fetch("/api/calf-weights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchWeights(user._id.toString())
    resetWeightForm()
    setSaving(false)
  }

  const handleWeightEdit = (w: WeightRecord) => {
    setEditWeight(w); setWeightCalfId(w.calfId); setWeightValue(String(w.weight)); setWeightDate(w.date); setWeightNotes(w.notes || "")
  }

  const handleWeightDelete = async (id: string) => {
    await fetch(`/api/calf-weights?id=${id}`, { method: "DELETE" })
    await fetchWeights(user._id.toString())
    setDeleteWeightId(null)
  }

  const chartData = useMemo(() => {
    if (!chartCalfId) return []
    return weights
      .filter(w => w.calfId === chartCalfId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(w => ({ date: w.date.slice(5), weight: w.weight }))
  }, [weights, chartCalfId])

  // ---- Expense CRUD ----
  const resetExpenseForm = () => {
    setExpCalfId(""); setExpenseType("milk"); setMilkLiters(""); setDescription(""); setAmount("")
    setExpDate(today); setExpNotes(""); setExpErrors({}); setEditExpense(null)
  }

  const validateExpense = () => {
    const e: Record<string, string> = {}
    if (!expCalfId) e.expCalfId = "Select a calf"
    if (!amount || Number(amount) <= 0) e.amount = "Enter a valid amount"
    if (!expDate) e.expDate = "Select a date"
    setExpErrors(e)
    return Object.keys(e).length === 0
  }

  const handleExpenseSubmit = async () => {
    if (!validateExpense()) return
    setSaving(true)
    const calf = calves.find(c => c._id === expCalfId)
    const body = { farmerId: user._id.toString(), calfId: expCalfId, calfName: calf?.name, expenseType, milkLiters, description, amount, date: expDate, notes: expNotes }

    if (editExpense) {
      await fetch("/api/calf-expenses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editExpense._id, expenseType, milkLiters, description, amount, date: expDate, notes: expNotes }) })
    } else {
      await fetch("/api/calf-expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchExpenses(user._id.toString())
    resetExpenseForm()
    setSaving(false)
  }

  const handleExpenseEdit = (e: CalfExpense) => {
    setEditExpense(e); setExpCalfId(e.calfId); setExpenseType(e.expenseType)
    setMilkLiters(e.milkLiters ? String(e.milkLiters) : ""); setDescription(e.description || "")
    setAmount(String(e.amount)); setExpDate(e.date); setExpNotes(e.notes || "")
  }

  const handleExpenseDelete = async (id: string) => {
    await fetch(`/api/calf-expenses?id=${id}`, { method: "DELETE" })
    await fetchExpenses(user._id.toString())
    setDeleteExpenseId(null)
  }

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses]
    if (filterExpCalf) filtered = filtered.filter(e => e.calfId === filterExpCalf)
    if (filterExpType) filtered = filtered.filter(e => e.expenseType === filterExpType)
    return filtered
  }, [expenses, filterExpCalf, filterExpType])

  const statusLabel = (s: string) => s === "active" ? t('farmer.active') : s === "weaned" ? t('farmer.weaned') : s === "sold" ? t('farmer.calfSold') : t('farmer.deceased')
  const statusColor = (s: string) => s === "active" ? "bg-green-50 text-green-700 border-green-200" : s === "weaned" ? "bg-blue-50 text-blue-700 border-blue-200" : s === "sold" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-50 text-gray-500 border-gray-200"
  const typeLabel = (ty: string) => ty === "milk" ? t('farmer.milk') : ty === "feed" ? t('farmer.feed') : ty === "veterinary" ? t('farmer.veterinary') : t('farmer.other')
  const typeColor = (ty: string) => ty === "milk" ? "bg-sky-50 text-sky-700 border-sky-200" : ty === "feed" ? "bg-orange-50 text-orange-700 border-orange-200" : ty === "veterinary" ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200"

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
          </div>
        ))}
      </div>
      <div className="h-10 bg-gray-200 rounded w-full max-w-md" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('farmer.calves')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('farmer.calvesDesc')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalCalves')}</p>
              <Baby className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{calves.length}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.activeCalves')}</p>
              <Baby className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-green-600 mt-2">{activeCalves.length}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalMilkGiven')}</p>
              <Milk className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl font-bold text-sky-600 mt-2">{totalMilkGiven.toFixed(1)} L</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalCalfExpenses')}</p>
              <Receipt className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl font-bold text-red-600 mt-2">RWF {totalExpenses.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calves">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="calves" className="flex items-center gap-1"><Baby className="h-4 w-4" /> {t('farmer.tabCalves')}</TabsTrigger>
          <TabsTrigger value="weight" className="flex items-center gap-1"><Scale className="h-4 w-4" /> {t('farmer.tabWeightLog')}</TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-1"><Receipt className="h-4 w-4" /> {t('farmer.tabExpenses')}</TabsTrigger>
        </TabsList>

        {/* CALVES TAB */}
        <TabsContent value="calves" className="space-y-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {editCalf ? t('farmer.editCalf') : t('farmer.newCalf')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.calfName')} *</label>
                  <Input placeholder="e.g. Kalisa" value={calfName} onChange={e => setCalfName(e.target.value)} className={calfErrors.calfName ? "border-red-500" : ""} />
                  {calfErrors.calfName && <p className="text-xs text-red-500">{calfErrors.calfName}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.mother')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Select value={motherAnimalId || "none"} onValueChange={v => setMotherAnimalId(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder={t('farmer.selectMotherOptional')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('common.optional')}</SelectItem>
                      {animals.map(a => <SelectItem key={a._id} value={a._id}>{a.name} ({a.type})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.gender')} *</label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className={calfErrors.gender ? "border-red-500" : ""}><SelectValue placeholder={t('farmer.gender')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('farmer.male')}</SelectItem>
                      <SelectItem value="female">{t('farmer.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {calfErrors.gender && <p className="text-xs text-red-500">{calfErrors.gender}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.breed')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input placeholder="e.g. Friesian" value={breed} onChange={e => setBreed(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.birthDate')} *</label>
                  <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={calfErrors.birthDate ? "border-red-500" : ""} />
                  {calfErrors.birthDate && <p className="text-xs text-red-500">{calfErrors.birthDate}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.birthWeight')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input type="number" min="0" step="0.1" placeholder="e.g. 30" value={birthWeight} onChange={e => setBirthWeight(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.status')}</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.notes')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input placeholder={t('farmer.anyObservations')} value={calfNotes} onChange={e => setCalfNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleCalfSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6">
                  {saving ? t('farmer.savingCalf') : editCalf ? t('farmer.updateCalf') : t('farmer.saveCalf')}
                </Button>
                {editCalf && (
                  <Button variant="outline" onClick={resetCalfForm} className="rounded-lg">{t('farmer.cancel')}</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-sky-500 rounded-full" />
                {t('farmer.tabCalves')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('farmer.name')}</TableHead>
                      <TableHead>{t('farmer.mother')}</TableHead>
                      <TableHead>{t('farmer.gender')}</TableHead>
                      <TableHead>{t('farmer.age')}</TableHead>
                      <TableHead>{t('farmer.status')}</TableHead>
                      <TableHead>{t('farmer.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calves.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">{t('farmer.noCalvesYet')}</TableCell></TableRow>
                    ) : calves.map(c => (
                      <TableRow key={c._id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm text-gray-500">{c.motherName || "—"}</TableCell>
                        <TableCell className="text-sm text-gray-600">{c.gender === "male" ? t('farmer.male') : t('farmer.female')}</TableCell>
                        <TableCell className="text-sm text-gray-600">{formatAge(c.birthDate, t)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor(c.status)}>{statusLabel(c.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleCalfEdit(c)} className="h-8 w-8 p-0 hover:bg-green-50">
                              <Pencil className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteCalfId(c._id)} className="h-8 w-8 p-0 hover:bg-red-50">
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

        {/* WEIGHT LOG TAB */}
        <TabsContent value="weight" className="space-y-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {editWeight ? t('farmer.editWeight') : t('farmer.recordWeight')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {calves.length === 0 ? (
                <p className="text-sm text-gray-400 italic">{t('farmer.noCalvesRegisterFirst')}</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.selectCalf')} *</label>
                      <Select value={weightCalfId} onValueChange={setWeightCalfId} disabled={!!editWeight}>
                        <SelectTrigger className={weightErrors.weightCalfId ? "border-red-500" : ""}><SelectValue placeholder={t('farmer.selectCalf')} /></SelectTrigger>
                        <SelectContent>
                          {calves.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {weightErrors.weightCalfId && <p className="text-xs text-red-500">{weightErrors.weightCalfId}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.weightKg')} *</label>
                      <Input type="number" min="0" step="0.1" placeholder="e.g. 45" value={weightValue} onChange={e => setWeightValue(e.target.value)} className={weightErrors.weightValue ? "border-red-500" : ""} />
                      {weightErrors.weightValue && <p className="text-xs text-red-500">{weightErrors.weightValue}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.date')} *</label>
                      <Input type="date" value={weightDate} onChange={e => setWeightDate(e.target.value)} className={weightErrors.weightDate ? "border-red-500" : ""} />
                      {weightErrors.weightDate && <p className="text-xs text-red-500">{weightErrors.weightDate}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.notes')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                      <Input placeholder={t('farmer.anyObservations')} value={weightNotes} onChange={e => setWeightNotes(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleWeightSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6">
                      {saving ? t('farmer.savingRecord') : editWeight ? t('farmer.updateRecord') : t('farmer.saveRecord')}
                    </Button>
                    {editWeight && (
                      <Button variant="outline" onClick={resetWeightForm} className="rounded-lg">{t('farmer.cancel')}</Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                {t('farmer.growthChart')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={chartCalfId || "none"} onValueChange={v => setChartCalfId(v === "none" ? "" : v)}>
                <SelectTrigger className="max-w-xs"><SelectValue placeholder={t('farmer.selectCalfToViewChart')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('farmer.selectCalfToViewChart')}</SelectItem>
                  {calves.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {chartCalfId && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => [`${v} kg`, "Weight"]} />
                    <Line type="monotone" dataKey="weight" stroke="#7c3aed" strokeWidth={2} dot={{ fill: "#7c3aed" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-400">{t('farmer.noDataAvailable')}</div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-4 w-4 text-sky-500" />
                {t('farmer.weightHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('farmer.date')}</TableHead>
                      <TableHead>{t('farmer.name')}</TableHead>
                      <TableHead>{t('farmer.weightKg')}</TableHead>
                      <TableHead>{t('farmer.notes')}</TableHead>
                      <TableHead>{t('farmer.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weights.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">{t('farmer.noWeightRecordsYet')}</TableCell></TableRow>
                    ) : weights.map(w => (
                      <TableRow key={w._id}>
                        <TableCell className="text-sm">{w.date}</TableCell>
                        <TableCell className="font-medium">{w.calfName}</TableCell>
                        <TableCell className="font-semibold text-purple-700">{w.weight} kg</TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[160px] truncate">{w.notes || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleWeightEdit(w)} className="h-8 w-8 p-0 hover:bg-green-50">
                              <Pencil className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteWeightId(w._id)} className="h-8 w-8 p-0 hover:bg-red-50">
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

        {/* EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {editExpense ? t('farmer.editExpense') : t('farmer.recordExpense')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {calves.length === 0 ? (
                <p className="text-sm text-gray-400 italic">{t('farmer.noCalvesRegisterFirst')}</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.selectCalf')} *</label>
                      <Select value={expCalfId} onValueChange={setExpCalfId} disabled={!!editExpense}>
                        <SelectTrigger className={expErrors.expCalfId ? "border-red-500" : ""}><SelectValue placeholder={t('farmer.selectCalf')} /></SelectTrigger>
                        <SelectContent>
                          {calves.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {expErrors.expCalfId && <p className="text-xs text-red-500">{expErrors.expCalfId}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.expenseType')} *</label>
                      <Select value={expenseType} onValueChange={setExpenseType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXPENSE_TYPES.map(ty => <SelectItem key={ty} value={ty}>{typeLabel(ty)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {expenseType === "milk" && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">{t('farmer.milkLitersGiven')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                        <Input type="number" min="0" step="0.1" placeholder="e.g. 3" value={milkLiters} onChange={e => setMilkLiters(e.target.value)} />
                      </div>
                    )}

                    {expenseType !== "milk" && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">{t('farmer.expenseDescription')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                        <Input placeholder="e.g. Deworming injection" value={description} onChange={e => setDescription(e.target.value)} />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.amount')} *</label>
                      <Input type="number" min="0" placeholder="e.g. 1500" value={amount} onChange={e => setAmount(e.target.value)} className={expErrors.amount ? "border-red-500" : ""} />
                      {expErrors.amount && <p className="text-xs text-red-500">{expErrors.amount}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.date')} *</label>
                      <Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} className={expErrors.expDate ? "border-red-500" : ""} />
                      {expErrors.expDate && <p className="text-xs text-red-500">{expErrors.expDate}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.notes')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                      <Input placeholder={t('farmer.anyObservations')} value={expNotes} onChange={e => setExpNotes(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleExpenseSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6">
                      {saving ? t('farmer.savingRecord') : editExpense ? t('farmer.updateRecord') : t('farmer.saveRecord')}
                    </Button>
                    {editExpense && (
                      <Button variant="outline" onClick={resetExpenseForm} className="rounded-lg">{t('farmer.cancel')}</Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-4 w-4 text-sky-500" />
                {t('farmer.tabExpenses')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                <Select value={filterExpCalf || "all"} onValueChange={v => setFilterExpCalf(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t('farmer.allCalves')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('farmer.allCalves')}</SelectItem>
                    {calves.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterExpType || "all"} onValueChange={v => setFilterExpType(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t('farmer.allTypes')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('farmer.allTypes')}</SelectItem>
                    {EXPENSE_TYPES.map(ty => <SelectItem key={ty} value={ty}>{typeLabel(ty)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-500">{filteredExpenses.length}</p>
                  <Button variant="outline" onClick={() => { setFilterExpCalf(""); setFilterExpType("") }} className="rounded-lg ml-auto">{t('farmer.clearFilters')}</Button>
                </div>
              </div>

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
                    {filteredExpenses.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">{t('farmer.noCalfExpensesYet')}</TableCell></TableRow>
                    ) : filteredExpenses.map(e => (
                      <TableRow key={e._id}>
                        <TableCell className="text-sm">{e.date}</TableCell>
                        <TableCell className="font-medium">{e.calfName}</TableCell>
                        <TableCell><Badge variant="outline" className={typeColor(e.expenseType)}>{typeLabel(e.expenseType)}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-500">{e.expenseType === "milk" ? (e.milkLiters ? `${e.milkLiters} L` : "—") : (e.description || "—")}</TableCell>
                        <TableCell className="font-semibold text-red-700">RWF {e.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleExpenseEdit(e)} className="h-8 w-8 p-0 hover:bg-green-50">
                              <Pencil className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteExpenseId(e._id)} className="h-8 w-8 p-0 hover:bg-red-50">
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

      {/* Delete dialogs */}
      <AlertDialog open={!!deleteCalfId} onOpenChange={open => !open && setDeleteCalfId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.deleteCalf')}</AlertDialogTitle>
            <AlertDialogDescription>{t('farmer.deleteCalfConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('farmer.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCalfId && handleCalfDelete(deleteCalfId)} className="bg-red-600 hover:bg-red-700 text-white">{t('farmer.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteWeightId} onOpenChange={open => !open && setDeleteWeightId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.deleteWeightRecord')}</AlertDialogTitle>
            <AlertDialogDescription>{t('farmer.deleteWeightRecordConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('farmer.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteWeightId && handleWeightDelete(deleteWeightId)} className="bg-red-600 hover:bg-red-700 text-white">{t('farmer.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteExpenseId} onOpenChange={open => !open && setDeleteExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.deleteExpense')}</AlertDialogTitle>
            <AlertDialogDescription>{t('farmer.deleteExpenseConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('farmer.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteExpenseId && handleExpenseDelete(deleteExpenseId)} className="bg-red-600 hover:bg-red-700 text-white">{t('farmer.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
