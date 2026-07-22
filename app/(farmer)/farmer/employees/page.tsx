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
import { Users2, Wallet, Plus, Pencil, Trash2, History, Banknote, CircleDollarSign } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface Employee {
  _id: string
  farmerId: string
  name: string
  position: string
  phone: string | null
  nationalId: string | null
  hireDate: string | null
  wageType: "monthly" | "daily" | "hourly"
  wageAmount: number
  status: "active" | "inactive"
  notes: string | null
}

interface PaymentRecord {
  _id: string
  farmerId: string
  employeeId: string
  employeeName: string
  amount: number
  paymentDate: string
  period: string | null
  method: "cash" | "mobile_money" | "bank_transfer"
  notes: string | null
}

const WAGE_TYPES = ["monthly", "daily", "hourly"] as const
const PAYMENT_METHODS = ["cash", "mobile_money", "bank_transfer"] as const
const today = new Date().toISOString().split("T")[0]

export default function EmployeesPage() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])

  // Employee form state
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [position, setPosition] = useState("")
  const [phone, setPhone] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [hireDate, setHireDate] = useState("")
  const [wageType, setWageType] = useState<string>("")
  const [wageAmount, setWageAmount] = useState("")
  const [status, setStatus] = useState("active")
  const [empNotes, setEmpNotes] = useState("")
  const [empErrors, setEmpErrors] = useState<Record<string, string>>({})

  // Payment form state
  const [editPayment, setEditPayment] = useState<PaymentRecord | null>(null)
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null)
  const [payEmployeeId, setPayEmployeeId] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(today)
  const [period, setPeriod] = useState("")
  const [method, setMethod] = useState<string>("")
  const [payNotes, setPayNotes] = useState("")
  const [payErrors, setPayErrors] = useState<Record<string, string>>({})

  // Payment filters
  const [filterEmployee, setFilterEmployee] = useState("")
  const [filterMonth, setFilterMonth] = useState("")

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setUser(userData)
      await Promise.all([fetchEmployees(userData._id.toString()), fetchPayments(userData._id.toString())])
      setLoading(false)
    }
    init()
  }, [])

  const fetchEmployees = async (farmerId: string) => {
    const res = await fetch(`/api/employees?farmerId=${farmerId}`)
    const data = await res.json()
    setEmployees(Array.isArray(data) ? data : [])
  }

  const fetchPayments = async (farmerId: string) => {
    const res = await fetch(`/api/employee-payments?farmerId=${farmerId}`)
    const data = await res.json()
    setPayments(Array.isArray(data) ? data : [])
  }

  const activeEmployees = useMemo(() => employees.filter(e => e.status === "active"), [employees])
  const monthlyWageBill = useMemo(
    () => activeEmployees.filter(e => e.wageType === "monthly").reduce((s, e) => s + e.wageAmount, 0),
    [activeEmployees]
  )
  const paidThisMonth = useMemo(
    () => payments.filter(p => p.paymentDate.startsWith(today.slice(0, 7))).reduce((s, p) => s + p.amount, 0),
    [payments]
  )

  const filteredPayments = useMemo(() => {
    let filtered = [...payments]
    if (filterEmployee) filtered = filtered.filter(p => p.employeeId === filterEmployee)
    if (filterMonth) filtered = filtered.filter(p => p.paymentDate.startsWith(filterMonth))
    return filtered
  }, [payments, filterEmployee, filterMonth])

  const clearPaymentFilters = () => { setFilterEmployee(""); setFilterMonth("") }

  // ---- Employee CRUD ----
  const resetEmployeeForm = () => {
    setName(""); setPosition(""); setPhone(""); setNationalId(""); setHireDate("")
    setWageType(""); setWageAmount(""); setStatus("active"); setEmpNotes("")
    setEmpErrors({}); setEditEmployee(null)
  }

  const validateEmployee = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "Enter employee name"
    if (!position.trim()) e.position = "Enter a position"
    if (!wageType) e.wageType = "Select wage type"
    if (!wageAmount || Number(wageAmount) <= 0) e.wageAmount = "Enter a valid wage amount"
    setEmpErrors(e)
    return Object.keys(e).length === 0
  }

  const handleEmployeeSubmit = async () => {
    if (!validateEmployee()) return
    setSaving(true)
    const body = { farmerId: user._id.toString(), name, position, phone, nationalId, hireDate, wageType, wageAmount, status, notes: empNotes }

    if (editEmployee) {
      await fetch("/api/employees", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editEmployee._id, name, position, phone, nationalId, hireDate, wageType, wageAmount, status, notes: empNotes }) })
    } else {
      await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchEmployees(user._id.toString())
    resetEmployeeForm()
    setSaving(false)
  }

  const handleEmployeeEdit = (e: Employee) => {
    setEditEmployee(e)
    setName(e.name); setPosition(e.position); setPhone(e.phone || ""); setNationalId(e.nationalId || "")
    setHireDate(e.hireDate || ""); setWageType(e.wageType); setWageAmount(String(e.wageAmount))
    setStatus(e.status); setEmpNotes(e.notes || "")
  }

  const handleEmployeeDelete = async (id: string) => {
    await fetch(`/api/employees?id=${id}`, { method: "DELETE" })
    await Promise.all([fetchEmployees(user._id.toString()), fetchPayments(user._id.toString())])
    setDeleteEmployeeId(null)
  }

  // ---- Payment CRUD ----
  const resetPaymentForm = () => {
    setPayEmployeeId(""); setAmount(""); setPaymentDate(today); setPeriod(""); setMethod(""); setPayNotes("")
    setPayErrors({}); setEditPayment(null)
  }

  const validatePayment = () => {
    const e: Record<string, string> = {}
    if (!payEmployeeId) e.payEmployeeId = "Select an employee"
    if (!amount || Number(amount) <= 0) e.amount = "Enter a valid amount"
    if (!paymentDate) e.paymentDate = "Select a date"
    if (!method) e.method = "Select a payment method"
    setPayErrors(e)
    return Object.keys(e).length === 0
  }

  const handlePaymentSubmit = async () => {
    if (!validatePayment()) return
    setSaving(true)
    const employee = employees.find(e => e._id === payEmployeeId)
    const body = { farmerId: user._id.toString(), employeeId: payEmployeeId, employeeName: employee?.name, amount, paymentDate, period, method, notes: payNotes }

    if (editPayment) {
      await fetch("/api/employee-payments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editPayment._id, amount, paymentDate, period, method, notes: payNotes }) })
    } else {
      await fetch("/api/employee-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchPayments(user._id.toString())
    resetPaymentForm()
    setSaving(false)
  }

  const handlePaymentEdit = (p: PaymentRecord) => {
    setEditPayment(p)
    setPayEmployeeId(p.employeeId); setAmount(String(p.amount)); setPaymentDate(p.paymentDate)
    setPeriod(p.period || ""); setMethod(p.method); setPayNotes(p.notes || "")
  }

  const handlePaymentDelete = async (id: string) => {
    await fetch(`/api/employee-payments?id=${id}`, { method: "DELETE" })
    await fetchPayments(user._id.toString())
    setDeletePaymentId(null)
  }

  const methodLabel = (m: string) => m === "cash" ? t('farmer.cash') : m === "mobile_money" ? t('farmer.mobileMoney') : t('farmer.bankTransfer')
  const wageTypeLabel = (w: string) => w === "monthly" ? t('farmer.monthly') : w === "daily" ? t('farmer.daily') : t('farmer.hourly')

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('farmer.employees')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('farmer.employeesDesc')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalEmployees')}</p>
              <Users2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{employees.length}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.activeEmployees')}</p>
              <Users2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-green-600 mt-2">{activeEmployees.length}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.monthlyWageBill')}</p>
              <Wallet className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl font-bold text-blue-600 mt-2">RWF {monthlyWageBill.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.paidThisMonth')}</p>
              <CircleDollarSign className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mt-2">RWF {paidThisMonth.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="employees" className="flex items-center gap-1"><Users2 className="h-4 w-4" /> {t('farmer.tabEmployees')}</TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1"><Banknote className="h-4 w-4" /> {t('farmer.tabPayments')}</TabsTrigger>
        </TabsList>

        {/* EMPLOYEES TAB */}
        <TabsContent value="employees" className="space-y-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {editEmployee ? t('farmer.editEmployee') : t('farmer.newEmployee')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.employeeName')} *</label>
                  <Input placeholder="e.g. Jean Baptiste" value={name} onChange={e => setName(e.target.value)} className={empErrors.name ? "border-red-500" : ""} />
                  {empErrors.name && <p className="text-xs text-red-500">{empErrors.name}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.position')} *</label>
                  <Input placeholder="e.g. Herder, Milker" value={position} onChange={e => setPosition(e.target.value)} className={empErrors.position ? "border-red-500" : ""} />
                  {empErrors.position && <p className="text-xs text-red-500">{empErrors.position}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.phone')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input placeholder="e.g. 078xxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.nationalId')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input placeholder="e.g. 1234567890123456" value={nationalId} onChange={e => setNationalId(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.hireDate')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.status')}</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('farmer.active')}</SelectItem>
                      <SelectItem value="inactive">{t('farmer.inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.wageType')} *</label>
                  <Select value={wageType} onValueChange={setWageType}>
                    <SelectTrigger className={empErrors.wageType ? "border-red-500" : ""}><SelectValue placeholder={t('farmer.wageType')} /></SelectTrigger>
                    <SelectContent>
                      {WAGE_TYPES.map(w => <SelectItem key={w} value={w}>{wageTypeLabel(w)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {empErrors.wageType && <p className="text-xs text-red-500">{empErrors.wageType}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.wageAmount')} *</label>
                  <Input type="number" min="0" placeholder="e.g. 50000" value={wageAmount} onChange={e => setWageAmount(e.target.value)} className={empErrors.wageAmount ? "border-red-500" : ""} />
                  {empErrors.wageAmount && <p className="text-xs text-red-500">{empErrors.wageAmount}</p>}
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.notes')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input placeholder={t('farmer.anyObservations')} value={empNotes} onChange={e => setEmpNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleEmployeeSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6">
                  {saving ? t('farmer.savingEmployee') : editEmployee ? t('farmer.updateEmployee') : t('farmer.saveEmployee')}
                </Button>
                {editEmployee && (
                  <Button variant="outline" onClick={resetEmployeeForm} className="rounded-lg">{t('farmer.cancel')}</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-sky-500 rounded-full" />
                {t('farmer.employeeList')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('farmer.name')}</TableHead>
                      <TableHead>{t('farmer.position')}</TableHead>
                      <TableHead>{t('farmer.phone')}</TableHead>
                      <TableHead>{t('farmer.wageType')}</TableHead>
                      <TableHead>{t('farmer.wageAmount')}</TableHead>
                      <TableHead>{t('farmer.status')}</TableHead>
                      <TableHead>{t('farmer.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">{t('farmer.noEmployeesYet')}</TableCell></TableRow>
                    ) : employees.map(e => (
                      <TableRow key={e._id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell>{e.position}</TableCell>
                        <TableCell className="text-sm text-gray-500">{e.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{wageTypeLabel(e.wageType)}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-blue-700">RWF {e.wageAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={e.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}>
                            {e.status === "active" ? t('farmer.active') : t('farmer.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEmployeeEdit(e)} className="h-8 w-8 p-0 hover:bg-green-50">
                              <Pencil className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteEmployeeId(e._id)} className="h-8 w-8 p-0 hover:bg-red-50">
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

        {/* PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {editPayment ? t('farmer.editPayment') : t('farmer.recordPayment')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {employees.length === 0 ? (
                <p className="text-sm text-gray-400 italic">{t('farmer.noEmployeesRegisterFirst')}</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.selectEmployee')} *</label>
                      <Select value={payEmployeeId} onValueChange={setPayEmployeeId} disabled={!!editPayment}>
                        <SelectTrigger className={payErrors.payEmployeeId ? "border-red-500" : ""}><SelectValue placeholder={t('farmer.selectEmployee')} /></SelectTrigger>
                        <SelectContent>
                          {employees.map(e => <SelectItem key={e._id} value={e._id}>{e.name} ({e.position})</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {payErrors.payEmployeeId && <p className="text-xs text-red-500">{payErrors.payEmployeeId}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.amount')} *</label>
                      <Input type="number" min="0" placeholder="e.g. 50000" value={amount} onChange={e => setAmount(e.target.value)} className={payErrors.amount ? "border-red-500" : ""} />
                      {payErrors.amount && <p className="text-xs text-red-500">{payErrors.amount}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.paymentDate')} *</label>
                      <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={payErrors.paymentDate ? "border-red-500" : ""} />
                      {payErrors.paymentDate && <p className="text-xs text-red-500">{payErrors.paymentDate}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.period')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                      <Input placeholder="e.g. July 2026" value={period} onChange={e => setPeriod(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.paymentMethod')} *</label>
                      <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger className={payErrors.method ? "border-red-500" : ""}><SelectValue placeholder={t('farmer.paymentMethod')} /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {payErrors.method && <p className="text-xs text-red-500">{payErrors.method}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('farmer.notes')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                      <Input placeholder={t('farmer.anyObservations')} value={payNotes} onChange={e => setPayNotes(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={handlePaymentSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6">
                      {saving ? t('farmer.savingRecord') : editPayment ? t('farmer.updatePayment') : t('farmer.savePayment')}
                    </Button>
                    {editPayment && (
                      <Button variant="outline" onClick={resetPaymentForm} className="rounded-lg">{t('farmer.cancel')}</Button>
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
                {t('farmer.paymentHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                <Select value={filterEmployee || "all"} onValueChange={v => setFilterEmployee(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t('farmer.allEmployees')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('farmer.allEmployees')}</SelectItem>
                    {employees.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
                <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                  <p className="text-sm text-gray-500">{filteredPayments.length}</p>
                  <Button variant="outline" onClick={clearPaymentFilters} className="rounded-lg ml-auto">{t('farmer.clearFilters')}</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('farmer.date')}</TableHead>
                      <TableHead>{t('farmer.name')}</TableHead>
                      <TableHead>{t('farmer.amount')}</TableHead>
                      <TableHead>{t('farmer.period')}</TableHead>
                      <TableHead>{t('farmer.paymentMethod')}</TableHead>
                      <TableHead>{t('farmer.notes')}</TableHead>
                      <TableHead>{t('farmer.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">{t('farmer.noPaymentsFound')}</TableCell></TableRow>
                    ) : filteredPayments.map(p => (
                      <TableRow key={p._id}>
                        <TableCell className="text-sm">{p.paymentDate}</TableCell>
                        <TableCell className="font-medium">{p.employeeName}</TableCell>
                        <TableCell className="font-semibold text-green-700">RWF {p.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-gray-500">{p.period || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{methodLabel(p.method)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[160px] truncate">{p.notes || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handlePaymentEdit(p)} className="h-8 w-8 p-0 hover:bg-green-50">
                              <Pencil className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeletePaymentId(p._id)} className="h-8 w-8 p-0 hover:bg-red-50">
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

      {/* Delete Employee Confirmation */}
      <AlertDialog open={!!deleteEmployeeId} onOpenChange={open => !open && setDeleteEmployeeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.deleteEmployee')}</AlertDialogTitle>
            <AlertDialogDescription>{t('farmer.deleteEmployeeConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('farmer.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteEmployeeId && handleEmployeeDelete(deleteEmployeeId)} className="bg-red-600 hover:bg-red-700 text-white">
              {t('farmer.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payment Confirmation */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={open => !open && setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.deletePayment')}</AlertDialogTitle>
            <AlertDialogDescription>{t('farmer.deletePaymentConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('farmer.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePaymentId && handlePaymentDelete(deletePaymentId)} className="bg-red-600 hover:bg-red-700 text-white">
              {t('farmer.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
