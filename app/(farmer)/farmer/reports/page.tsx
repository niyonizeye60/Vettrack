"use client"

import { useState, useEffect, useMemo } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileBarChart, Download, FileText, Printer, TrendingUp, TrendingDown, Scale, Sparkles, Wheat } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ReportData {
  range: { startDate: string; endDate: string }
  income: { milkSales: number; livestockSales: number; byProductSales: number; total: number }
  expenses: { inseminationCosts: number; veterinaryHealth: number; labourWages: number; livestockPurchases: number; feedWaterCosts: number; calfRearingCosts: number; total: number }
  netResult: number
  incomeLedger: { date: string; label: string; description: string; amount: number }[]
  expenseLedger: { date: string; label: string; description: string; amount: number }[]
  cashFlow: { weekStart: string; weekEnd: string; income: number; expense: number; net: number }[]
  feedWater: { totalFeedKg: number; totalFeedCost: number; totalWaterLiters: number; totalSaltKg: number; totalSaltCost: number; totalCost: number; costPerAnimalPerDay: number; costPerLitreMilk: number; foodTypesUsed: string[] }
}

type Preset = "weekly" | "monthly" | "quarterly" | "yearly" | "custom"

const pad = (n: number) => String(n).padStart(2, "0")
const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function getPresetRange(preset: Preset): { start: string; end: string } {
  const now = new Date()
  if (preset === "weekly") {
    const start = new Date(now); start.setDate(start.getDate() - 6)
    return { start: toStr(start), end: toStr(now) }
  }
  if (preset === "quarterly") {
    const q = Math.floor(now.getMonth() / 3)
    return { start: toStr(new Date(now.getFullYear(), q * 3, 1)), end: toStr(new Date(now.getFullYear(), q * 3 + 3, 0)) }
  }
  if (preset === "yearly") {
    return { start: toStr(new Date(now.getFullYear(), 0, 1)), end: toStr(new Date(now.getFullYear(), 11, 31)) }
  }
  // monthly (default)
  return { start: toStr(new Date(now.getFullYear(), now.getMonth(), 1)), end: toStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
}

const fmt = (n: number) => `RWF ${Math.round(n).toLocaleString()}`

export default function GeneralReportPage() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<ReportData | null>(null)
  const [preset, setPreset] = useState<Preset>("monthly")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [exporting, setExporting] = useState(false)

  const fetchReport = async (farmerId: string, start: string, end: string) => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/reports/general?farmerId=${farmerId}&startDate=${start}&endDate=${end}`)
      const data = await res.json()
      if (!data.error) setReport(data)
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setUser(userData)
      const range = getPresetRange("monthly")
      await fetchReport(userData._id.toString(), range.start, range.end)
      setLoading(false)
    }
    init()
  }, [])

  const handlePresetChange = (p: Preset) => {
    setPreset(p)
    if (p === "custom") return
    const range = getPresetRange(p)
    if (user) fetchReport(user._id.toString(), range.start, range.end)
  }

  const handleGenerateCustom = () => {
    if (!customStart || !customEnd || !user) return
    fetchReport(user._id.toString(), customStart, customEnd)
  }

  const netStatus: "profit" | "loss" | "even" = !report ? "even" : report.netResult > 0 ? "profit" : report.netResult < 0 ? "loss" : "even"

  const maxFlow = useMemo(() => {
    if (!report) return 1
    return Math.max(report.income.total, report.expenses.total, 1)
  }, [report])

  const exportToPDF = async () => {
    if (!report || !user) return
    setExporting(true)
    try {
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF("p", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()

      try {
        const logoImg = new Image()
        logoImg.crossOrigin = "anonymous"
        logoImg.src = "/logo/Vet print.png"
        await new Promise((resolve, reject) => { logoImg.onload = resolve; logoImg.onerror = reject })
        doc.addImage(logoImg, "PNG", 15, 6, 29, 20)
      } catch { }
      doc.setTextColor(17, 24, 39)
      doc.setFontSize(15)
      doc.setFont("helvetica", "bold")
      doc.text("Farm General Report", 51, 15)
      doc.setTextColor(75, 85, 99)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(`Period: ${report.range.startDate} to ${report.range.endDate}`, 51, 23)
      doc.setDrawColor(226, 232, 240)
      doc.line(0, 32, pageWidth, 32)

      doc.setTextColor(55, 65, 81)
      doc.setFontSize(9)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 40)
      doc.text(`Farmer: ${user?.name || "Unknown"}`, 15, 46)

      let y = 58
      doc.setFillColor(240, 253, 244)
      doc.setDrawColor(187, 247, 208)
      doc.rect(15, y, pageWidth - 30, 22, "FD")
      doc.setFontSize(10)
      doc.setTextColor(55, 65, 81)
      doc.text("TOTAL INCOME", 20, y + 9)
      doc.text("TOTAL EXPENSES", 20, y + 17)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(17, 24, 39)
      doc.text(fmt(report.income.total), pageWidth - 20, y + 9, { align: "right" })
      doc.text(fmt(report.expenses.total), pageWidth - 20, y + 17, { align: "right" })
      doc.setFont("helvetica", "normal")

      y += 30
      const isProfit = report.netResult > 0
      const isEven = report.netResult === 0
      doc.setFillColor(isEven ? 243 : isProfit ? 240 : 254, isEven ? 244 : isProfit ? 253 : 242, isEven ? 246 : isProfit ? 244 : 242)
      doc.rect(15, y, pageWidth - 30, 16, "F")
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(isEven ? 75 : isProfit ? 22 : 220, isEven ? 85 : isProfit ? 163 : 38, isEven ? 99 : isProfit ? 74 : 38)
      const label = isEven ? "BREAK EVEN" : isProfit ? "NET PROFIT" : "NET LOSS"
      doc.text(label, 20, y + 10)
      doc.text(isProfit || isEven ? fmt(report.netResult) : `(${fmt(Math.abs(report.netResult))})`, pageWidth - 20, y + 10, { align: "right" })
      doc.setFont("helvetica", "normal")

      y += 26
      doc.setTextColor(55, 65, 81)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("Profit & Loss Statement", 15, y)
      y += 8

      const plRows: [string, string][] = [
        ["INCOME", ""],
        ["  Milk Sales", fmt(report.income.milkSales)],
        ["  Livestock Sales", fmt(report.income.livestockSales)],
        ["  By-product Sales", fmt(report.income.byProductSales)],
        ["TOTAL INCOME", fmt(report.income.total)],
        ["EXPENSES", ""],
        ["  Insemination Costs", fmt(report.expenses.inseminationCosts)],
        ["  Veterinary & Health", fmt(report.expenses.veterinaryHealth)],
        ["  Labour / Wages", fmt(report.expenses.labourWages)],
        ["  Livestock Purchases", fmt(report.expenses.livestockPurchases)],
        ["  Feed & Water Costs", fmt(report.expenses.feedWaterCosts)],
        ["  Calf Rearing Costs", fmt(report.expenses.calfRearingCosts)],
        ["TOTAL EXPENSES", fmt(report.expenses.total)],
      ]

      doc.setFontSize(9)
      plRows.forEach(([label, value]) => {
        const isHeader = label === "INCOME" || label === "EXPENSES"
        const isTotal = label.startsWith("TOTAL")
        doc.setFont("helvetica", isHeader || isTotal ? "bold" : "normal")
        doc.setTextColor(isHeader ? 55 : 75, isHeader ? 65 : 85, isHeader ? 81 : 99)
        doc.text(label, 15, y)
        if (value) doc.text(value, pageWidth - 20, y, { align: "right" })
        if (isTotal) doc.line(15, y + 1.5, pageWidth - 15, y + 1.5)
        y += 7
      })

      // Footer
      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        const pw = doc.internal.pageSize.getWidth()
        const ph = doc.internal.pageSize.getHeight()
        doc.setFillColor(248, 250, 252); doc.rect(0, ph - 18, pw, 18, "F")
        doc.setDrawColor(226, 232, 240); doc.line(0, ph - 18, pw, ph - 18)
        doc.setFontSize(7); doc.setTextColor(107, 114, 128)
        doc.text(`NTDM Animal Hospital | Generated by: ${user?.name || "Unknown"}`, 15, ph - 7)
        doc.text(`Page ${page} of ${totalPages}`, pw - 15, ph - 7, { align: "right" })
      }

      doc.save(`farm-general-report-${report.range.startDate}-to-${report.range.endDate}.pdf`)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setExporting(false)
    }
  }

  const exportToExcel = async () => {
    if (!report) return
    setExporting(true)
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.utils.book_new()

      const summarySheet = XLSX.utils.aoa_to_sheet([
        ["Farm General Report", `${report.range.startDate} to ${report.range.endDate}`],
        [],
        ["INCOME", ""],
        ["Milk Sales", report.income.milkSales],
        ["Livestock Sales", report.income.livestockSales],
        ["By-product Sales", report.income.byProductSales],
        ["TOTAL INCOME", report.income.total],
        [],
        ["EXPENSES", ""],
        ["Insemination Costs", report.expenses.inseminationCosts],
        ["Veterinary & Health", report.expenses.veterinaryHealth],
        ["Labour / Wages", report.expenses.labourWages],
        ["Livestock Purchases", report.expenses.livestockPurchases],
        ["Feed & Water Costs", report.expenses.feedWaterCosts],
        ["Calf Rearing Costs", report.expenses.calfRearingCosts],
        ["TOTAL EXPENSES", report.expenses.total],
        [],
        ["NET PROFIT / (LOSS)", report.netResult],
      ])
      XLSX.utils.book_append_sheet(wb, summarySheet, "P&L Summary")

      const incomeSheet = XLSX.utils.json_to_sheet(report.incomeLedger.map(e => ({ Date: e.date, Source: e.label, Description: e.description, "Amount (RWF)": e.amount })))
      XLSX.utils.book_append_sheet(wb, incomeSheet, "Income Ledger")

      const expenseSheet = XLSX.utils.json_to_sheet(report.expenseLedger.map(e => ({ Date: e.date, Category: e.label, Description: e.description, "Amount (RWF)": e.amount })))
      XLSX.utils.book_append_sheet(wb, expenseSheet, "Expense Ledger")

      XLSX.writeFile(wb, `farm-general-report-${report.range.startDate}-to-${report.range.endDate}.xlsx`)
    } catch (err) {
      console.error("Excel export failed:", err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 bg-gray-200 rounded w-48" />
        <div className="h-4 bg-gray-200 rounded w-72 mt-2" />
      </div>
      <div className="h-10 bg-gray-200 rounded w-full max-w-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-32" />
          </div>
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('farmer.generalReport')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('farmer.generalReportDesc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="rounded-lg gap-2">
            <Printer className="h-4 w-4" /> {t('farmer.print')}
          </Button>
          <Button onClick={exportToExcel} disabled={exporting || !report} variant="outline" className="rounded-lg gap-2">
            <Download className="h-4 w-4" /> {t('farmer.exportExcel')}
          </Button>
          <Button onClick={exportToPDF} disabled={exporting || !report} className="bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2">
            <FileText className="h-4 w-4" /> {t('farmer.exportPDF')}
          </Button>
        </div>
      </div>

      {/* Date range filter */}
      <Card className="border border-gray-200 shadow-sm print:hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {(["weekly", "monthly", "quarterly", "yearly", "custom"] as Preset[]).map(p => (
              <Button
                key={p}
                size="sm"
                variant={preset === p ? "default" : "outline"}
                onClick={() => handlePresetChange(p)}
                className={preset === p ? "bg-green-600 hover:bg-green-700 text-white rounded-lg" : "rounded-lg"}
              >
                {t(`farmer.${p}`)}
              </Button>
            ))}
            {preset === "custom" && (
              <div className="flex flex-wrap items-center gap-2 ml-1">
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-auto" />
                <span className="text-gray-400 text-sm">{t('farmer.to')}</span>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-auto" />
                <Button size="sm" onClick={handleGenerateCustom} disabled={!customStart || !customEnd} className="bg-green-600 hover:bg-green-700 text-white rounded-lg">
                  {t('farmer.generateReport')}
                </Button>
              </div>
            )}
            {report && (
              <span className="text-xs text-gray-400 ml-auto">{report.range.startDate} → {report.range.endDate}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {generating || !report ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-8 bg-gray-200 rounded w-32" />
              </div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      ) : (
        <div id="report-printable">
          {/* Net result banner */}
          <Card className={`border shadow-sm mb-6 ${netStatus === "profit" ? "border-green-200 bg-green-50" : netStatus === "loss" ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className={`text-sm font-semibold uppercase tracking-wide ${netStatus === "profit" ? "text-green-700" : netStatus === "loss" ? "text-red-700" : "text-gray-600"}`}>
                    {netStatus === "profit" ? t('farmer.profit') : netStatus === "loss" ? t('farmer.loss') : t('farmer.breakEven')}
                  </p>
                  <h2 className={`text-3xl sm:text-4xl font-bold mt-1 ${netStatus === "profit" ? "text-green-700" : netStatus === "loss" ? "text-red-700" : "text-gray-700"}`}>
                    {netStatus === "loss" ? `(${fmt(Math.abs(report.netResult))})` : fmt(report.netResult)}
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 max-w-md">
                    {netStatus === "profit" ? t('farmer.profitMessage') : netStatus === "loss" ? t('farmer.lossMessage') : t('farmer.breakEvenMessage')}
                  </p>
                </div>
                <div className="w-full sm:w-64 space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{t('farmer.totalIncome')}</span><span>{fmt(report.income.total)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${(report.income.total / maxFlow) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{t('farmer.totalExpenses')}</span><span>{fmt(report.expenses.total)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${(report.expenses.total / maxFlow) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="pnl">
            <TabsList className="flex flex-wrap h-auto gap-1 print:hidden">
              <TabsTrigger value="pnl" className="flex items-center gap-1"><FileBarChart className="h-4 w-4" /> {t('farmer.tabPnl')}</TabsTrigger>
              <TabsTrigger value="income" className="flex items-center gap-1"><TrendingUp className="h-4 w-4" /> {t('farmer.tabIncomeLedger')}</TabsTrigger>
              <TabsTrigger value="expense" className="flex items-center gap-1"><TrendingDown className="h-4 w-4" /> {t('farmer.tabExpenseLedger')}</TabsTrigger>
              <TabsTrigger value="cashflow" className="flex items-center gap-1"><Scale className="h-4 w-4" /> {t('farmer.tabCashFlow')}</TabsTrigger>
              <TabsTrigger value="feedwater" className="flex items-center gap-1"><Wheat className="h-4 w-4" /> {t('farmer.tabFeedWater')}</TabsTrigger>
              <TabsTrigger value="herd" className="flex items-center gap-1"><Sparkles className="h-4 w-4" /> {t('farmer.tabHerdAssets')}</TabsTrigger>
            </TabsList>

            {/* P&L SUMMARY */}
            <TabsContent value="pnl">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{t('farmer.pnlStatement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('farmer.lineItem')}</TableHead>
                          <TableHead className="hidden sm:table-cell">{t('farmer.description')}</TableHead>
                          <TableHead className="text-right">{t('farmer.amount')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="bg-gray-50"><TableCell colSpan={3} className="font-bold text-gray-700">{t('farmer.income')}</TableCell></TableRow>
                        <TableRow>
                          <TableCell className="text-green-700">{t('farmer.milkSales')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">{t('farmer.milkSalesDesc')}</TableCell>
                          <TableCell className="text-right text-green-700 font-medium">{fmt(report.income.milkSales)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-green-700">{t('farmer.livestockSales')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">{t('farmer.livestockSalesDesc')}</TableCell>
                          <TableCell className="text-right text-green-700 font-medium">{fmt(report.income.livestockSales)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-green-700">{t('farmer.byProductSales')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">{t('farmer.byProductSalesDesc')}</TableCell>
                          <TableCell className="text-right text-green-700 font-medium">{fmt(report.income.byProductSales)}</TableCell>
                        </TableRow>
                        <TableRow className="border-t-2 border-gray-200">
                          <TableCell className="font-bold">{t('farmer.totalIncome')}</TableCell>
                          <TableCell className="hidden sm:table-cell" />
                          <TableCell className="text-right font-bold text-green-700">{fmt(report.income.total)}</TableCell>
                        </TableRow>

                        <TableRow className="bg-gray-50"><TableCell colSpan={3} className="font-bold text-gray-700 pt-4">{t('farmer.expensesHeader')}</TableCell></TableRow>
                        <TableRow>
                          <TableCell className="text-red-700">{t('farmer.inseminationCosts')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">{t('farmer.inseminationCostsDesc')}</TableCell>
                          <TableCell className="text-right text-red-700 font-medium">{fmt(report.expenses.inseminationCosts)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-red-700">{t('farmer.veterinaryHealth')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">{t('farmer.veterinaryHealthDesc')}</TableCell>
                          <TableCell className="text-right text-red-700 font-medium">{fmt(report.expenses.veterinaryHealth)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-red-700">{t('farmer.labourWages')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">{t('farmer.labourWagesDesc')}</TableCell>
                          <TableCell className="text-right text-red-700 font-medium">{fmt(report.expenses.labourWages)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-red-700">{t('farmer.livestockPurchases')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">{t('farmer.livestockPurchasesDesc')}</TableCell>
                          <TableCell className="text-right text-red-700 font-medium">{fmt(report.expenses.livestockPurchases)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-red-700">{t('farmer.feedWaterCosts')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">{t('farmer.feedWaterCostsDesc')}</TableCell>
                          <TableCell className="text-right text-red-700 font-medium">{fmt(report.expenses.feedWaterCosts)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-red-700">{t('farmer.calfRearingCosts')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">{t('farmer.calfRearingCostsDesc')}</TableCell>
                          <TableCell className="text-right text-red-700 font-medium">{fmt(report.expenses.calfRearingCosts)}</TableCell>
                        </TableRow>
                        <TableRow className="border-t-2 border-gray-200">
                          <TableCell className="font-bold">{t('farmer.totalExpenses')}</TableCell>
                          <TableCell className="hidden sm:table-cell" />
                          <TableCell className="text-right font-bold text-red-700">{fmt(report.expenses.total)}</TableCell>
                        </TableRow>

                        <TableRow className={netStatus === "profit" ? "bg-green-50" : netStatus === "loss" ? "bg-red-50" : "bg-gray-50"}>
                          <TableCell className={`font-bold text-base ${netStatus === "profit" ? "text-green-700" : netStatus === "loss" ? "text-red-700" : "text-gray-700"}`}>{t('farmer.netProfitLoss')}</TableCell>
                          <TableCell className="hidden sm:table-cell" />
                          <TableCell className={`text-right font-bold text-base ${netStatus === "profit" ? "text-green-700" : netStatus === "loss" ? "text-red-700" : "text-gray-700"}`}>
                            {netStatus === "loss" ? `(${fmt(Math.abs(report.netResult))})` : fmt(report.netResult)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* INCOME LEDGER */}
            <TabsContent value="income">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader><CardTitle className="text-lg">{t('farmer.tabIncomeLedger')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('farmer.date')}</TableHead>
                          <TableHead>{t('farmer.source')}</TableHead>
                          <TableHead>{t('farmer.description')}</TableHead>
                          <TableHead className="text-right">{t('farmer.amount')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.incomeLedger.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-400">{t('farmer.noIncomeRecorded')}</TableCell></TableRow>
                        ) : report.incomeLedger.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{e.date}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{e.label}</Badge></TableCell>
                            <TableCell className="text-sm text-gray-600">{e.description}</TableCell>
                            <TableCell className="text-right font-medium text-green-700">{fmt(e.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* EXPENSE LEDGER */}
            <TabsContent value="expense">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader><CardTitle className="text-lg">{t('farmer.tabExpenseLedger')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('farmer.date')}</TableHead>
                          <TableHead>{t('farmer.category')}</TableHead>
                          <TableHead>{t('farmer.description')}</TableHead>
                          <TableHead className="text-right">{t('farmer.amount')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.expenseLedger.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-400">{t('farmer.noExpensesRecorded')}</TableCell></TableRow>
                        ) : report.expenseLedger.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{e.date}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{e.label}</Badge></TableCell>
                            <TableCell className="text-sm text-gray-600">{e.description}</TableCell>
                            <TableCell className="text-right font-medium text-red-700">{fmt(e.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CASH FLOW */}
            <TabsContent value="cashflow">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader><CardTitle className="text-lg">{t('farmer.tabCashFlow')}</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {report.cashFlow.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">{t('farmer.noDataAvailable')}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={report.cashFlow.map(c => ({ week: c.weekStart.slice(5), income: c.income, expense: c.expense }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: any) => [`RWF ${Number(v).toLocaleString()}`, ""]} />
                        <Legend />
                        <Bar dataKey="income" fill="#16a34a" name={t('farmer.income')} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" fill="#dc2626" name={t('farmer.expensesHeader')} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('farmer.weekOf')}</TableHead>
                          <TableHead className="text-right">{t('farmer.income')}</TableHead>
                          <TableHead className="text-right">{t('farmer.expensesHeader')}</TableHead>
                          <TableHead className="text-right">{t('farmer.netCashFlow')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.cashFlow.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{c.weekStart} → {c.weekEnd}</TableCell>
                            <TableCell className="text-right text-green-700">{fmt(c.income)}</TableCell>
                            <TableCell className="text-right text-red-700">{fmt(c.expense)}</TableCell>
                            <TableCell className={`text-right font-medium ${c.net >= 0 ? "text-green-700" : "text-red-700"}`}>{c.net < 0 ? `(${fmt(Math.abs(c.net))})` : fmt(c.net)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FEED & WATER */}
            <TabsContent value="feedwater">
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <Card className="border border-gray-200 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      <p className="text-sm text-gray-500 font-medium">{t('farmer.totalFeedCost')}</p>
                      <h3 className="text-2xl font-bold text-orange-600 mt-2">{fmt(report.feedWater.totalFeedCost)}</h3>
                      <p className="text-xs text-gray-400 mt-1">{report.feedWater.totalFeedKg.toFixed(1)} kg</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      <p className="text-sm text-gray-500 font-medium">{t('farmer.totalSaltCost')}</p>
                      <h3 className="text-2xl font-bold text-orange-600 mt-2">{fmt(report.feedWater.totalSaltCost)}</h3>
                      <p className="text-xs text-gray-400 mt-1">{report.feedWater.totalSaltKg.toFixed(1)} kg</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      <p className="text-sm text-gray-500 font-medium">{t('farmer.totalFeedWaterCost')}</p>
                      <h3 className="text-2xl font-bold text-red-600 mt-2">{fmt(report.feedWater.totalCost)}</h3>
                      <p className="text-xs text-gray-400 mt-1">{t('farmer.includedInExpenses')}</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      <p className="text-sm text-gray-500 font-medium">{t('farmer.totalWaterConsumed')}</p>
                      <h3 className="text-2xl font-bold text-sky-600 mt-2">{report.feedWater.totalWaterLiters.toFixed(1)} L</h3>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      <p className="text-sm text-gray-500 font-medium">{t('farmer.costPerAnimalPerDay')}</p>
                      <h3 className="text-2xl font-bold text-gray-900 mt-2">{fmt(report.feedWater.costPerAnimalPerDay)}</h3>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      <p className="text-sm text-gray-500 font-medium">{t('farmer.costPerLitreMilk')}</p>
                      <h3 className="text-2xl font-bold text-gray-900 mt-2">{fmt(report.feedWater.costPerLitreMilk)}</h3>
                      <p className="text-xs text-gray-400 mt-1">{t('farmer.keyEfficiencyIndicator')}</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader><CardTitle className="text-base">{t('farmer.foodTypesUsed')}</CardTitle></CardHeader>
                  <CardContent>
                    {report.feedWater.foodTypesUsed.length === 0 ? (
                      <p className="text-gray-400 text-sm">{t('farmer.noDataAvailable')}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {report.feedWater.foodTypesUsed.map((f, i) => (
                          <Badge key={i} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{f}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* HERD ASSETS (placeholder, v2) */}
            <TabsContent value="herd">
              <Card className="border border-dashed border-gray-300 shadow-sm">
                <CardContent className="p-10 text-center">
                  <Sparkles className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-600">{t('farmer.herdAssetSummary')}</p>
                  <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">{t('farmer.herdAssetComingSoon')}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
