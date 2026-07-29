"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  Loader2, DollarSign, TrendingUp, CheckCircle, Clock, AlertTriangle,
  RefreshCw, FileText, Smartphone, Send, Wallet, ArrowUpRight, History, XCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/LanguageContext"

interface PayoutItem {
  _id: string
  orderId: string
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

interface PayoutStats {
  pending: number
  paid: number
  cancelled: number
  pendingAmount: number
  paidAmount: number
}

interface WithdrawalItem {
  _id: string
  amount: number
  status: "pending" | "approved" | "rejected" | "completed"
  note?: string
  adminNote?: string
  createdAt: string
  updatedAt: string
}

export default function SellerEarnings() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [payouts, setPayouts] = useState<PayoutItem[]>([])
  const [stats, setStats] = useState<PayoutStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Withdrawal state
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([])
  const [availableBalance, setAvailableBalance] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawNote, setWithdrawNote] = useState("")
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawHistoryOpen, setWithdrawHistoryOpen] = useState(false)
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [payoutRes, withdrawRes] = await Promise.all([
        fetch("/api/payouts"),
        fetch("/api/withdrawals"),
      ])
      const payoutData = await payoutRes.json()
      const withdrawData = await withdrawRes.json()
      if (payoutRes.ok) {
        setPayouts(payoutData.payouts || [])
        setStats(payoutData.stats)
      } else {
        setError(payoutData.error || "Failed to fetch earnings")
      }
      if (withdrawRes.ok) {
        setWithdrawals(withdrawData.withdrawals || [])
        setAvailableBalance(withdrawData.availableBalance || 0)
        setTotalEarned(withdrawData.totalEarned || 0)
      }
    } catch {
      setError("Failed to fetch earnings")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchWithdrawals = useCallback(async () => {
    setWithdrawalsLoading(true)
    try {
      const res = await fetch("/api/withdrawals")
      const data = await res.json()
      if (res.ok) {
        setWithdrawals(data.withdrawals || [])
        setAvailableBalance(data.availableBalance || 0)
      }
    } catch {
      console.error("Failed to fetch withdrawals")
    } finally {
      setWithdrawalsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount)
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid amount to withdraw", variant: "destructive" })
      return
    }
    if (amount > availableBalance) {
      toast({ title: "Insufficient balance", description: `Available: RWF ${availableBalance.toLocaleString()}`, variant: "destructive" })
      return
    }
    setWithdrawing(true)
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: withdrawNote }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: "✅ Withdrawal Submitted", description: data.message })
        setWithdrawDialogOpen(false)
        setWithdrawAmount("")
        setWithdrawNote("")
        await fetchData()
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit withdrawal", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    } finally {
      setWithdrawing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-RW", {
        year: "numeric", month: "short", day: "numeric",
      })
    } catch { return dateStr }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>
      case "pending": return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
      case "cancelled": return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>
      case "approved": return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>
      case "completed": return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>
      case "rejected": return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" /> Rejected</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const totalWithdrawn = withdrawals
    .filter(w => w.status === "completed" || w.status === "approved")
    .reduce((sum, w) => sum + w.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="mt-3">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            My Earnings
          </h2>
          <p className="text-sm text-gray-500">Track your sales earnings and withdraw available balance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchWithdrawals(); setWithdrawHistoryOpen(true) }}
          >
            <History className="h-3.5 w-3.5 mr-1" />
            Withdrawals
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-green-50 via-white to-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">Total Earned</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              RWF {totalEarned.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-blue-50 via-white to-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">Available to Withdraw</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              RWF {availableBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">Paid Out</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              RWF {(stats?.paidAmount || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">Pending</p>
            <p className="text-xl font-bold text-yellow-600 mt-1">
              RWF {(stats?.pendingAmount || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Button */}
      {availableBalance > 0 && (
        <Card className="border border-green-200 shadow-sm bg-green-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">You have RWF {availableBalance.toLocaleString()} available to withdraw</p>
                <p className="text-xs text-gray-500">Request a withdrawal to your mobile money account</p>
              </div>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setWithdrawDialogOpen(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Withdraw Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payouts List */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            Payout History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No earnings yet. Start selling to see your payouts here!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payouts.map((payout) => (
                <div key={payout._id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{payout.itemName}</p>
                      <p className="text-xs text-gray-500">{formatDate(payout.createdAt)}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <p className="text-sm font-semibold text-green-600">
                        RWF {payout.sellerAmount.toLocaleString()}
                      </p>
                      {getStatusBadge(payout.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-500" />
              Request Withdrawal
            </DialogTitle>
            <DialogDescription>
              Available balance: <strong>RWF {availableBalance.toLocaleString()}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Amount (RWF)</label>
              <Input
                type="number"
                min="1"
                max={availableBalance}
                placeholder={`Max: ${availableBalance.toLocaleString()}`}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Note (optional)</label>
              <Textarea
                placeholder="Any notes about this withdrawal..."
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                rows={2}
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <p className="font-medium flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Withdrawals require admin approval
              </p>
              <p className="mt-1">Your withdrawal request will be reviewed by an admin. Once approved, the money will be sent to your registered mobile money number.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || Number(withdrawAmount) <= 0}
            >
              {withdrawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {withdrawing ? "Submitting..." : `Withdraw RWF ${Number(withdrawAmount || 0).toLocaleString()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal History Dialog */}
      <Dialog open={withdrawHistoryOpen} onOpenChange={setWithdrawHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              Withdrawal History
            </DialogTitle>
          </DialogHeader>
          {withdrawalsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-8">
              <Send className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No withdrawal requests yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {withdrawals.map((w) => (
                <div key={w._id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">RWF {w.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{formatDate(w.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(w.status)}
                      {w.adminNote && <p className="text-xs text-gray-500 mt-0.5">{w.adminNote}</p>}
                    </div>
                  </div>
                  {w.note && <p className="text-xs text-gray-400 mt-1 ml-1">{w.note}</p>}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
