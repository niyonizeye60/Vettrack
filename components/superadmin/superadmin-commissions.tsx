"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  Loader2, DollarSign, TrendingUp, Percent, Users, FileText, CheckCircle, Clock,
  AlertTriangle, RefreshCw, Eye, Smartphone, Copy, Check, Calendar, Send,
  ArrowUpRight, History, Wallet, Banknote, Activity, Shield, BarChart3, Filter, Store, ChevronDown, ChevronUp, CreditCard, Landmark, CheckSquare, Square, ThumbsUp, ThumbsDown
} from "lucide-react"
import { COMMISSION_PERCENTAGE } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"

interface PayoutItem {
  _id: string
  orderId: string
  sellerId: string
  sellerName: string
  sellerPhone: string
  itemName: string
  itemTotal: number
  commissionPercentage: number
  commissionAmount: number
  sellerAmount: number
  status: "pending" | "paid" | "cancelled"
  paidAt?: string
  createdAt: string
}

interface BookingItem {
  _id: string
  name: string
  phone: string
  email?: string
  service: string
  servicePrice: number
  animalType: string
  animalCount: number
  description?: string
  date: string
  timeSlot: string
  paymentMethod: string
  mobileMoneyPhone?: string
  paymentStatus: string
  bookingStatus: string
  intouchRequestTransactionId?: string
  intouchTransactionId?: string
  intouchReferenceNo?: string
  pesapalOrderTrackingId?: string
  pesapalMerchantReference?: string
  paidAt?: string
  createdAt: string
}

interface CommissionStats {
  totalCommission: number
  totalSellerAmount: number
  totalItems: number
  paidCommission: number
  pendingCommission: number
}

interface BookingStats {
  totalBookings: number
  paidBookings: number
  pendingBookings: number
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
}

interface SellerBreakdownItem {
  sellerId: string
  sellerName: string
  sellerPhone: string
  totalItems: number
  totalItemAmount: number
  totalCommission: number
  totalSellerAmount: number
  pendingCount: number
  paidCount: number
  cancelledCount: number
  pendingAmount: number
  paidAmount: number
  lastPayoutDate: string | null
}

export default function SuperAdminCommissions() {
  const { toast } = useToast()
  const [stats, setStats] = useState<CommissionStats | null>(null)
  const [pendingPayouts, setPendingPayouts] = useState<PayoutItem[]>([])
  const [recentPayouts, setRecentPayouts] = useState<PayoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedPayout, setSelectedPayout] = useState<PayoutItem | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [payingPayout, setPayingPayout] = useState<string | null>(null)
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<"all" | "pending" | "paid" | "sellers" | "bookings" | "withdrawals">("all")
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sendingPayout, setSendingPayout] = useState<PayoutItem | null>(null)
  const [sendingStatus, setSendingStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [sendError, setSendError] = useState("")
  const [sellers, setSellers] = useState<SellerBreakdownItem[]>([])
  const [sellersLoading, setSellersLoading] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState<SellerBreakdownItem | null>(null)
  const [sellerDetailPayouts, setSellerDetailPayouts] = useState<PayoutItem[]>([])
  const [sellerDetailLoading, setSellerDetailLoading] = useState(false)
  const [sellerDetailOpen, setSellerDetailOpen] = useState(false)
  const [sortField, setSortField] = useState<keyof SellerBreakdownItem>("totalSellerAmount")
  const [sortAsc, setSortAsc] = useState(false)

  // Booking state
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingStats, setBookingStats] = useState<BookingStats | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null)

  // Withdrawal state
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false)
  const [withdrawalStats, setWithdrawalStats] = useState<any>(null)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null)
  const [withdrawalDetailOpen, setWithdrawalDetailOpen] = useState(false)

  // IntouchPay gateway balance
  const [gatewayBalance, setGatewayBalance] = useState<{ balance: number; success: boolean; loading: boolean }>({
    balance: 0, success: false, loading: false
  })

  // Commission settings state
  const [commissionPct, setCommissionPct] = useState<number>(COMMISSION_PERCENTAGE)
  const [defaultCommissionPct, setDefaultCommissionPct] = useState<number>(COMMISSION_PERCENTAGE)
  const [commissionInput, setCommissionInput] = useState<string>(String(COMMISSION_PERCENTAGE))
  const [savingCommission, setSavingCommission] = useState(false)

  // Wallet actions state
  const [directSendOpen, setDirectSendOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [walletActionAmount, setWalletActionAmount] = useState("")
  const [walletActionPhone, setWalletActionPhone] = useState("")
  const [walletActionName, setWalletActionName] = useState("")
  const [walletActionDesc, setWalletActionDesc] = useState("")
  const [walletActionRef, setWalletActionRef] = useState("")
  const [walletProcessing, setWalletProcessing] = useState(false)
  const [walletResult, setWalletResult] = useState<{ success: boolean; message: string } | null>(null)
  const [walletTxns, setWalletTxns] = useState<any[]>([])
  const [walletTxnStats, setWalletTxnStats] = useState<any>(null)
  const [walletTxnOpen, setWalletTxnOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/commissions")
      const data = await res.json()
      if (res.ok) {
        setStats(data.stats)
        setPendingPayouts(data.pendingPayouts || [])
        setRecentPayouts(data.recentPayouts || [])
      } else {
        setError(data.error || "Failed to fetch commission data")
      }
    } catch {
      setError("Failed to fetch commission data")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGatewayBalance = useCallback(async () => {
    setGatewayBalance(prev => ({ ...prev, loading: true }))
    try {
      const res = await fetch("/api/payments/intouchpay/balance")
      const data = await res.json()
      setGatewayBalance({
        balance: data.balance || 0,
        success: data.success || false,
        loading: false,
      })
    } catch {
      setGatewayBalance({ balance: 0, success: false, loading: false })
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      if (res.ok) {
        setCommissionPct(data.commissionPercentage)
        setDefaultCommissionPct(data.defaultCommissionPercentage)
        setCommissionInput(String(data.commissionPercentage))
      }
    } catch {
      console.error("Failed to fetch settings")
    }
  }, [])

  const handleWalletAction = async (action: "deposit" | "direct_send" | "withdraw") => {
    const amount = Number(walletActionAmount)
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid amount", variant: "destructive" })
      return
    }
    if ((action === "direct_send" || action === "withdraw") && !walletActionPhone) {
      toast({ title: "Phone required", description: "Enter a recipient phone number", variant: "destructive" })
      return
    }

    setWalletProcessing(true)
    setWalletResult(null)
    try {
      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          amount,
          recipientPhone: walletActionPhone,
          recipientName: walletActionName || undefined,
          description: walletActionDesc || undefined,
          reference: walletActionRef || undefined,
        }),
      })
      const data = await res.json()
      setWalletResult({ success: res.ok, message: data.message || data.error || "Done" })
      if (res.ok) {
        toast({ title: action === "deposit" ? "✅ Deposit Recorded" : action === "direct_send" ? "✅ Money Sent!" : "✅ Withdrawal Complete", description: data.message })
        // Reset & close after success
        setTimeout(() => {
          setWalletActionAmount("")
          setWalletActionPhone("")
          setWalletActionName("")
          setWalletActionDesc("")
          setWalletActionRef("")
          setWalletResult(null)
          if (action === "deposit") setDepositOpen(false)
          else if (action === "direct_send") setDirectSendOpen(false)
          else setWithdrawOpen(false)
          fetchGatewayBalance()
          fetchWalletTransactions()
        }, 1500)
      } else {
        toast({ title: "Error", description: data.error || "Failed", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
      setWalletResult({ success: false, message: "Network error" })
    } finally {
      setWalletProcessing(false)
    }
  }

  const handleSaveCommission = async () => {
    const val = Number(commissionInput)
    if (isNaN(val) || val < 0 || val > 100) {
      toast({ title: "Invalid value", description: "Must be between 0 and 100", variant: "destructive" })
      return
    }
    setSavingCommission(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionPercentage: val }),
      })
      if (res.ok) {
        setCommissionPct(val)
        toast({ title: "✅ Commission updated", description: `Global commission rate is now ${val}%` })
      } else {
        const data = await res.json()
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    } finally {
      setSavingCommission(false)
    }
  }

  const fetchWalletTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/wallet")
      const data = await res.json()
      if (res.ok) {
        setWalletTxns(data.transactions || [])
        setWalletTxnStats(data.stats)
      }
    } catch {
      console.error("Failed to fetch wallet transactions")
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchGatewayBalance() }, [fetchGatewayBalance])
  useEffect(() => { fetchSettings() }, [fetchSettings])
  useEffect(() => { fetchWalletTransactions() }, [fetchWalletTransactions])

  const fetchSellers = useCallback(async () => {
    setSellersLoading(true)
    try {
      const res = await fetch("/api/admin/commissions/sellers")
      const data = await res.json()
      if (res.ok) setSellers(data.sellers || [])
    } catch {
      console.error("Failed to fetch sellers")
    } finally {
      setSellersLoading(false)
    }
  }, [])

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true)
    try {
      const res = await fetch("/api/bookings")
      const data = await res.json()
      if (res.ok) {
        const allBookings = data.bookings || []
        setBookings(allBookings)

        // Calculate booking stats
        const paid = allBookings.filter((b: BookingItem) => b.paymentStatus === "completed")
        const pending = allBookings.filter((b: BookingItem) => b.paymentStatus === "pending")

        setBookingStats({
          totalBookings: allBookings.length,
          paidBookings: paid.length,
          pendingBookings: pending.length,
          totalRevenue: allBookings.reduce((sum: number, b: BookingItem) => sum + (b.servicePrice || 0), 0),
          paidRevenue: paid.reduce((sum: number, b: BookingItem) => sum + (b.servicePrice || 0), 0),
          pendingRevenue: pending.reduce((sum: number, b: BookingItem) => sum + (b.servicePrice || 0), 0),
        })
      }
    } catch {
      console.error("Failed to fetch bookings")
    } finally {
      setBookingsLoading(false)
    }
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const fetchWithdrawals = useCallback(async () => {
    setWithdrawalsLoading(true)
    try {
      const res = await fetch("/api/withdrawals?admin=true")
      const data = await res.json()
      if (res.ok) {
        setWithdrawals(data.withdrawals || [])
        setWithdrawalStats(data.stats)
      }
    } catch {
      console.error("Failed to fetch withdrawals")
    } finally {
      setWithdrawalsLoading(false)
    }
  }, [])

  const handleApproveWithdrawal = async (withdrawalId: string, sendMoney: boolean = true) => {
    try {
      const res = await fetch("/api/withdrawals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, status: "completed", sendMoney }),
      })
      if (res.ok) {
        toast({ title: "✅ Withdrawal approved", description: "Seller withdrawal has been approved and payment sent" })
        await fetchWithdrawals()
      } else {
        const data = await res.json()
        toast({ title: "Error", description: data.error || "Failed to approve", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    }
  }

  const handleRejectWithdrawal = async (withdrawalId: string, note?: string) => {
    const reason = note || window.prompt("Reason for rejection:")
    if (!reason) return
    try {
      const res = await fetch("/api/withdrawals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, status: "rejected", adminNote: reason }),
      })
      if (res.ok) {
        toast({ title: "Withdrawal rejected", description: reason })
        await fetchWithdrawals()
      } else {
        toast({ title: "Error", description: "Failed to reject", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    }
  }

  useEffect(() => {
    if (tab === "sellers") fetchSellers()
    if (tab === "bookings") fetchBookings()
    if (tab === "withdrawals") fetchWithdrawals()
  }, [tab, fetchSellers, fetchBookings, fetchWithdrawals])

  const handleMarkPaid = async (payoutId: string) => {
    setPayingPayout(payoutId)
    try {
      const res = await fetch("/api/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId }),
      })
      if (res.ok) {
        toast({ title: "✅ Marked as paid", description: "Payout status updated successfully" })
        await fetchData()
      } else {
        const data = await res.json()
        toast({ title: "Error", description: data.error || "Failed to mark as paid", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to mark payout as paid", variant: "destructive" })
    } finally {
      setPayingPayout(null)
    }
  }

  const handleSendMoney = async () => {
    if (!sendingPayout) return
    setSendingStatus("sending")
    setSendError("")
    try {
      const res = await fetch("/api/payouts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId: sendingPayout._id }),
      })
      const data = await res.json()
      if (res.ok) {
        setSendingStatus("success")
        toast({
          title: "✅ Payment Sent!",
          description: `RWF ${sendingPayout.sellerAmount.toLocaleString()} sent to ${sendingPayout.sellerName}`,
        })
        await fetchData()
      } else {
        setSendingStatus("error")
        setSendError(data.error || "Failed to send payment")
        toast({ title: "Send Failed", description: data.error || "Failed", variant: "destructive" })
      }
    } catch {
      setSendingStatus("error")
      setSendError("Network error. Please try again.")
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    }
  }

  const openSendDialog = (payout: PayoutItem) => {
    setSendingPayout(payout)
    setSendingStatus("idle")
    setSendError("")
    setSendDialogOpen(true)
  }

  const handleSendSelected = async () => {
    const selected = Array.from(selectedPayouts)
    if (selected.length === 0) return
    const selectedTotal = selected.reduce((sum, id) => {
      const p = [...pendingPayouts, ...recentPayouts].find(pp => pp._id === id)
      return sum + (p?.sellerAmount || 0)
    }, 0)
    const confirmed = window.confirm(
      `Send RWF ${selectedTotal.toLocaleString()} to ${selected.length} selected seller(s)?`
    )
    if (!confirmed) return

    let sent = 0
    let failed = 0
    for (const payoutId of selected) {
      try {
        const res = await fetch("/api/payouts/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payoutId }),
        })
        if (res.ok) sent++
        else failed++
      } catch {
        failed++
      }
    }
    toast({
      title: "Bulk Send Complete",
      description: `Sent: ${sent}, Failed: ${failed}`,
      variant: failed > 0 ? "destructive" : "default",
    })
    setSelectedPayouts(new Set())
    await fetchData()
  }

  const handleSendAllPending = async () => {
    if (pendingPayouts.length === 0) return
    const confirmed = window.confirm(
      `Send RWF ${pendingPayouts.reduce((s, p) => s + p.sellerAmount, 0).toLocaleString()} to ${pendingPayouts.length} sellers?`
    )
    if (!confirmed) return

    let sent = 0
    let failed = 0
    for (const payout of pendingPayouts) {
      if (!payout.sellerPhone) { failed++; continue }
      try {
        const res = await fetch("/api/payouts/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payoutId: payout._id }),
        })
        if (res.ok) sent++
        else failed++
      } catch {
        failed++
      }
    }
    toast({
      title: "Bulk Send Complete",
      description: `Sent: ${sent}, Failed: ${failed}`,
      variant: failed > 0 ? "destructive" : "default",
    })
    setSelectedPayouts(new Set())
    await fetchData()
  }

  const togglePayoutSelection = (id: string) => {
    setSelectedPayouts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedPayouts.size === displayPayouts.filter(p => p.status === "pending").length && selectedPayouts.size > 0) {
      setSelectedPayouts(new Set())
    } else {
      setSelectedPayouts(new Set(displayPayouts.filter(p => p.status === "pending").map(p => p._id)))
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-RW", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    } catch { return dateStr }
  }

  const getDisplayPayouts = () => {
    if (tab === "pending") return pendingPayouts
    if (tab === "paid") return recentPayouts.filter(p => p.status === "paid")
    return recentPayouts
  }

  const displayPayouts = getDisplayPayouts()

  const sortedSellers = [...sellers].sort((a, b) => {
    const aVal = a[sortField] ?? 0
    const bVal = b[sortField] ?? 0
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
  })

  const handleViewSellerDetails = async (seller: SellerBreakdownItem) => {
    setSelectedSeller(seller)
    setSellerDetailOpen(true)
    setSellerDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/commissions/sellers?sellerId=${seller.sellerId}`)
      const data = await res.json()
      if (res.ok) setSellerDetailPayouts(data.payouts || [])
    } catch {
      console.error("Failed to fetch seller details")
    } finally {
      setSellerDetailLoading(false)
    }
  }

  const toggleSort = (field: keyof SellerBreakdownItem) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  const SortIcon = ({ field }: { field: keyof SellerBreakdownItem }) => {
    if (sortField !== field) return null
    return sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />
  }

  const totalPendingAmount = pendingPayouts.reduce((s, p) => s + p.sellerAmount, 0)
  const totalSellerCount = new Set(recentPayouts.filter(p => p.status === "paid").map(p => p.sellerId)).size

  // Calculate wallet balance (total commission collected from paid orders + paid bookings)
  const walletBalance = (stats?.paidCommission || 0) + (bookingStats?.paidRevenue || 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-600 font-medium">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="mt-4">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Percent className="h-5 w-5 text-blue-600" />
            </div>
            Commission & Wallet Oversight
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Full platform financial management — <strong>{commissionPct}%</strong> commission on all sales + booking revenue
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedPayouts.size > 0 && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSendSelected}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send Selected ({selectedPayouts.size})
            </Button>
          )}
          {pendingPayouts.length > 0 && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSendAllPending}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send All Pending (RWF {totalPendingAmount.toLocaleString()})
            </Button>
          )}
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { setWalletActionAmount(""); setWalletActionPhone(""); setWalletActionDesc(""); setWalletActionRef(""); setWalletResult(null); setDepositOpen(true) }}
          >
            <Banknote className="h-3.5 w-3.5 mr-1.5" />
            Deposit
          </Button>
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => { setWalletActionAmount(""); setWalletActionPhone(""); setWalletActionName(""); setWalletActionDesc(""); setWalletResult(null); setDirectSendOpen(true) }}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Direct Send
          </Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => { setWalletActionAmount(""); setWalletActionPhone(""); setWalletActionName(""); setWalletActionDesc(""); setWalletResult(null); setWithdrawOpen(true) }}
          >
            <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
            Withdraw
          </Button>
          <Button variant="outline" size="sm" onClick={() => { fetchData(); if (tab === "bookings") fetchBookings() }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-blue-50 via-white to-white">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Super Admin Wallet Balance</p>
                <p className="text-2xl font-bold text-blue-600">
                  RWF {walletBalance.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-blue-200" />
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Product Sales Commission</p>
                <p className="text-2xl font-bold text-green-600">
                  RWF {(stats?.paidCommission || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-blue-200" />
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Booking Revenue</p>
                <p className="text-2xl font-bold text-purple-600">
                  RWF {(bookingStats?.paidRevenue || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-blue-200" />
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Awaiting Distribution</p>
                <p className="text-2xl font-bold text-yellow-600">
                  RWF {((stats?.pendingCommission || 0) + (bookingStats?.pendingRevenue || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IntouchPay Gateway Balance */}
      <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-emerald-50 via-white to-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Landmark className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-700">IntouchPay Account Balance</p>
                  {gatewayBalance.loading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500">Live balance from the IntouchPay payment gateway</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${gatewayBalance.success ? "text-emerald-600" : "text-gray-400"}`}>
                {gatewayBalance.loading ? (
                  <span className="text-gray-300">...</span>
                ) : gatewayBalance.success ? (
                  `RWF ${gatewayBalance.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                ) : (
                  "N/A"
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchGatewayBalance}
                className="text-xs text-gray-400 hover:text-emerald-600 mt-1"
                disabled={gatewayBalance.loading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${gatewayBalance.loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Activity Summary */}
      {walletTxnStats && (
        <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-gray-50 via-white to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <p className="text-sm font-semibold text-gray-700">Wallet Activity</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setWalletTxnOpen(true)} className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                View History
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">Deposits</p>
                <p className="text-lg font-bold text-emerald-600">RWF {walletTxnStats.totalDeposits?.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{walletTxnStats.deposits?.count || 0} transactions</p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-xs text-gray-500">Direct Sends</p>
                <p className="text-lg font-bold text-purple-600">RWF {walletTxnStats.totalDirectSends?.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{walletTxnStats.directSends?.count || 0} transactions</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Withdrawals</p>
                <p className="text-lg font-bold text-red-600">RWF {walletTxnStats.totalWithdrawals?.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{walletTxnStats.withdrawals?.count || 0} transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Config Card */}
      <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-orange-50 via-white to-white">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Percent className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Global Commission Rate</p>
                <p className="text-xs text-gray-500">
                  Current rate: <strong className="text-orange-600">{commissionPct}%</strong>
                  {commissionPct !== defaultCommissionPct && (
                    <span className="text-gray-400 ml-1">(default {defaultCommissionPct}%)</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionInput}
                  onChange={(e) => setCommissionInput(e.target.value)}
                  className="w-20 text-center border-orange-300 focus:border-orange-500"
                />
                <span className="text-sm font-medium text-gray-600">%</span>
              </div>
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleSaveCommission}
                disabled={savingCommission || commissionInput === String(commissionPct)}
              >
                {savingCommission ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
            tab === "all" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          All Payouts ({recentPayouts.length})
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
            tab === "pending" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Pending ({pendingPayouts.length})
        </button>
        <button
          onClick={() => setTab("paid")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
            tab === "paid" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Paid ({recentPayouts.filter(p => p.status === "paid").length})
        </button>
        <button
          onClick={() => setTab("sellers")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
            tab === "sellers" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Store className="h-3.5 w-3.5" />
          Sellers ({sellers.length})
        </button>
        <button
          onClick={() => setTab("bookings")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
            tab === "bookings" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Bookings ({bookings.length})
        </button>
        <button
          onClick={() => setTab("withdrawals")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
            tab === "withdrawals" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Wallet className="h-3.5 w-3.5" />
          Withdrawals ({withdrawals.length})
        </button>
      </div>

      {/* Product Payouts Table */}
      {tab !== "bookings" && tab !== "withdrawals" && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-0">
            {displayPayouts.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No payouts found</h3>
                <p className="text-sm text-gray-500">No commission payouts match this filter yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Table Header - Desktop */}
                <div className="hidden md:grid md:grid-cols-12 gap-3 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="md:col-span-1 flex items-center">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded transition-colors" title="Select all pending">
                      {selectedPayouts.size > 0 ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                  <div className="md:col-span-2">Seller</div>
                  <div className="md:col-span-2">Item</div>
                  <div className="md:col-span-2">Commission</div>
                  <div className="md:col-span-2">Status</div>
                  <div className="md:col-span-3 text-right">Actions</div>
                </div>

                {displayPayouts.map((payout) => (
                  <div
                    key={payout._id}
                    className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 md:px-6 py-4 hover:bg-gray-50 transition-colors ${selectedPayouts.has(payout._id) ? 'bg-blue-50' : ''}`}
                  >
                    <div className="md:col-span-1 flex items-center">
                      <button
                        onClick={() => togglePayoutSelection(payout._id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        disabled={payout.status !== "pending"}
                      >
                        {selectedPayouts.has(payout._id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className={`h-4 w-4 ${payout.status === "pending" ? "text-gray-400" : "text-gray-200"}`} />
                        )}
                      </button>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-900">{payout.sellerName}</p>
                      <button
                        onClick={() => copyToClipboard(payout.sellerPhone, `phone-${payout._id}`)}
                        className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <Smartphone className="h-3 w-3" />
                        {payout.sellerPhone || "No phone"}
                        {copiedField === `phone-${payout._id}` ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-700 truncate max-w-[180px]" title={payout.itemName}>{payout.itemName}</p>
                      <p className="text-xs text-gray-400">RWF {payout.itemTotal.toLocaleString()}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-semibold text-green-600">
                        RWF {payout.commissionAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">{payout.commissionPercentage}% | Seller: RWF {payout.sellerAmount.toLocaleString()}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Badge className={
                        payout.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : payout.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }>
                        {payout.status === "paid" ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Paid</>
                        ) : payout.status === "cancelled" ? (
                          <><AlertTriangle className="h-3 w-3 mr-1" /> Cancelled</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" /> Pending</>
                        )}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(payout.createdAt)}</p>
                    </div>
                    <div className="md:col-span-3 flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPayout(payout)} title="View details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {payout.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-300 hover:bg-green-50 text-xs"
                            onClick={() => handleMarkPaid(payout._id)}
                            disabled={payingPayout === payout._id}
                          >
                            {payingPayout === payout._id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            )}
                            Mark
                          </Button>
                          {payout.sellerPhone && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-xs"
                              onClick={() => openSendDialog(payout)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Send
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sellers Breakdown */}
      {tab === "sellers" && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-0">
            {sellersLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : sellers.length === 0 ? (
              <div className="text-center py-16">
                <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No sellers found</h3>
                <p className="text-sm text-gray-500">No seller commission data is available yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Desktop header */}
                <div className="hidden md:grid md:grid-cols-12 gap-3 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => toggleSort("sellerName")} className="md:col-span-2 text-left flex items-center gap-1 hover:text-gray-700">
                    Seller <SortIcon field="sellerName" />
                  </button>
                  <button onClick={() => toggleSort("totalItems")} className="md:col-span-1 text-right flex items-center justify-end gap-1 hover:text-gray-700">
                    Items <SortIcon field="totalItems" />
                  </button>
                  <button onClick={() => toggleSort("totalItemAmount")} className="md:col-span-2 text-right flex items-center justify-end gap-1 hover:text-gray-700">
                    Volume <SortIcon field="totalItemAmount" />
                  </button>
                  <button onClick={() => toggleSort("totalCommission")} className="md:col-span-2 text-right flex items-center justify-end gap-1 hover:text-gray-700">
                    Commission <SortIcon field="totalCommission" />
                  </button>
                  <button onClick={() => toggleSort("totalSellerAmount")} className="md:col-span-2 text-right flex items-center justify-end gap-1 hover:text-gray-700">
                    Seller Earned <SortIcon field="totalSellerAmount" />
                  </button>
                  <div className="md:col-span-3 text-right">Status / Last Payout</div>
                </div>

                {sortedSellers.map((seller) => (
                  <div
                    key={seller.sellerId}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 md:px-6 py-4 hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => handleViewSellerDetails(seller)}
                  >
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        {seller.sellerName}
                      </p>
                      <p className="text-xs text-gray-500">{seller.sellerPhone || "No phone"}</p>
                    </div>
                    <div className="md:col-span-1 text-right">
                      <p className="text-sm font-medium text-gray-900">{seller.totalItems}</p>
                    </div>
                    <div className="md:col-span-2 text-right">
                      <p className="text-sm font-medium text-gray-900">RWF {seller.totalItemAmount.toLocaleString()}</p>
                    </div>
                    <div className="md:col-span-2 text-right">
                      <p className="text-sm font-semibold text-green-600">RWF {seller.totalCommission.toLocaleString()}</p>
                    </div>
                    <div className="md:col-span-2 text-right">
                      <p className="text-sm font-semibold text-blue-600">RWF {seller.totalSellerAmount.toLocaleString()}</p>
                    </div>
                    <div className="md:col-span-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {seller.pendingCount > 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                            {seller.pendingCount} pending
                          </span>
                        )}
                        {seller.paidCount > 0 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                            {seller.paidCount} paid
                          </span>
                        )}
                      </div>
                      {seller.lastPayoutDate && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Last: {formatDate(seller.lastPayoutDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bookings Tab */}
      {tab === "bookings" && (
        <div className="space-y-4">
          {/* Booking Stats */}
          {bookingStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 font-medium">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{bookingStats.totalBookings}</p>
                  <p className="text-xs text-gray-400">RWF {bookingStats.totalRevenue.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 font-medium">Paid Bookings</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{bookingStats.paidBookings}</p>
                  <p className="text-xs text-gray-400">RWF {bookingStats.paidRevenue.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 font-medium">Pending Payment</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{bookingStats.pendingBookings}</p>
                  <p className="text-xs text-gray-400">RWF {bookingStats.pendingRevenue.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 font-medium">Booking Revenue (Wallet)</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">RWF {bookingStats.paidRevenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Available for vet payouts</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Bookings List */}
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-0">
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
                  <p className="text-sm text-gray-500">No bookings have been made yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Desktop header */}
                  <div className="hidden md:grid md:grid-cols-12 gap-3 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="md:col-span-2">Customer</div>
                    <div className="md:col-span-2">Service</div>
                    <div className="md:col-span-2">Date/Time</div>
                    <div className="md:col-span-1">Amount</div>
                    <div className="md:col-span-2">Status</div>
                    <div className="md:col-span-3 text-right">Actions</div>
                  </div>

                  {bookings.map((booking) => (
                    <div
                      key={booking._id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 md:px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-gray-900">{booking.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          {booking.phone}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-700 truncate max-w-[160px]">{booking.service}</p>
                        <p className="text-xs text-gray-400">{booking.animalCount}x {booking.animalType}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-700">{booking.date}</p>
                        <p className="text-xs text-gray-400">{booking.timeSlot}</p>
                      </div>
                      <div className="md:col-span-1">
                        <p className="text-sm font-semibold text-gray-900">RWF {booking.servicePrice?.toLocaleString()}</p>
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={
                            booking.paymentStatus === "completed"
                              ? "bg-green-100 text-green-800"
                              : booking.paymentStatus === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }>
                            {booking.paymentStatus === "completed" ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Paid</>
                            ) : booking.paymentStatus === "failed" ? (
                              <><AlertTriangle className="h-3 w-3 mr-1" /> Failed</>
                            ) : (
                              <><Clock className="h-3 w-3 mr-1" /> Pending</>
                            )}
                          </Badge>
                          <Badge variant="outline" className={
                            booking.paymentMethod === "pesapal"
                              ? "border-indigo-200 text-indigo-700 bg-indigo-50"
                              : "border-green-200 text-green-700 bg-green-50"
                          }>
                            {booking.paymentMethod === "pesapal" ? (
                              <><CreditCard className="h-3 w-3 mr-1" /> Card</>
                            ) : (
                              <><Smartphone className="h-3 w-3 mr-1" /> Mobile</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(booking.createdAt)}</p>
                      </div>
                      <div className="md:col-span-3 flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(booking)} title="View details">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Withdrawals Tab */}
      {tab === "withdrawals" && (
        <div className="space-y-4">
          {/* Withdrawal Stats */}
          {withdrawalStats && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-orange-50 via-white to-white">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 font-medium">Pending Withdrawals</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{withdrawalStats.pending}</p>
                  <p className="text-xs text-gray-400">RWF {withdrawalStats.pendingAmount?.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-blue-50 via-white to-white">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 font-medium">Approved</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{withdrawalStats.approved}</p>
                  <p className="text-xs text-gray-400">RWF {withdrawalStats.approvedAmount?.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-green-50 via-white to-white">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{withdrawalStats.completed}</p>
                  <p className="text-xs text-gray-400">RWF {withdrawalStats.completedAmount?.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 font-medium">Total Withdrawn</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    RWF {((withdrawalStats.completedAmount || 0) + (withdrawalStats.approvedAmount || 0)).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Withdrawals List */}
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-0">
              {withdrawalsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-16">
                  <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No withdrawals requested</h3>
                  <p className="text-sm text-gray-500">Sellers haven't requested any withdrawals yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Desktop header */}
                  <div className="hidden md:grid md:grid-cols-12 gap-3 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="md:col-span-2">Seller</div>
                    <div className="md:col-span-1">Amount</div>
                    <div className="md:col-span-2">Status</div>
                    <div className="md:col-span-2">Date</div>
                    <div className="md:col-span-2">Note</div>
                    <div className="md:col-span-3 text-right">Actions</div>
                  </div>

                  {withdrawals.map((w: any) => (
                    <div
                      key={w._id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 md:px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-gray-900">{w.sellerName}</p>
                        <p className="text-xs text-gray-500">{w.sellerPhone}</p>
                      </div>
                      <div className="md:col-span-1">
                        <p className="text-sm font-semibold text-blue-600">RWF {w.amount?.toLocaleString()}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Badge className={
                          w.status === "completed" ? "bg-green-100 text-green-800" :
                          w.status === "approved" ? "bg-blue-100 text-blue-800" :
                          w.status === "rejected" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }>
                          {w.status === "completed" ? <><CheckCircle className="h-3 w-3 mr-1" /> Completed</> :
                           w.status === "approved" ? <><CheckCircle className="h-3 w-3 mr-1" /> Approved</> :
                           w.status === "rejected" ? <><AlertTriangle className="h-3 w-3 mr-1" /> Rejected</> :
                           <><Clock className="h-3 w-3 mr-1" /> Pending</>}
                        </Badge>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-700">{formatDate(w.createdAt)}</p>
                        {w.processedAt && (
                          <p className="text-xs text-gray-400">Processed: {formatDate(w.processedAt)}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-700 truncate max-w-[160px]">{w.note || w.adminNote || "—"}</p>
                      </div>
                      <div className="md:col-span-3 flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedWithdrawal(w)
                          setWithdrawalDetailOpen(true)
                        }} title="View details">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                        {w.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-xs"
                              onClick={() => handleApproveWithdrawal(w._id, true)}
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Approve & Send
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                              onClick={() => handleRejectWithdrawal(w._id)}
                            >
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Seller Detail Dialog */}
      <Dialog open={sellerDetailOpen} onOpenChange={(open) => { if (!open) setSellerDetailOpen(false) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedSeller && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-gray-500" />
                  {selectedSeller.sellerName} — Payout Details
                </DialogTitle>
                <DialogDescription>
                  Phone: {selectedSeller.sellerPhone} · {selectedSeller.totalItems} items sold ·
                  RWF {selectedSeller.totalItemAmount.toLocaleString()} total sales
                </DialogDescription>
              </DialogHeader>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Total Sales</p>
                  <p className="text-lg font-bold text-gray-900">RWF {selectedSeller.totalItemAmount.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Commission Paid</p>
                  <p className="text-lg font-bold text-green-600">RWF {selectedSeller.totalCommission.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Seller Earned</p>
                  <p className="text-lg font-bold text-blue-600">RWF {selectedSeller.totalSellerAmount.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Items Sold</p>
                  <p className="text-lg font-bold text-gray-900">{selectedSeller.totalItems}</p>
                </div>
              </div>

              {/* Payout history */}
              <h4 className="text-sm font-semibold text-gray-900 mt-4 mb-2">Payout History</h4>
              {sellerDetailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : sellerDetailPayouts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No payouts found for this seller.</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                  {sellerDetailPayouts.map((payout) => (
                    <div key={payout._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{payout.itemName}</p>
                        <p className="text-xs text-gray-500">{formatDate(payout.createdAt)}</p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <Badge className={payout.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {payout.status === "paid" ? <><CheckCircle className="h-3 w-3 mr-1" /> Paid</> : <><Clock className="h-3 w-3 mr-1" /> Pending</>}
                        </Badge>
                        <p className="text-sm font-semibold text-blue-600 mt-0.5">RWF {payout.sellerAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Money Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={(open) => { if (!open) setSendDialogOpen(false) }}>
        <DialogContent className="max-w-md">
          {sendingPayout && sendingStatus === "idle" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-500" />
                  Send Payment to Seller
                </DialogTitle>
                <DialogDescription>
                  This will send money directly to the seller&apos;s mobile money account via IntouchPay
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Seller:</span>
                    <span className="font-medium">{sendingPayout.sellerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium text-blue-700">{sendingPayout.sellerPhone}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Item:</span>
                    <span className="font-medium">{sendingPayout.itemName}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">Amount to Send:</span>
                    <span className="text-xl font-bold text-blue-600">
                      RWF {sendingPayout.sellerAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                  <p className="font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Confirm before sending
                  </p>
                  <p className="mt-1">This will send money via IntouchPay mobile money to the seller. Verify the phone number is correct before proceeding.</p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSendMoney}>
                  <Send className="h-4 w-4 mr-2" />
                  Send RWF {sendingPayout.sellerAmount.toLocaleString()}
                </Button>
              </DialogFooter>
            </>
          )}

          {sendingStatus === "sending" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Sending Payment...</h3>
              <p className="text-sm text-gray-500 mt-1">
                Sending RWF {sendingPayout?.sellerAmount.toLocaleString()} to {sendingPayout?.sellerName}
              </p>
            </div>
          )}

          {sendingStatus === "success" && (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Sent Successfully!</h3>
              <p className="text-sm text-gray-500 mt-1">
                RWF {sendingPayout?.sellerAmount.toLocaleString()} sent to {sendingPayout?.sellerName}
              </p>
              <Button className="mt-6" onClick={() => { setSendDialogOpen(false); fetchData() }}>Done</Button>
            </div>
          )}

          {sendingStatus === "error" && (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Failed</h3>
              <p className="text-sm text-red-500 mt-1">{sendError || "Could not send payment"}</p>
              <div className="flex justify-center gap-3 mt-6">
                <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Close</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSendMoney}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payout Detail Dialog */}
      <Dialog open={!!selectedPayout} onOpenChange={(open) => !open && setSelectedPayout(null)}>
        <DialogContent className="max-w-md">
          {selectedPayout && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gray-500" />
                  Payout Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Seller:</span>
                    <span className="font-medium">{selectedPayout.sellerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Item:</span>
                    <span className="font-medium">{selectedPayout.itemName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Order Total:</span>
                    <span className="font-medium">RWF {selectedPayout.itemTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Commission ({selectedPayout.commissionPercentage}%):</span>
                    <span className="font-medium text-green-600">- RWF {selectedPayout.commissionAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Seller Payout:</span>
                    <span className="font-bold text-blue-600">+ RWF {selectedPayout.sellerAmount.toLocaleString()}</span>
                  </div>
                </div>

                {selectedPayout.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => { setSelectedPayout(null); handleMarkPaid(selectedPayout._id) }}
                      disabled={payingPayout === selectedPayout._id}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Paid
                    </Button>
                    {selectedPayout.sellerPhone && (
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => { setSelectedPayout(null); openSendDialog(selectedPayout) }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Money
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdrawal Detail Dialog */}
      <Dialog open={withdrawalDetailOpen} onOpenChange={(open) => { if (!open) setWithdrawalDetailOpen(false) }}>
        <DialogContent className="max-w-md">
          {selectedWithdrawal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-gray-500" />
                  Withdrawal Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  selectedWithdrawal.status === "completed" ? "bg-green-50 border-green-200" :
                  selectedWithdrawal.status === "approved" ? "bg-blue-50 border-blue-200" :
                  selectedWithdrawal.status === "rejected" ? "bg-red-50 border-red-200" :
                  "bg-yellow-50 border-yellow-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedWithdrawal.status === "completed" ? (
                        <><CheckCircle className="h-5 w-5 text-green-600" /><span className="font-semibold text-green-800">Completed</span></>
                      ) : selectedWithdrawal.status === "approved" ? (
                        <><CheckCircle className="h-5 w-5 text-blue-600" /><span className="font-semibold text-blue-800">Approved</span></>
                      ) : selectedWithdrawal.status === "rejected" ? (
                        <><AlertTriangle className="h-5 w-5 text-red-600" /><span className="font-semibold text-red-800">Rejected</span></>
                      ) : (
                        <><Clock className="h-5 w-5 text-yellow-600" /><span className="font-semibold text-yellow-800">Pending</span></>
                      )}
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      RWF {selectedWithdrawal.amount?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Seller</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium">{selectedWithdrawal.sellerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium">{selectedWithdrawal.sellerPhone}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Requested:</span>
                    <span className="font-medium">{formatDate(selectedWithdrawal.createdAt)}</span>
                  </div>
                  {selectedWithdrawal.processedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Processed:</span>
                      <span className="font-medium">{formatDate(selectedWithdrawal.processedAt)}</span>
                    </div>
                  )}
                </div>

                {selectedWithdrawal.note && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Seller Note</h4>
                    <p className="text-sm text-gray-600">{selectedWithdrawal.note}</p>
                  </div>
                )}

                {selectedWithdrawal.adminNote && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Admin Note</h4>
                    <p className="text-sm text-gray-600">{selectedWithdrawal.adminNote}</p>
                  </div>
                )}

                {selectedWithdrawal.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => { setWithdrawalDetailOpen(false); handleApproveWithdrawal(selectedWithdrawal._id, true) }}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Approve & Send
                    </Button>
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() => { setWithdrawalDetailOpen(false); handleRejectWithdrawal(selectedWithdrawal._id) }}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          {selectedBooking && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  Booking Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg border ${
                  selectedBooking.paymentStatus === "completed"
                    ? "bg-green-50 border-green-200"
                    : selectedBooking.paymentStatus === "failed"
                    ? "bg-red-50 border-red-200"
                    : "bg-yellow-50 border-yellow-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedBooking.paymentStatus === "completed" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : selectedBooking.paymentStatus === "failed" ? (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                      <span className="font-semibold capitalize">{selectedBooking.paymentStatus}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      RWF {selectedBooking.servicePrice?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Customer</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium">{selectedBooking.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium">{selectedBooking.phone}</span>
                  </div>
                  {selectedBooking.email && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium">{selectedBooking.email}</span>
                    </div>
                  )}
                </div>

                {/* Service Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Service</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service:</span>
                    <span className="font-medium">{selectedBooking.service}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Animal:</span>
                    <span className="font-medium">{selectedBooking.animalCount}x {selectedBooking.animalType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium">{selectedBooking.date}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Time:</span>
                    <span className="font-medium">{selectedBooking.timeSlot}</span>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Method:</span>
                    <span className="font-medium flex items-center gap-1.5">
                      {selectedBooking.paymentMethod === "pesapal" ? (
                        <><CreditCard className="h-3.5 w-3.5 text-indigo-500" /> Card (Pesapal)</>
                      ) : (
                        <><Smartphone className="h-3.5 w-3.5 text-green-500" /> Mobile Money (IntouchPay)</>
                      )}
                    </span>
                  </div>
                  {selectedBooking.paymentMethod === "pesapal" ? (
                    <>
                      {selectedBooking.pesapalOrderTrackingId && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Pesapal Tracking ID:</span>
                          <span className="font-medium text-xs">{selectedBooking.pesapalOrderTrackingId}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {selectedBooking.mobileMoneyPhone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Paid from:</span>
                          <span className="font-medium">{selectedBooking.mobileMoneyPhone}</span>
                        </div>
                      )}
                      {selectedBooking.intouchTransactionId && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Transaction ID:</span>
                          <span className="font-medium text-xs">{selectedBooking.intouchTransactionId}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Created:</span>
                    <span className="font-medium">{formatDate(selectedBooking.createdAt)}</span>
                  </div>
                  {selectedBooking.paidAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Paid At:</span>
                      <span className="font-medium">{formatDate(selectedBooking.paidAt)}</span>
                    </div>
                  )}
                </div>

                <Button variant="outline" onClick={() => setSelectedBooking(null)} className="w-full">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet History Dialog */}
      <Dialog open={walletTxnOpen} onOpenChange={(open) => { if (!open) setWalletTxnOpen(false) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-500" />
              Wallet Transaction History
            </DialogTitle>
            <DialogDescription>
              All deposits, direct sends, and withdrawals recorded on the platform
            </DialogDescription>
          </DialogHeader>
          {walletTxns.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No wallet transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-3 px-2 py-3 text-xs font-medium text-gray-500 uppercase">
                <div className="md:col-span-3">Date</div>
                <div className="md:col-span-2">Type</div>
                <div className="md:col-span-2">Amount</div>
                <div className="md:col-span-3">Description</div>
                <div className="md:col-span-2">By</div>
              </div>
              {walletTxns.map((txn: any) => (
                <div key={txn._id} className="grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-3 px-2 py-3 hover:bg-gray-50 transition-colors">
                  <div className="md:col-span-3 text-sm text-gray-600">{formatDate(txn.createdAt)}</div>
                  <div className="md:col-span-2">
                    <Badge className={
                      txn.type === "deposit" ? "bg-emerald-100 text-emerald-800" :
                      txn.type === "direct_send" ? "bg-purple-100 text-purple-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {txn.type === "deposit" ? "Deposit" : txn.type === "direct_send" ? "Direct Send" : "Withdraw"}
                    </Badge>
                  </div>
                  <div className="md:col-span-2 text-sm font-semibold text-gray-900">RWF {txn.amount?.toLocaleString()}</div>
                  <div className="md:col-span-3 text-sm text-gray-600 truncate" title={txn.description}>{txn.description || "—"}</div>
                  <div className="md:col-span-2 text-sm text-gray-500">{txn.initiatedByName}</div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletTxnOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Action — Direct Send Dialog */}
      <Dialog open={directSendOpen} onOpenChange={(open) => { if (!open) setDirectSendOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-600" />
              Direct Send — Send Money to Any Phone
            </DialogTitle>
            <DialogDescription>
              Send money directly from the IntouchPay account to any mobile money number
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Recipient Phone Number *</label>
              <Input
                placeholder="e.g. 0784086021 or +250784086021"
                value={walletActionPhone}
                onChange={(e) => setWalletActionPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Recipient Name (optional)</label>
              <Input
                placeholder="e.g. John Farmer"
                value={walletActionName}
                onChange={(e) => setWalletActionName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Amount (RWF) *</label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 10000"
                value={walletActionAmount}
                onChange={(e) => setWalletActionAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description (optional)</label>
              <Input
                placeholder="e.g. Payment for veterinary consultation"
                value={walletActionDesc}
                onChange={(e) => setWalletActionDesc(e.target.value)}
              />
            </div>
            {walletResult && (
              <div className={`p-3 rounded-lg text-sm ${walletResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {walletResult.message}
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <p>💡 Money is sent via <strong>IntouchPay RequestDeposit</strong> to the recipient's mobile money. Ensure the phone number is correct.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDirectSendOpen(false); setWalletResult(null) }}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => handleWalletAction("direct_send")}
              disabled={walletProcessing || !walletActionPhone || !walletActionAmount}
            >
              {walletProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {walletProcessing ? "Sending..." : `Send RWF ${Number(walletActionAmount || 0).toLocaleString()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Action — Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={(open) => { if (!open) setDepositOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              Record Manual Deposit
            </DialogTitle>
            <DialogDescription>
              Record money that has been deposited into the platform wallet (e.g. bank transfer, cash)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Amount (RWF) *</label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 500000"
                value={walletActionAmount}
                onChange={(e) => setWalletActionAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Reference (optional)</label>
              <Input
                placeholder="e.g. Bank transfer ref #1234"
                value={walletActionRef}
                onChange={(e) => setWalletActionRef(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description (optional)</label>
              <Input
                placeholder="e.g. Top up from Equity Bank"
                value={walletActionDesc}
                onChange={(e) => setWalletActionDesc(e.target.value)}
              />
            </div>
            {walletResult && (
              <div className={`p-3 rounded-lg text-sm ${walletResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {walletResult.message}
              </div>
            )}
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
              <p>📋 This records a deposit for tracking purposes. The actual money must be deposited into the IntouchPay account separately (bank transfer, etc.).</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDepositOpen(false); setWalletResult(null) }}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleWalletAction("deposit")}
              disabled={walletProcessing || !walletActionAmount}
            >
              {walletProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Banknote className="h-4 w-4 mr-2" />}
              {walletProcessing ? "Recording..." : `Record RWF ${Number(walletActionAmount || 0).toLocaleString()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Action — Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={(open) => { if (!open) setWithdrawOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-red-600" />
              Withdraw from Platform Wallet
            </DialogTitle>
            <DialogDescription>
              Withdraw money from the IntouchPay account to your personal mobile money number
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Your Phone Number *</label>
              <Input
                placeholder="e.g. 0784086021"
                value={walletActionPhone}
                onChange={(e) => setWalletActionPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Amount (RWF) *</label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 50000"
                value={walletActionAmount}
                onChange={(e) => setWalletActionAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description (optional)</label>
              <Input
                placeholder="e.g. Monthly platform revenue withdrawal"
                value={walletActionDesc}
                onChange={(e) => setWalletActionDesc(e.target.value)}
              />
            </div>
            {walletResult && (
              <div className={`p-3 rounded-lg text-sm ${walletResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {walletResult.message}
              </div>
            )}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <p className="font-medium flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                This sends money from IntouchPay to your phone
              </p>
              <p className="mt-1">Money is sent via IntouchPay RequestDeposit. Ensure the phone number is correct. This will reduce the IntouchPay account balance.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setWithdrawOpen(false); setWalletResult(null) }}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => handleWalletAction("withdraw")}
              disabled={walletProcessing || !walletActionPhone || !walletActionAmount}
            >
              {walletProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
              {walletProcessing ? "Processing..." : `Withdraw RWF ${Number(walletActionAmount || 0).toLocaleString()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
