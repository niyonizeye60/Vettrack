"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Smartphone,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileText,
  User,
  Phone,
  Calendar,
  Hash,
  Copy,
  Check,
  Download,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { OrderPaymentStatus, OrderPaymentMethod } from "@/lib/db-orders"

interface Transaction {
  id: string
  orderId: string
  buyer: {
    name: string
    phone: string
    email?: string
  }
  items: Array<{ name: string; quantity: number; lineTotal: number }>
  total: number
  currency: string
  paymentMethod: OrderPaymentMethod
  paymentStatus: OrderPaymentStatus
  payment: {
    intouchRequestTransactionId?: string
    intouchTransactionId?: string
    intouchReferenceNo?: string
    pesapalOrderTrackingId?: string
    pesapalMerchantReference?: string
  }
  createdAt: string
  paidAt?: string
  status: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function TransactionsTable() {
  const { t } = useLanguage()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filters
  const [page, setPage] = useState(1)
  const [method, setMethod] = useState<string>("")
  const [status, setStatus] = useState<string>("")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")

  // Detail modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      params.set("page", page.toString())
      if (method) params.set("method", method)
      if (status) params.set("status", status)
      if (search) params.set("search", search)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      params.set("sortBy", sortBy)
      params.set("sortOrder", sortOrder)

      const res = await fetch(`/api/payments/transactions?${params}`)
      const data = await res.json()
      if (res.ok) {
        setTransactions(data.transactions)
        setPagination(data.pagination)
      } else {
        setError(data.error || "Failed to fetch transactions")
      }
    } catch {
      setError("Failed to fetch transactions")
    } finally {
      setLoading(false)
    }
  }, [page, method, status, search, dateFrom, dateTo, sortBy, sortOrder])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const handleReset = () => {
    setMethod("")
    setStatus("")
    setSearchInput("")
    setSearch("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getStatusBadge = (paymentStatus: OrderPaymentStatus) => {
    switch (paymentStatus) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>
      case "invalid":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Invalid</Badge>
      case "reversed":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Reversed</Badge>
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>
    }
  }

  const getMethodBadge = (pm: OrderPaymentMethod) => {
    if (pm === "intouchpay") {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"><Smartphone className="h-3 w-3" /> Mobile Money</Badge>
    }
    return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1"><CreditCard className="h-3 w-3" /> Card (Pesapal)</Badge>
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-RW", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const hasFilters = method || status || search || dateFrom || dateTo

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            {t('transactions.filterTitle') || 'Filter Transactions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('transactions.searchPlaceholder') || "Search name, phone, transaction ID..."}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 text-sm"
              />
            </div>
            <select
              value={method}
              onChange={(e) => { setMethod(e.target.value); setPage(1) }}
              className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400"
            >
              <option value="">{t('transactions.allMethods') || "All Methods"}</option>
              <option value="intouchpay">Mobile Money (IntouchPay)</option>
              <option value="pesapal">Card (Pesapal)</option>
            </select>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400"
            >
              <option value="">{t('transactions.allStatuses') || "All Statuses"}</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="invalid">Invalid</option>
              <option value="reversed">Reversed</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400"
              title={t('transactions.dateFrom') || "From date"}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400"
              title={t('transactions.dateTo') || "To date"}
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={handleSearch} className="h-8">
              <Search className="h-3.5 w-3.5 mr-1.5" />
              {t('transactions.search') || "Search"}
            </Button>
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 text-gray-500">
                {t('transactions.reset') || "Reset"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">{t('transactions.totalTransactions') || "Total Transactions"}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{pagination.total}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">{t('transactions.completed') || "Completed"}</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{transactions.filter(t => t.paymentStatus === "completed").length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">{t('transactions.pending') || "Pending"}</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{transactions.filter(t => t.paymentStatus === "pending").length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">{t('transactions.totalVolume') || "Total Volume"}</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              RWF {transactions.reduce((s, t) => s + t.total, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-600 text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchTransactions} className="mt-4">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                {t('transactions.retry') || "Retry"}
              </Button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">{t('transactions.noTransactions') || "No transactions found"}</h3>
              <p className="text-sm text-gray-500">{t('transactions.noTransactionsDesc') || "Try adjusting your filters or search terms."}</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => { setSortBy("createdAt"); setSortOrder(sortOrder === "desc" ? "asc" : "desc") }}>
                  <Calendar className="h-3 w-3" /> Date <ArrowUpDown className="h-3 w-3" />
                </div>
                <div className="col-span-2">{t('transactions.customer') || "Customer"}</div>
                <div className="col-span-1 flex items-center gap-1 cursor-pointer" onClick={() => { setSortBy("method"); setSortOrder(sortOrder === "desc" ? "asc" : "desc") }}>
                  Method <ArrowUpDown className="h-3 w-3" />
                </div>
                <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => { setSortBy("amount"); setSortOrder(sortOrder === "desc" ? "asc" : "desc") }}>
                  Amount <ArrowUpDown className="h-3 w-3" />
                </div>
                <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => { setSortBy("status"); setSortOrder(sortOrder === "desc" ? "asc" : "desc") }}>
                  Status <ArrowUpDown className="h-3 w-3" />
                </div>
                <div className="col-span-2">Transaction ID</div>
                <div className="col-span-1 text-right">{t('transactions.action') || "Action"}</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 md:px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    {/* Date - mobile friendly */}
                    <div className="md:col-span-2 flex md:block items-center justify-between">
                      <span className="md:hidden text-xs text-gray-500">{t('transactions.date') || "Date"}:</span>
                      <span className="text-sm text-gray-700">{formatDate(tx.createdAt)}</span>
                    </div>

                    {/* Customer */}
                    <div className="md:col-span-2 flex md:block items-center justify-between">
                      <span className="md:hidden text-xs text-gray-500">{t('transactions.customer') || "Customer"}:</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          {tx.buyer.name}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />
                          {tx.buyer.phone}
                        </p>
                      </div>
                    </div>

                    {/* Method */}
                    <div className="md:col-span-1 flex md:block items-center justify-between">
                      <span className="md:hidden text-xs text-gray-500">{t('transactions.method') || "Method"}:</span>
                      {getMethodBadge(tx.paymentMethod)}
                    </div>

                    {/* Amount */}
                    <div className="md:col-span-2 flex md:block items-center justify-between">
                      <span className="md:hidden text-xs text-gray-500">{t('transactions.amount') || "Amount"}:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        RWF {tx.total.toLocaleString()}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="md:col-span-2 flex md:block items-center justify-between">
                      <span className="md:hidden text-xs text-gray-500">{t('transactions.status') || "Status"}:</span>
                      {getStatusBadge(tx.paymentStatus)}
                    </div>

                    {/* Transaction ID */}
                    <div className="md:col-span-2 flex md:block items-center justify-between">
                      <span className="md:hidden text-xs text-gray-500">ID:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[120px] block">
                          {tx.payment.intouchRequestTransactionId || tx.payment.pesapalOrderTrackingId || "-"}
                        </code>
                        {(tx.payment.intouchRequestTransactionId || tx.payment.pesapalOrderTrackingId) && (
                          <button
                            onClick={() => copyToClipboard(
                              tx.payment.intouchRequestTransactionId || tx.payment.pesapalOrderTrackingId || "",
                              `txid-${tx.id}`
                            )}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            {copiedField === `txid-${tx.id}` ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="md:col-span-1 flex md:block items-center justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTx(tx)}
                        className="text-xs h-8"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden md:inline">{t('transactions.view') || "View"}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('transactions.showing') || "Showing"}{" "}
            <span className="font-medium">{(pagination.page - 1) * pagination.pageSize + 1}</span>
            {" - "}
            <span className="font-medium">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span>
            {" "}{t('transactions.of') || "of"}{" "}
            <span className="font-medium">{pagination.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              const startPage = Math.max(1, page - 2)
              const p = startPage + i
              if (p > pagination.totalPages) return null
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                  className="min-w-[36px]"
                >
                  {p}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTx && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-gray-500" />
                  {t('transactions.transactionDetails') || "Transaction Details"}
                </DialogTitle>
                <DialogDescription>
                  {t('transactions.transactionDetailsDesc') || "Full details of the selected payment transaction."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg border ${
                  selectedTx.paymentStatus === "completed" ? "bg-green-50 border-green-200" :
                  selectedTx.paymentStatus === "pending" ? "bg-yellow-50 border-yellow-200" :
                  "bg-red-50 border-red-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedTx.paymentStatus === "completed" ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                       selectedTx.paymentStatus === "pending" ? <Clock className="h-5 w-5 text-yellow-600" /> :
                       <XCircle className="h-5 w-5 text-red-600" />}
                      <span className="font-semibold text-gray-900 capitalize">{selectedTx.paymentStatus}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      RWF {selectedTx.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-gray-500" />
                    {t('transactions.customerInfo') || "Customer Information"}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('transactions.name') || "Name"}:</span>
                      <span className="font-medium text-gray-900">{selectedTx.buyer.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('transactions.phone') || "Phone"}:</span>
                      <span className="font-medium text-gray-900">{selectedTx.buyer.phone}</span>
                    </div>
                    {selectedTx.buyer.email && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-medium text-gray-900">{selectedTx.buyer.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                {selectedTx.items && selectedTx.items.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-gray-500" />
                      {t('transactions.orderItems') || "Order Items"}
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      {selectedTx.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {item.name} <span className="text-gray-400">×{item.quantity}</span>
                          </span>
                          <span className="font-medium text-gray-900">
                            RWF {item.lineTotal.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Details */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    {t('transactions.paymentDetails') || "Payment Details"}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('transactions.paymentMethod') || "Payment Method"}:</span>
                      <span className="font-medium text-gray-900">
                        {selectedTx.paymentMethod === "intouchpay" ? "Mobile Money (IntouchPay)" : "Card (Pesapal)"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('transactions.orderId') || "Order ID"}:</span>
                      <span className="font-mono text-xs text-gray-900">{selectedTx.orderId}</span>
                    </div>

                    {selectedTx.paymentMethod === "intouchpay" && (
                      <>
                        {selectedTx.payment.intouchRequestTransactionId && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-500">Request ID:</span>
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{selectedTx.payment.intouchRequestTransactionId}</code>
                              <button onClick={() => copyToClipboard(selectedTx.payment.intouchRequestTransactionId!, "reqid")} className="p-1 hover:bg-gray-200 rounded">
                                {copiedField === "reqid" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedTx.payment.intouchTransactionId && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-500">Transaction ID:</span>
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{selectedTx.payment.intouchTransactionId}</code>
                              <button onClick={() => copyToClipboard(selectedTx.payment.intouchTransactionId!, "txid")} className="p-1 hover:bg-gray-200 rounded">
                                {copiedField === "txid" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedTx.payment.intouchReferenceNo && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-500">Reference No:</span>
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{selectedTx.payment.intouchReferenceNo}</code>
                              <button onClick={() => copyToClipboard(selectedTx.payment.intouchReferenceNo!, "refno")} className="p-1 hover:bg-gray-200 rounded">
                                {copiedField === "refno" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {selectedTx.paymentMethod === "pesapal" && (
                      <>
                        {selectedTx.payment.pesapalOrderTrackingId && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-500">Tracking ID:</span>
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{selectedTx.payment.pesapalOrderTrackingId}</code>
                              <button onClick={() => copyToClipboard(selectedTx.payment.pesapalOrderTrackingId!, "trackid")} className="p-1 hover:bg-gray-200 rounded">
                                {copiedField === "trackid" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('transactions.date') || "Date"}:</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedTx.createdAt)}</span>
                    </div>
                    {selectedTx.paidAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('transactions.paidAt') || "Paid At"}:</span>
                        <span className="font-medium text-gray-900">{formatDate(selectedTx.paidAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Export Button */}
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTx(null)}>
                    {t('common.close') || "Close"}
                  </Button>
                  <Button size="sm" onClick={() => {
                    const text = [
                      `Order: ${selectedTx.orderId}`,
                      `Customer: ${selectedTx.buyer.name} (${selectedTx.buyer.phone})`,
                      `Amount: RWF ${selectedTx.total.toLocaleString()}`,
                      `Method: ${selectedTx.paymentMethod}`,
                      `Status: ${selectedTx.paymentStatus}`,
                      `Date: ${formatDate(selectedTx.createdAt)}`,
                      selectedTx.payment.intouchRequestTransactionId ? `IntouchPay Request ID: ${selectedTx.payment.intouchRequestTransactionId}` : null,
                      selectedTx.payment.intouchTransactionId ? `IntouchPay Transaction ID: ${selectedTx.payment.intouchTransactionId}` : null,
                      selectedTx.payment.pesapalOrderTrackingId ? `Pesapal Tracking ID: ${selectedTx.payment.pesapalOrderTrackingId}` : null,
                    ].filter(Boolean).join("\n")
                    navigator.clipboard.writeText(text)
                  }}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {t('transactions.copySummary') || "Copy Summary"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
