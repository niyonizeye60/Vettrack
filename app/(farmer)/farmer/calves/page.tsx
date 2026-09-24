"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { getAnimals } from "@/lib/actions"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Baby, Plus, Pencil, Trash2, History, Scale, Milk, Receipt, TrendingUp, ArrowUpCircle, CheckCircle2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface Animal { _id: string; name: string; type: string; status?: string }
interface Calf {
  _id: string; farmerId: string; name: string; motherAnimalId: string | null; motherName: string | null
  gender: "male" | "female"; breed: string | null; birthDate: string; birthWeight: number | null
  status: "active" | "weaned" | "sold" | "deceased" | "graduated"; notes: string | null
  /** Set once the calf has been promoted into the animals herd. */
  graduatedToAnimalId?: string | null
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
const PAGE_SIZE = 10

interface Pagination { page: number; pageSize: number; total: number; totalPages: number }
const emptyPagination: Pagination = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 }

function PaginationFooter({ pagination, page, setPage, loading, className }: { pagination: Pagination; page: number; setPage: (updater: (p: number) => number) => void; loading: boolean; className?: string }) {
  if (pagination.totalPages <= 1) return null
  return (
    <div className={cn("flex items-center justify-between flex-wrap gap-3 px-6 py-4 border-t border-gray-100", className)}>
      <p className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-medium">{(pagination.page - 1) * pagination.pageSize + 1}</span>
        {" - "}
        <span className="font-medium">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span>
        {" "}of{" "}
        <span className="font-medium">{pagination.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
          const startPage = Math.max(1, page - 2)
          const p = startPage + i
          if (p > pagination.totalPages) return null
          return (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(() => p)} disabled={loading} className="min-w-[36px]">
              {p}
            </Button>
          )
        })}
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages || loading}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function formatAge(birthDate: string, t: (k: string) => string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000))
  if (days < 60) return `${days} ${t('farmer.days')}`
  return `${Math.floor(days / 30)} ${t('farmer.months')}`
}

function animalStatusText(status: string | undefined, t: (k: string) => string) {
  if (status === "Sick") return t('farmer.sick')
  if (status === "Under Treatment") return t('farmer.underTreatment')
  if (status === "Deceased") return t('farmer.deceased')
  return t('farmer.healthy')
}

export default function CalvesPage() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [animals, setAnimals] = useState<Animal[]>([])
  // Full, unpaginated lists - kept for summary cards, dropdown options and the
  // growth chart, which all need the entire dataset regardless of table page.
  const [calves, setCalves] = useState<Calf[]>([])
  const [weights, setWeights] = useState<WeightRecord[]>([])
  const [expenses, setExpenses] = useState<CalfExpense[]>([])
  const [homeConsumptionBalance, setHomeConsumptionBalance] = useState(0)

  // Backend-paginated data shown in each tab's table (10 per page)
  const [calvesPage, setCalvesPage] = useState(1)
  const [calvesTableRows, setCalvesTableRows] = useState<Calf[]>([])
  const [calvesPagination, setCalvesPagination] = useState<Pagination>(emptyPagination)
  const [calvesTableLoading, setCalvesTableLoading] = useState(false)
  const [debouncedCalfSearch, setDebouncedCalfSearch] = useState("")
  const isCalvesFirstRun = useRef(true)

  const [weightPage, setWeightPage] = useState(1)
  const [weightsTableRows, setWeightsTableRows] = useState<WeightRecord[]>([])
  const [weightsPagination, setWeightsPagination] = useState<Pagination>(emptyPagination)
  const [weightsTableLoading, setWeightsTableLoading] = useState(false)
  const isWeightsFirstRun = useRef(true)

  const [expensePage, setExpensePage] = useState(1)
  const [expensesTableRows, setExpensesTableRows] = useState<CalfExpense[]>([])
  const [expensesPagination, setExpensesPagination] = useState<Pagination>(emptyPagination)
  const [expensesTableLoading, setExpensesTableLoading] = useState(false)
  const isExpensesFirstRun = useRef(true)

  // Calf form
  const [editCalf, setEditCalf] = useState<Calf | null>(null)
  const [deleteCalfId, setDeleteCalfId] = useState<string | null>(null)
  const [calfFormUnlocked, setCalfFormUnlocked] = useState(false)
  const [calfSearchTerm, setCalfSearchTerm] = useState("")

  // Graduate-to-animals flow
  const [graduateCalf, setGraduateCalf] = useState<Calf | null>(null)
  const [graduating, setGraduating] = useState(false)
  const [gradError, setGradError] = useState("")
  const [gradResult, setGradResult] = useState<{ name: string; moved: number } | null>(null)
  const [gradType, setGradType] = useState("cow")
  const [gradClass, setGradClass] = useState("dairy")
  const [gradBreed, setGradBreed] = useState("")
  const [gradEarTag, setGradEarTag] = useState("")
  const [gradInsurance, setGradInsurance] = useState("")
  const [gradWeight, setGradWeight] = useState("")
  const [gradPrice, setGradPrice] = useState("")
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
      const farmerId = userData._id.toString()
      const animalsData = await getAnimals(farmerId)
      setAnimals(animalsData)
      await Promise.all([
        fetchCalves(farmerId),
        fetchWeights(farmerId),
        fetchExpenses(farmerId),
        fetchHomeConsumptionBalance(farmerId),
        fetchCalvesPage(farmerId, 1, ""),
        fetchWeightsPage(farmerId, 1),
        fetchExpensesPage(farmerId, 1, "", ""),
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
  const fetchHomeConsumptionBalance = async (farmerId: string) => {
    const res = await fetch(`/api/milk/home-consumption?farmerId=${farmerId}`)
    const data = await res.json()
    setHomeConsumptionBalance(typeof data?.balance === "number" ? data.balance : 0)
  }

  const fetchCalvesPage = async (farmerId: string, page: number, search: string) => {
    setCalvesTableLoading(true)
    try {
      const params = new URLSearchParams({ farmerId, page: String(page), limit: String(PAGE_SIZE) })
      if (search) params.set("search", search)
      const res = await fetch(`/api/calves?${params.toString()}`)
      const data = await res.json()
      const pagination: Pagination = data?.pagination || emptyPagination
      if (pagination.total > 0 && page > pagination.totalPages) {
        await fetchCalvesPage(farmerId, pagination.totalPages, search)
        return
      }
      setCalvesTableRows(Array.isArray(data?.calves) ? data.calves : [])
      setCalvesPagination(pagination)
    } finally {
      setCalvesTableLoading(false)
    }
  }

  const fetchWeightsPage = async (farmerId: string, page: number) => {
    setWeightsTableLoading(true)
    try {
      const params = new URLSearchParams({ farmerId, page: String(page), limit: String(PAGE_SIZE) })
      const res = await fetch(`/api/calf-weights?${params.toString()}`)
      const data = await res.json()
      const pagination: Pagination = data?.pagination || emptyPagination
      if (pagination.total > 0 && page > pagination.totalPages) {
        await fetchWeightsPage(farmerId, pagination.totalPages)
        return
      }
      setWeightsTableRows(Array.isArray(data?.weights) ? data.weights : [])
      setWeightsPagination(pagination)
    } finally {
      setWeightsTableLoading(false)
    }
  }

  const fetchExpensesPage = async (farmerId: string, page: number, calfId: string, expType: string) => {
    setExpensesTableLoading(true)
    try {
      const params = new URLSearchParams({ farmerId, page: String(page), limit: String(PAGE_SIZE) })
      if (calfId) params.set("calfId", calfId)
      if (expType) params.set("expenseType", expType)
      const res = await fetch(`/api/calf-expenses?${params.toString()}`)
      const data = await res.json()
      const pagination: Pagination = data?.pagination || emptyPagination
      if (pagination.total > 0 && page > pagination.totalPages) {
        await fetchExpensesPage(farmerId, pagination.totalPages, calfId, expType)
        return
      }
      setExpensesTableRows(Array.isArray(data?.expenses) ? data.expenses : [])
      setExpensesPagination(pagination)
    } finally {
      setExpensesTableLoading(false)
    }
  }

  // Debounce the calf search box (matches the pattern used on /farmer/animals)
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedCalfSearch(calfSearchTerm.trim()), 300)
    return () => clearTimeout(handle)
  }, [calfSearchTerm])

  useEffect(() => {
    if (isCalvesFirstRun.current || !user) return
    setCalvesPage(1)
  }, [debouncedCalfSearch])

  useEffect(() => {
    if (!user) return
    if (isCalvesFirstRun.current) { isCalvesFirstRun.current = false; return }
    fetchCalvesPage(user._id.toString(), calvesPage, debouncedCalfSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calvesPage, debouncedCalfSearch])

  useEffect(() => {
    if (!user) return
    if (isWeightsFirstRun.current) { isWeightsFirstRun.current = false; return }
    fetchWeightsPage(user._id.toString(), weightPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightPage])

  useEffect(() => {
    if (isExpensesFirstRun.current || !user) return
    setExpensePage(1)
  }, [filterExpCalf, filterExpType])

  useEffect(() => {
    if (!user) return
    if (isExpensesFirstRun.current) { isExpensesFirstRun.current = false; return }
    fetchExpensesPage(user._id.toString(), expensePage, filterExpCalf, filterExpType)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expensePage, filterExpCalf, filterExpType])

  const activeCalves = useMemo(() => calves.filter(c => c.status === "active"), [calves])
  const totalMilkGiven = useMemo(() => expenses.filter(e => e.expenseType === "milk").reduce((s, e) => s + (e.milkLiters || 0), 0), [expenses])
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])

  // ---- Calf CRUD ----
  const resetCalfForm = () => {
    setCalfName(""); setMotherAnimalId(""); setGender(""); setBreed(""); setBirthDate(today)
    setBirthWeight(""); setStatus("active"); setCalfNotes(""); setCalfErrors({}); setEditCalf(null)
    setCalfFormUnlocked(false)
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
    const farmerId = user._id.toString()
    const wasAdd = !editCalf
    const body = { farmerId, name: calfName, motherAnimalId: motherAnimalId || null, motherName: mother?.name || null, gender, breed, birthDate, birthWeight, status, notes: calfNotes }

    if (editCalf) {
      await fetch("/api/calves", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editCalf._id, name: calfName, motherAnimalId: motherAnimalId || null, motherName: mother?.name || null, gender, breed, birthDate, birthWeight, status, notes: calfNotes }) })
    } else {
      await fetch("/api/calves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchCalves(farmerId)
    if (wasAdd && calvesPage !== 1) setCalvesPage(1)
    else await fetchCalvesPage(farmerId, calvesPage, debouncedCalfSearch)
    resetCalfForm()
    setSaving(false)
  }

  const handleCalfEdit = (c: Calf) => {
    setEditCalf(c)
    setCalfName(c.name); setMotherAnimalId(c.motherAnimalId || ""); setGender(c.gender)
    setBreed(c.breed || ""); setBirthDate(c.birthDate); setBirthWeight(c.birthWeight ? String(c.birthWeight) : "")
    setStatus(c.status); setCalfNotes(c.notes || "")
    setCalfFormUnlocked(true)
  }

  const handleCalfDelete = async (id: string) => {
    const farmerId = user._id.toString()
    await fetch(`/api/calves?id=${id}`, { method: "DELETE" })
    // Deleting a calf cascades to its weight and expense records server-side, so
    // both of those tables need refreshing too, not just the calves table.
    await Promise.all([
      fetchCalves(farmerId), fetchWeights(farmerId), fetchExpenses(farmerId), fetchHomeConsumptionBalance(farmerId),
      fetchCalvesPage(farmerId, calvesPage, debouncedCalfSearch),
      fetchWeightsPage(farmerId, weightPage),
      fetchExpensesPage(farmerId, expensePage, filterExpCalf, filterExpType),
    ])
    setDeleteCalfId(null)
  }

  // ---- Graduate a calf into the animals herd ----
  const openGraduate = (c: Calf) => {
    setGraduateCalf(c)
    setGradType("cow")
    setGradClass("dairy")
    setGradBreed(c.breed || "")
    setGradEarTag(""); setGradInsurance(""); setGradWeight(""); setGradPrice("")
    setGradError("")
  }

  const handleGraduate = async () => {
    if (!graduateCalf) return
    setGraduating(true)
    setGradError("")
    try {
      const res = await fetch("/api/calves/graduate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: user._id.toString(),
          calfId: graduateCalf._id,
          type: gradType,
          animalClass: gradClass,
          breed: gradBreed,
          earTagId: gradEarTag,
          insuranceId: gradInsurance,
          weight: gradWeight,
          price: gradPrice,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGradError(data?.error || "Failed to move calf to animals")
        return
      }
      setGradResult({ name: graduateCalf.name, moved: data.vaccinationRecordsMoved || 0 })
      setGraduateCalf(null)
      const farmerId = user._id.toString()
      await Promise.all([fetchCalves(farmerId), fetchCalvesPage(farmerId, calvesPage, debouncedCalfSearch)])
    } catch {
      setGradError("Failed to move calf to animals")
    } finally {
      setGraduating(false)
    }
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
    const farmerId = user._id.toString()
    const wasAdd = !editWeight
    const body = { farmerId, calfId: weightCalfId, calfName: calf?.name, weight: weightValue, date: weightDate, notes: weightNotes }

    if (editWeight) {
      await fetch("/api/calf-weights", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editWeight._id, weight: weightValue, date: weightDate, notes: weightNotes }) })
    } else {
      await fetch("/api/calf-weights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchWeights(farmerId)
    if (wasAdd && weightPage !== 1) setWeightPage(1)
    else await fetchWeightsPage(farmerId, weightPage)
    resetWeightForm()
    setSaving(false)
  }

  const handleWeightEdit = (w: WeightRecord) => {
    setEditWeight(w); setWeightCalfId(w.calfId); setWeightValue(String(w.weight)); setWeightDate(w.date); setWeightNotes(w.notes || "")
  }

  const handleWeightDelete = async (id: string) => {
    const farmerId = user._id.toString()
    await fetch(`/api/calf-weights?id=${id}`, { method: "DELETE" })
    await Promise.all([fetchWeights(farmerId), fetchWeightsPage(farmerId, weightPage)])
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

  // When editing an existing milk entry, its own liters are already subtracted out of
  // homeConsumptionBalance - add them back so the farmer can keep the same value.
  const availableHomeConsumptionForForm = homeConsumptionBalance + (editExpense?.expenseType === "milk" ? (editExpense.milkLiters || 0) : 0)

  const validateExpense = () => {
    const e: Record<string, string> = {}
    if (!expCalfId) e.expCalfId = "Select a calf"
    if (!amount || Number(amount) <= 0) e.amount = "Enter a valid amount"
    if (!expDate) e.expDate = "Select a date"
    if (expenseType === "milk") {
      if (!milkLiters || Number(milkLiters) <= 0) e.milkLiters = "Enter how many liters the calf consumed"
      else if (Number(milkLiters) > availableHomeConsumptionForForm) e.milkLiters = `Only ${availableHomeConsumptionForForm.toFixed(1)}L of home consumption milk is available`
    }
    setExpErrors(e)
    return Object.keys(e).length === 0
  }

  const handleExpenseSubmit = async () => {
    if (!validateExpense()) return
    setSaving(true)
    const calf = calves.find(c => c._id === expCalfId)
    const farmerId = user._id.toString()
    const wasAdd = !editExpense
    const body = { farmerId, calfId: expCalfId, calfName: calf?.name, expenseType, milkLiters, description, amount, date: expDate, notes: expNotes }

    const res = editExpense
      ? await fetch("/api/calf-expenses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editExpense._id, expenseType, milkLiters, description, amount, date: expDate, notes: expNotes }) })
      : await fetch("/api/calf-expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to save expense" }))
      setExpErrors({ [expenseType === "milk" ? "milkLiters" : "amount"]: error })
      setSaving(false)
      return
    }

    await Promise.all([fetchExpenses(farmerId), fetchHomeConsumptionBalance(farmerId)])
    if (wasAdd && expensePage !== 1) setExpensePage(1)
    else await fetchExpensesPage(farmerId, expensePage, filterExpCalf, filterExpType)
    resetExpenseForm()
    setSaving(false)
  }

  const handleExpenseEdit = (e: CalfExpense) => {
    setEditExpense(e); setExpCalfId(e.calfId); setExpenseType(e.expenseType)
    setMilkLiters(e.milkLiters ? String(e.milkLiters) : ""); setDescription(e.description || "")
    setAmount(String(e.amount)); setExpDate(e.date); setExpNotes(e.notes || "")
    setExpErrors({})
  }

  const handleExpenseDelete = async (id: string) => {
    const farmerId = user._id.toString()
    await fetch(`/api/calf-expenses?id=${id}`, { method: "DELETE" })
    await Promise.all([fetchExpenses(farmerId), fetchHomeConsumptionBalance(farmerId), fetchExpensesPage(farmerId, expensePage, filterExpCalf, filterExpType)])
    setDeleteExpenseId(null)
  }

  const statusLabel = (s: string) => s === "active" ? t('farmer.active') : s === "weaned" ? t('farmer.weaned') : s === "sold" ? t('farmer.calfSold') : s === "graduated" ? t('farmer.graduated') : t('farmer.deceased')
  const statusColor = (s: string) => s === "active" ? "bg-green-50 text-green-700 border-green-200" : s === "weaned" ? "bg-blue-50 text-blue-700 border-blue-200" : s === "sold" ? "bg-amber-50 text-amber-700 border-amber-200" : s === "graduated" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-gray-50 text-gray-500 border-gray-200"
  const typeLabel = (ty: string) => ty === "milk" ? t('farmer.milk') : ty === "feed" ? t('farmer.feed') : ty === "veterinary" ? t('farmer.veterinary') : t('farmer.other')
  const typeColor = (ty: string) => ty === "milk" ? "bg-sky-50 text-sky-700 border-sky-200" : ty === "feed" ? "bg-orange-50 text-orange-700 border-orange-200" : ty === "veterinary" ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200"

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 bg-gray-200 rounded w-40" />
        <div className="h-4 bg-gray-200 rounded w-64 mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5].map(i => (
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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
              <p className="text-sm text-gray-500 font-medium">{t('farmer.homeConsumptionMilk')}</p>
              <Milk className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl font-bold text-orange-600 mt-2">{homeConsumptionBalance.toFixed(1)} L</h3>
            <p className="text-xs text-gray-400 mt-1">{t('farmer.availableForCalves')}</p>
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
          <div className="flex items-center justify-end">
            <Button onClick={() => setCalfFormUnlocked(true)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg">
              <Plus className="h-4 w-4 mr-1" />{t('farmer.registerCalf')}
            </Button>
          </div>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Baby className="h-5 w-5 text-green-600" />
                  {t('farmer.tabCalves')}
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('farmer.searchAnimals') || "Search calves…"}
                    className="pl-9 bg-white h-9"
                    value={calfSearchTerm}
                    onChange={(e) => setCalfSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {calves.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Baby className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">{t('farmer.noCalvesYet')}</p>
                  <p className="mt-3">
                    <Button variant="outline" size="sm" onClick={() => setCalfFormUnlocked(true)}>
                      {t('farmer.registerCalf')}
                    </Button>
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="font-semibold text-gray-600">{t('farmer.name')}</TableHead>
                        <TableHead className="font-semibold text-gray-600">{t('farmer.mother')}</TableHead>
                        <TableHead className="font-semibold text-gray-600">{t('farmer.gender')}</TableHead>
                        <TableHead className="font-semibold text-gray-600">{t('farmer.age')}</TableHead>
                        <TableHead className="font-semibold text-gray-600">{t('farmer.status')}</TableHead>
                        <TableHead className="font-semibold text-gray-600">{t('farmer.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calvesTableLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-gray-400">{t('common.loading')}</TableCell>
                        </TableRow>
                      ) : calvesTableRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                              <Baby className="h-5 w-5 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-sm font-medium">{t('farmer.noResultsFound') || "No calves match your search"}</p>
                          </TableCell>
                        </TableRow>
                      ) : calvesTableRows.map(c => (
                        <TableRow key={c._id} className="hover:bg-gray-50/80 transition-colors duration-150">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="bg-green-100 p-1.5 rounded-lg flex-shrink-0">
                                <Baby className="h-3.5 w-3.5 text-green-600" />
                              </div>
                              <span className="font-medium text-gray-800 text-sm">{c.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{c.motherName || <span className="text-gray-400">—</span>}</TableCell>
                          <TableCell className="text-sm text-gray-600">{c.gender === "male" ? t('farmer.male') : t('farmer.female')}</TableCell>
                          <TableCell className="text-sm text-gray-600">{formatAge(c.birthDate, t)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColor(c.status)}>{statusLabel(c.status)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 flex-nowrap">
                              {/* Only a calf still on the farm can grow into an animal. */}
                              {(c.status === "active" || c.status === "weaned") && !c.graduatedToAnimalId && (
                                <Button
                                  size="sm" variant="ghost"
                                  onClick={() => openGraduate(c)}
                                  className="h-8 w-8 p-0 hover:bg-purple-50 shrink-0"
                                  title={t('farmer.graduateToAnimals')}
                                >
                                  <ArrowUpCircle className="h-3.5 w-3.5 text-purple-600" />
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleCalfEdit(c)}>
                                <Pencil className="h-3.5 w-3.5 mr-1" />{t('farmer.edit')}
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => setDeleteCalfId(c._id)}
                                className="h-8 w-8 p-0 hover:bg-red-50 shrink-0"
                                title={t('farmer.delete')}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <PaginationFooter pagination={calvesPagination} page={calvesPage} setPage={setCalvesPage} loading={calvesTableLoading} />
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
                    {weightsTableLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">{t('common.loading')}</TableCell></TableRow>
                    ) : weightsTableRows.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">{t('farmer.noWeightRecordsYet')}</TableCell></TableRow>
                    ) : weightsTableRows.map(w => (
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
              <PaginationFooter pagination={weightsPagination} page={weightPage} setPage={setWeightPage} loading={weightsTableLoading} className="px-0 pb-0" />
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
                        <label className="text-sm font-medium text-gray-700">{t('farmer.milkLitersGiven')} *</label>
                        <Input type="number" min="0" step="0.1" max={availableHomeConsumptionForForm} placeholder="e.g. 3" value={milkLiters} onChange={e => setMilkLiters(e.target.value)} className={expErrors.milkLiters ? "border-red-500" : ""} />
                        {expErrors.milkLiters ? (
                          <p className="text-xs text-red-500">{expErrors.milkLiters}</p>
                        ) : (
                          <p className="text-xs text-gray-400">{t('farmer.homeConsumptionAvailable')}: {availableHomeConsumptionForForm.toFixed(1)}L</p>
                        )}
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
                  <p className="text-sm text-gray-500">{expensesPagination.total}</p>
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
                    {expensesTableLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">{t('common.loading')}</TableCell></TableRow>
                    ) : expensesTableRows.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">{t('farmer.noCalfExpensesYet')}</TableCell></TableRow>
                    ) : expensesTableRows.map(e => (
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
              <PaginationFooter pagination={expensesPagination} page={expensePage} setPage={setExpensePage} loading={expensesTableLoading} className="px-0 pb-0" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New / Edit Calf */}
      <Dialog open={calfFormUnlocked} onOpenChange={open => !open && resetCalfForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-green-600" />
              {editCalf ? t('farmer.editCalf') : t('farmer.newCalf')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
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
                    {animals.map(a => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name} ({a.type})
                        <span className={a.status === "Deceased" ? "text-red-500" : "text-gray-400"}> — {animalStatusText(a.status, t)}</span>
                      </SelectItem>
                    ))}
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
              <Button variant="outline" onClick={resetCalfForm} className="rounded-lg">{t('farmer.cancel')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialogs */}
      {/* Graduate to animals */}
      <Dialog open={!!graduateCalf} onOpenChange={open => { if (!open) { setGraduateCalf(null); setGradError("") } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-purple-600" />
              {t('farmer.graduateToAnimals')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-sm text-purple-900">
              <p>
                <strong>{graduateCalf?.name}</strong> {t('farmer.graduateExplain')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.animalType')} *</label>
                <Select value={gradType} onValueChange={setGradType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cow">{t('farmer.cow')}</SelectItem>
                    <SelectItem value="goat">{t('farmer.goat')}</SelectItem>
                    <SelectItem value="sheep">{t('farmer.sheep')}</SelectItem>
                    <SelectItem value="other">{t('farmer.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.class')}</label>
                <Select value={gradClass} onValueChange={setGradClass}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dairy">{t('farmer.diary')}</SelectItem>
                    <SelectItem value="meat">{t('farmer.meat')}</SelectItem>
                    <SelectItem value="other">{t('farmer.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.breed')}</label>
                <Input value={gradBreed} onChange={e => setGradBreed(e.target.value)} placeholder="e.g. Friesian" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.earTagId')}</label>
                <Input value={gradEarTag} onChange={e => setGradEarTag(e.target.value)} placeholder="e.g. RW-00125" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.insuranceId')}</label>
                <Input value={gradInsurance} onChange={e => setGradInsurance(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.weight')} (kg)</label>
                <Input type="number" min="0" step="0.1" value={gradWeight} onChange={e => setGradWeight(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">{t('farmer.estimatedValue')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                <Input type="number" min="0" value={gradPrice} onChange={e => setGradPrice(e.target.value)} placeholder="RWF" />
              </div>
            </div>

            <p className="text-xs text-gray-500">{t('farmer.graduateKeepsRearing')}</p>
            {gradError && <p className="text-sm text-red-600">{gradError}</p>}

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setGraduateCalf(null)} className="rounded-lg">{t('farmer.cancel')}</Button>
              <Button onClick={handleGraduate} disabled={graduating} className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white">
                {graduating ? t('farmer.savingRecord') : t('farmer.moveToAnimals')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Graduation result */}
      <AlertDialog open={!!gradResult} onOpenChange={open => !open && setGradResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {t('farmer.graduateDone')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{gradResult?.name}</strong> {t('farmer.graduateDoneDesc')}
              {gradResult && gradResult.moved > 0
                ? ` ${gradResult.moved} ${t('farmer.graduateRecordsMoved')}`
                : ` ${t('farmer.graduateNoRecords')}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setGradResult(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
