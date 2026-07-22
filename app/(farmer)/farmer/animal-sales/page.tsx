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
import { Plus, Pencil, Trash2, History, TrendingUp, TrendingDown, Scale } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface Animal { _id: string; name: string; type: string }
interface AnimalTransaction {
  _id: string; farmerId: string; animalId: string | null; animalName: string; animalType: string | null
  transactionType: "sale" | "purchase"; quantity: number; amount: number; party: string | null
  date: string; notes: string | null
}

const today = new Date().toISOString().split("T")[0]

export default function AnimalSalesPage() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [animals, setAnimals] = useState<Animal[]>([])
  const [transactions, setTransactions] = useState<AnimalTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editTx, setEditTx] = useState<AnimalTransaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form state
  const [transactionType, setTransactionType] = useState<string>("sale")
  const [animalId, setAnimalId] = useState("")
  const [animalName, setAnimalName] = useState("")
  const [animalType, setAnimalType] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [amount, setAmount] = useState("")
  const [party, setParty] = useState("")
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filter state
  const [filterType, setFilterType] = useState("")
  const [filterStart, setFilterStart] = useState("")
  const [filterEnd, setFilterEnd] = useState("")

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setUser(userData)
      const animalsData = await getAnimals(userData._id.toString())
      setAnimals(animalsData)
      await fetchTransactions(userData._id.toString())
      setLoading(false)
    }
    init()
  }, [])

  const fetchTransactions = async (farmerId: string) => {
    const res = await fetch(`/api/animal-transactions?farmerId=${farmerId}`)
    const data = await res.json()
    setTransactions(Array.isArray(data) ? data : [])
  }

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions]
    if (filterType) filtered = filtered.filter(tx => tx.transactionType === filterType)
    if (filterStart) filtered = filtered.filter(tx => tx.date >= filterStart)
    if (filterEnd) filtered = filtered.filter(tx => tx.date <= filterEnd)
    return filtered
  }, [transactions, filterType, filterStart, filterEnd])

  const totalSales = useMemo(() => transactions.filter(tx => tx.transactionType === "sale").reduce((s, tx) => s + tx.amount, 0), [transactions])
  const totalPurchases = useMemo(() => transactions.filter(tx => tx.transactionType === "purchase").reduce((s, tx) => s + tx.amount, 0), [transactions])
  const netValue = totalSales - totalPurchases

  const clearFilters = () => { setFilterType(""); setFilterStart(""); setFilterEnd("") }

  const resetForm = () => {
    setTransactionType("sale"); setAnimalId(""); setAnimalName(""); setAnimalType("")
    setQuantity("1"); setAmount(""); setParty(""); setDate(today); setNotes("")
    setErrors({}); setEditTx(null)
  }

  const handleAnimalSelect = (id: string) => {
    if (id === "other") {
      setAnimalId(""); setAnimalName(""); setAnimalType("")
      return
    }
    const a = animals.find(x => x._id === id)
    setAnimalId(id)
    setAnimalName(a?.name || "")
    setAnimalType(a?.type || "")
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!animalName.trim()) e.animalName = "Enter or select an animal"
    if (!amount || Number(amount) <= 0) e.amount = "Enter a valid amount"
    if (!date) e.date = "Select a date"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    const body = { farmerId: user._id.toString(), animalId: animalId || null, animalName, animalType, transactionType, quantity, amount, party, date, notes }

    if (editTx) {
      await fetch("/api/animal-transactions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editTx._id, animalId: animalId || null, animalName, animalType, transactionType, quantity, amount, party, date, notes }) })
    } else {
      await fetch("/api/animal-transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }

    await fetchTransactions(user._id.toString())
    resetForm()
    setSaving(false)
  }

  const handleEdit = (tx: AnimalTransaction) => {
    setEditTx(tx)
    setTransactionType(tx.transactionType)
    setAnimalId(tx.animalId || "")
    setAnimalName(tx.animalName)
    setAnimalType(tx.animalType || "")
    setQuantity(String(tx.quantity))
    setAmount(String(tx.amount))
    setParty(tx.party || "")
    setDate(tx.date)
    setNotes(tx.notes || "")
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/animal-transactions?id=${id}`, { method: "DELETE" })
    await fetchTransactions(user._id.toString())
    setDeleteId(null)
  }

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 bg-gray-200 rounded w-48" />
        <div className="h-4 bg-gray-200 rounded w-64 mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-24" />
            <div className="h-3 bg-gray-200 rounded w-16" />
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
        <h1 className="text-2xl font-bold text-gray-900">{t('farmer.animalSales')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('farmer.animalSalesDesc')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalSalesRevenue')}</p>
              <TrendingUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mt-2">RWF {totalSales.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.totalPurchaseCost')}</p>
              <TrendingDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-2xl font-bold text-red-600 mt-2">RWF {totalPurchases.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('farmer.netLivestockValue')}</p>
              <Scale className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className={`text-2xl font-bold mt-2 ${netValue >= 0 ? "text-green-600" : "text-red-600"}`}>
              {netValue >= 0 ? "" : "-"}RWF {Math.abs(netValue).toLocaleString()}
            </h3>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="record">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="record" className="flex items-center gap-1"><Plus className="h-4 w-4" /> {t('farmer.tabRecord')}</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1"><History className="h-4 w-4" /> {t('farmer.tabHistory')}</TabsTrigger>
        </TabsList>

        {/* RECORD TAB */}
        <TabsContent value="record">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {editTx ? t('farmer.editTransaction') : t('farmer.recordTransaction')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.transactionType')} *</label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">{t('farmer.sale')}</SelectItem>
                      <SelectItem value="purchase">{t('farmer.purchase')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Animal picker */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.animal')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Select value={animalId || (animalName ? "other" : "")} onValueChange={handleAnimalSelect}>
                    <SelectTrigger><SelectValue placeholder={t('farmer.selectAnimalOrOther')} /></SelectTrigger>
                    <SelectContent>
                      {animals.map(a => <SelectItem key={a._id} value={a._id}>{a.name} ({a.type})</SelectItem>)}
                      <SelectItem value="other">{t('farmer.otherAnimalNotListed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Animal name (manual / confirm) */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.name')} *</label>
                  <Input placeholder="e.g. Brown Cow" value={animalName} onChange={e => setAnimalName(e.target.value)} disabled={!!animalId} className={errors.animalName ? "border-red-500" : ""} />
                  {errors.animalName && <p className="text-xs text-red-500">{errors.animalName}</p>}
                </div>

                {/* Animal type (manual) */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.type')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input placeholder="e.g. cow, goat" value={animalType} onChange={e => setAnimalType(e.target.value)} disabled={!!animalId} />
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.quantity')}</label>
                  <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('farmer.amount')} *</label>
                  <Input type="number" min="0" placeholder="e.g. 250000" value={amount} onChange={e => setAmount(e.target.value)} className={errors.amount ? "border-red-500" : ""} />
                  {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
                </div>

                {/* Party */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{transactionType === "sale" ? t('farmer.buyerName') : t('farmer.sellerName')} <span className="text-gray-400 text-xs">({t('common.optional')})</span></label>
                  <Input placeholder={t('farmer.enterName')} value={party} onChange={e => setParty(e.target.value)} />
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
                  {saving ? t('farmer.savingRecord') : editTx ? t('farmer.updateRecord') : t('farmer.saveRecord')}
                </Button>
                {editTx && (
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
                {t('farmer.transactionHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl">
                <Select value={filterType || "all"} onValueChange={v => setFilterType(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t('farmer.allTypes')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('farmer.allTypes')}</SelectItem>
                    <SelectItem value="sale">{t('farmer.sale')}</SelectItem>
                    <SelectItem value="purchase">{t('farmer.purchase')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} placeholder="Start date" />
                <Input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} placeholder="End date" />
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-500">{filteredTransactions.length}</p>
                  <Button variant="outline" onClick={clearFilters} className="rounded-lg ml-auto">{t('farmer.clearFilters')}</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('farmer.date')}</TableHead>
                      <TableHead>{t('farmer.transactionType')}</TableHead>
                      <TableHead>{t('farmer.animal')}</TableHead>
                      <TableHead>{t('farmer.quantity')}</TableHead>
                      <TableHead>{t('farmer.amount')}</TableHead>
                      <TableHead>{t('farmer.party')}</TableHead>
                      <TableHead>{t('farmer.notes')}</TableHead>
                      <TableHead>{t('farmer.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-400">{t('farmer.noTransactionsYet')}</TableCell></TableRow>
                    ) : filteredTransactions.map(tx => (
                      <TableRow key={tx._id}>
                        <TableCell className="text-sm">{tx.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tx.transactionType === "sale" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                            {tx.transactionType === "sale" ? t('farmer.sale') : t('farmer.purchase')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{tx.animalName}{tx.animalType ? ` (${tx.animalType})` : ""}</TableCell>
                        <TableCell>{tx.quantity}</TableCell>
                        <TableCell className={`font-semibold ${tx.transactionType === "sale" ? "text-green-700" : "text-red-700"}`}>RWF {tx.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-gray-500">{tx.party || "—"}</TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[140px] truncate">{tx.notes || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(tx)} className="h-8 w-8 p-0 hover:bg-green-50">
                              <Pencil className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteId(tx._id)} className="h-8 w-8 p-0 hover:bg-red-50">
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.deleteTransaction')}</AlertDialogTitle>
            <AlertDialogDescription>{t('farmer.deleteTransactionConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('farmer.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-600 hover:bg-red-700 text-white">
              {t('farmer.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
