"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, Users, Calendar, Download, Eye } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

type ReportType = "users" | "appointments" | "performance" | "regional"

interface ReportsData {
  generatedAt: string
  stats: {
    totalFarmers: number
    totalDoctors: number
    activeFarmers: number
    activeDoctors: number
    newThisMonth: number
    growthPercentage: number
  }
  consultations: {
    total: number
    statusCounts: { pending: number; accepted: number; rejected: number; completed: number }
    typeCounts: Record<string, number>
    overdueCount: number
    items: Array<{ id: string; farmerName: string; district: string | null; doctorName: string; service: string | null; date: string | null; time: string | null; type: string | null; status: string }>
  }
  diseases: {
    total: number
    statusCounts: Record<string, number>
    items: Array<{ id: string; farmerName: string; district: string | null; diseaseName: string; status: string; diagnosedDate: string | null }>
  }
  tickets: {
    total: number
    open: number
    resolved: number
    unassigned: number
    items: Array<{ id: string; subject: string; requesterName: string; requesterRole: string; status: string; assignedToName: string | null; createdAt: string }>
  }
  performance: { completionRate: number; responseCompliance: number; ticketResolutionRate: number }
  byDistrict: Array<{ district: string; farmers: number; doctors: number; consultations: number; diseases: number }>
  users: { items: Array<{ id: string; name: string; role: string; district: string | null; status: string; createdAt: string }> }
}

export default function AdminReports() {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewingReport, setViewingReport] = useState<ReportType | null>(null)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [generateType, setGenerateType] = useState<ReportType>("users")
  const [generateFormat, setGenerateFormat] = useState<"pdf" | "csv" | "excel">("pdf")
  const [isExporting, setIsExporting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/reports")
      const json = await res.json()
      if (res.ok) setData(json)
    } catch (error) {
      console.error("Failed to load reports:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const reportMeta: Record<ReportType, { title: string; description: string; icon: any }> = {
    users: { title: t('admin.userActivityReport'), description: t('admin.userActivityDescription'), icon: Users },
    appointments: { title: t('admin.appointmentAnalytics'), description: t('admin.appointmentAnalyticsDescription'), icon: Calendar },
    performance: { title: t('admin.performanceMetrics'), description: t('admin.performanceMetricsDescription'), icon: TrendingUp },
    regional: { title: t('admin.regionalOverview'), description: t('admin.regionalOverviewDescription'), icon: BarChart3 },
  }

  // ---- PDF helpers ----
  const drawPdfHeader = (doc: any, title: string) => {
    doc.setTextColor(17, 24, 39)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 15, 20)
    doc.setTextColor(75, 85, 99)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Vettrack · ${t('admin.lastGenerated')}: ${data ? new Date(data.generatedAt).toLocaleString() : ""}`, 15, 28)
    doc.setDrawColor(226, 232, 240)
    doc.line(15, 34, 195, 34)
    return 46
  }

  const drawPdfLines = (doc: any, startY: number, lines: string[]) => {
    let yPos = startY
    doc.setTextColor(55, 65, 81)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    lines.forEach((line) => {
      if (yPos > 280) {
        doc.addPage()
        yPos = 20
      }
      doc.text(line, 15, yPos)
      yPos += 7
    })
    return yPos
  }

  const buildReportRows = (type: ReportType): { summary: [string, string][]; table: { headers: string[]; rows: string[][] } } => {
    if (!data) return { summary: [], table: { headers: [], rows: [] } }
    if (type === "users") {
      return {
        summary: [
          [t('admin.totalFarmers'), String(data.stats.totalFarmers)],
          [t('admin.totalDoctors'), String(data.stats.totalDoctors)],
          [t('admin.activeFarmers'), String(data.stats.activeFarmers)],
          [t('admin.activeDoctors'), String(data.stats.activeDoctors)],
          [t('admin.newRegistrations'), String(data.stats.newThisMonth)],
          [t('admin.growthRate'), `${data.stats.growthPercentage}%`],
        ],
        table: {
          headers: [t('common.name'), t('admin.role'), t('admin.district'), t('admin.status')],
          rows: data.users.items.map((u) => [u.name, u.role, u.district || "-", u.status]),
        },
      }
    }
    if (type === "appointments") {
      return {
        summary: [
          [t('admin.totalAppointments'), String(data.consultations.total)],
          [t('appointments.pending'), String(data.consultations.statusCounts.pending)],
          [t('appointments.accepted'), String(data.consultations.statusCounts.accepted)],
          [t('appointments.rejected'), String(data.consultations.statusCounts.rejected)],
          [t('appointments.completed'), String(data.consultations.statusCounts.completed)],
          [t('appointments.overdue'), String(data.consultations.overdueCount)],
        ],
        table: {
          headers: [t('appointments.farmer'), t('appointments.doctor'), t('appointments.dateTime'), t('appointments.type'), t('appointments.status')],
          rows: data.consultations.items.map((c) => [c.farmerName, c.doctorName, `${c.date || ""} ${c.time || ""}`.trim(), c.type || "-", c.status]),
        },
      }
    }
    if (type === "performance") {
      return {
        summary: [
          [t('admin.completionRate'), `${data.performance.completionRate}%`],
          [t('admin.responseCompliance'), `${data.performance.responseCompliance}%`],
          [t('admin.ticketResolutionRate'), `${data.performance.ticketResolutionRate}%`],
          [t('admin.totalAppointments'), String(data.consultations.total)],
          [t('appointments.overdue'), String(data.consultations.overdueCount)],
          [t('admin.openTickets'), String(data.tickets.open)],
          [t('admin.resolved'), String(data.tickets.resolved)],
        ],
        table: { headers: [], rows: [] },
      }
    }
    return {
      summary: [],
      table: {
        headers: [t('admin.district'), t('admin.farmers'), t('admin.doctors'), t('admin.consultations'), t('admin.diseaseCases')],
        rows: data.byDistrict.map((d) => [d.district, String(d.farmers), String(d.doctors), String(d.consultations), String(d.diseases)]),
      },
    }
  }

  const exportPDF = async (type: ReportType) => {
    if (!data) return
    try {
      const jsPDF = (await import('jspdf')).default
      const doc = new jsPDF()
      const { summary, table } = buildReportRows(type)
      let y = drawPdfHeader(doc, reportMeta[type].title)
      if (summary.length) {
        y = drawPdfLines(doc, y, summary.map(([label, value]) => `${label}: ${value}`))
        y += 4
      }
      if (table.rows.length) {
        y = drawPdfLines(doc, y, [table.headers.join(" | ")])
        y = drawPdfLines(doc, y, table.rows.map((row) => row.join(" | ")))
      }
      doc.save(`${type}-report-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
      toast({ title: t('common.error'), variant: "destructive" })
    }
  }

  const exportCSV = (type: ReportType) => {
    if (!data) return
    const { summary, table } = buildReportRows(type)
    const lines: string[] = []
    summary.forEach(([label, value]) => lines.push(`"${label}","${value}"`))
    if (table.headers.length) {
      if (summary.length) lines.push("")
      lines.push(table.headers.map((h) => `"${h}"`).join(","))
      table.rows.forEach((row) => lines.push(row.map((v) => `"${v}"`).join(",")))
    }
    const blob = new Blob([lines.join("\n")], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportExcel = async (type: ReportType) => {
    if (!data) return
    try {
      const XLSX = await import('xlsx')
      const { summary, table } = buildReportRows(type)
      const wb = XLSX.utils.book_new()
      if (summary.length) {
        const summarySheet = XLSX.utils.aoa_to_sheet(summary)
        XLSX.utils.book_append_sheet(wb, summarySheet, "Summary")
      }
      if (table.rows.length) {
        const tableSheet = XLSX.utils.aoa_to_sheet([table.headers, ...table.rows])
        XLSX.utils.book_append_sheet(wb, tableSheet, "Data")
      }
      XLSX.writeFile(wb, `${type}-report-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Excel export failed:', error)
      toast({ title: t('common.error'), variant: "destructive" })
    }
  }

  const runExport = async (type: ReportType, format: "pdf" | "csv" | "excel") => {
    setIsExporting(true)
    try {
      if (format === "pdf") await exportPDF(type)
      else if (format === "csv") exportCSV(type)
      else await exportExcel(type)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportAllData = async () => {
    if (!data) return
    setIsExporting(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      const usersSheet = XLSX.utils.json_to_sheet(data.users.items.map((u) => ({
        Name: u.name, Role: u.role, District: u.district || "-", Status: u.status, Registered: new Date(u.createdAt).toLocaleDateString(),
      })))
      XLSX.utils.book_append_sheet(wb, usersSheet, "Users")

      const consultSheet = XLSX.utils.json_to_sheet(data.consultations.items.map((c) => ({
        Farmer: c.farmerName, Doctor: c.doctorName, Service: c.service || "-", Date: c.date || "-", Time: c.time || "-", Type: c.type || "-", Status: c.status,
      })))
      XLSX.utils.book_append_sheet(wb, consultSheet, "Consultations")

      const diseaseSheet = XLSX.utils.json_to_sheet(data.diseases.items.map((r) => ({
        Farmer: r.farmerName, District: r.district || "-", Disease: r.diseaseName, Status: r.status, Diagnosed: r.diagnosedDate || "-",
      })))
      XLSX.utils.book_append_sheet(wb, diseaseSheet, "Diseases")

      const ticketSheet = XLSX.utils.json_to_sheet(data.tickets.items.map((tk) => ({
        Subject: tk.subject, Requester: tk.requesterName, Role: tk.requesterRole, Status: tk.status, AssignedTo: tk.assignedToName || "-", Created: new Date(tk.createdAt).toLocaleDateString(),
      })))
      XLSX.utils.book_append_sheet(wb, ticketSheet, "Support Tickets")

      const regionalSheet = XLSX.utils.json_to_sheet(data.byDistrict.map((d) => ({
        District: d.district, Farmers: d.farmers, Doctors: d.doctors, Consultations: d.consultations, "Disease Cases": d.diseases,
      })))
      XLSX.utils.book_append_sheet(wb, regionalSheet, "Regional Summary")

      XLSX.writeFile(wb, `vettrack-all-data-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast({ title: t('admin.exportAllDataSuccess') })
    } catch (error) {
      console.error('Export all data failed:', error)
      const message = error instanceof Error ? error.message : String(error)
      toast({ title: t('admin.exportAllDataFailed'), description: message, variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  const totalAppointments = data?.consultations.total ?? 0
  const totalUsers = (data?.stats.totalFarmers ?? 0) + (data?.stats.totalDoctors ?? 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.totalUsers')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">{totalUsers}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.totalAppointments')}</p>
            <h3 className="text-2xl font-bold text-green-600 mt-2">{totalAppointments}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.completionRate')}</p>
            <h3 className="text-2xl font-bold text-yellow-600 mt-2">{data?.performance.completionRate ?? 0}%</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.openTickets')}</p>
            <h3 className="text-2xl font-bold text-orange-600 mt-2">{data?.tickets.open ?? 0}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Object.keys(reportMeta) as ReportType[]).map((type) => {
          const meta = reportMeta[type]
          const Icon = meta.icon
          return (
            <Card key={type} className="border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{meta.title}</CardTitle>
                      <p className="text-sm text-gray-600">{meta.description}</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    {t('admin.liveData')}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {t('admin.lastGenerated')}: {data ? new Date(data.generatedAt).toLocaleString() : ""}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewingReport(type)}>
                      <Eye className="h-4 w-4 mr-2" />
                      {t('admin.view')}
                    </Button>
                    <Button size="sm" onClick={() => runExport(type, "pdf")} disabled={isExporting}>
                      <Download className="h-4 w-4 mr-2" />
                      {t('admin.download')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">{t('admin.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="h-20 flex-col gap-2" onClick={() => setIsGenerateOpen(true)}>
              <BarChart3 className="h-6 w-6" />
              {t('admin.generateCustomReport')}
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={handleExportAllData} disabled={isExporting || !data}>
              <Download className="h-6 w-6" />
              {t('admin.exportAllData')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Report Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewingReport && data && (() => {
            const meta = reportMeta[viewingReport]
            const { summary, table } = buildReportRows(viewingReport)
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{meta.title}</DialogTitle>
                  <DialogDescription>{meta.description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {summary.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {summary.map(([label, value]) => (
                        <div key={label} className="border rounded-lg p-3">
                          <div className="text-lg font-bold text-gray-900">{value}</div>
                          <div className="text-xs text-gray-500">{label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {table.rows.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              {table.headers.map((h) => (
                                <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                {row.map((cell, j) => (
                                  <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {summary.length === 0 && table.rows.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-6">{t('admin.noRegionalData')}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewingReport(null)}>{t('common.close')}</Button>
                  <Button onClick={() => runExport(viewingReport, "pdf")} disabled={isExporting}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('admin.download')}
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Generate Custom Report Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.generateCustomReport')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('admin.selectReportType')}</label>
              <Select value={generateType} onValueChange={(v) => setGenerateType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(reportMeta) as ReportType[]).map((type) => (
                    <SelectItem key={type} value={type}>{reportMeta[type].title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('admin.selectFormat')}</label>
              <Select value={generateFormat} onValueChange={(v) => setGenerateFormat(v as "pdf" | "csv" | "excel")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">{t('farmer.exportAsPDF')}</SelectItem>
                  <SelectItem value="csv">{t('farmer.exportAsCSV')}</SelectItem>
                  <SelectItem value="excel">{t('farmer.exportAsExcel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={async () => {
                await runExport(generateType, generateFormat)
                setIsGenerateOpen(false)
              }}
              disabled={isExporting}
            >
              {isExporting ? t('common.loading') : t('admin.generate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
