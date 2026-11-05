"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useActionError } from "@/hooks/use-action-error"
import { logPortalExport } from "@/lib/actions"
import { localizeColumns } from "@/lib/export-columns"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText } from "lucide-react"

const today = new Date().toISOString().split("T")[0]

type ReportPeriod = "daily" | "monthly" | "total" | "custom"

interface CalfReportRecord {
  calfId: string
  calfName: string | null
  date: string
}

export interface CalfReportColumn<R> {
  /** English spreadsheet column name; localizeColumns translates it when the sheet is written. */
  name: string
  excelWidth: number
  value: (record: R) => string | number
  /**
   * Leave out to keep the column out of the PDF. A report's PDF widths, plus 2mm between
   * columns, add up to 135mm: what an A4 landscape page has left after date, calf and IDs.
   */
  pdf?: { label: string; width: number; text?: (record: R) => string }
}

interface CalfReportDialogProps<R extends CalfReportRecord> {
  open: boolean
  onOpenChange: (open: boolean) => void
  dialogTitle: string
  reportTitle: string
  /** Start of the downloaded file's name, e.g. "calf-weight-report". */
  fileName: string
  /** English name for the activity log. */
  activityName: string
  sheetName: string
  records: R[]
  calves: { _id: string; name: string; earTagId?: string | null; insuranceId?: string | null }[]
  /** The calves offered in the picker: those with records in this report. */
  calfOptions: { value: string; label: string }[]
  columns: CalfReportColumn<R>[]
  generatedBy?: string
  /** More filter controls. The parent applies them to `records` and describes them in `filterLine`. */
  extraFilter?: ReactNode
  /** Printed on the PDF, so a filtered report says what it was filtered to. */
  filterLine?: string
  /** The report's own figure, shown after the record and calf counts. */
  summaryExtra?: (rows: R[]) => string
}

/**
 * The export dialog for a list of per-calf records: picks a calf and a period, previews the
 * count, and downloads Excel or PDF. Built in the browser from `records`, so pass the full
 * list rather than the page a table is showing.
 */
export function CalfReportDialog<R extends CalfReportRecord>({
  open,
  onOpenChange,
  dialogTitle,
  reportTitle,
  fileName,
  activityName,
  sheetName,
  records,
  calves,
  calfOptions,
  columns,
  generatedBy,
  extraFilter,
  filterLine,
  summaryExtra,
}: CalfReportDialogProps<R>) {
  const { t } = useLanguage()
  const reportError = useActionError()
  const [pickedCalf, setPickedCalf] = useState("all")
  const [period, setPeriod] = useState<ReportPeriod>("total")
  const [date, setDate] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [exporting, setExporting] = useState(false)

  // The picked calf may have since lost its last record.
  const calfId = calfOptions.some(o => o.value === pickedCalf) ? pickedCalf : "all"

  const rows = useMemo(() => {
    let data = [...records]
    if (calfId !== "all") data = data.filter(r => r.calfId === calfId)
    if (period === "daily") data = data.filter(r => r.date === date)
    if (period === "monthly") data = data.filter(r => r.date.startsWith(month))
    if (period === "custom") data = data.filter(r => r.date >= start && r.date <= end)
    return data.sort((a, b) => b.date.localeCompare(a.date))
  }, [records, calfId, period, date, month, start, end])

  const summary = [
    t("pdf.records").replace("{count}", String(rows.length)),
    `${t('farmer.calves')}: ${new Set(rows.map(r => r.calfId)).size}`,
    ...(summaryExtra ? [summaryExtra(rows)] : []),
  ]

  const calfOf = (r: R) => calves.find(c => c._id === r.calfId)
  const pickedCalfName = calves.find(c => c._id === calfId)?.name

  const downloadName = (extension: string) => {
    const calfPart = calfId === "all" ? "all-calves" : (pickedCalfName || "calf").replace(/\s+/g, "-")
    return `${fileName}-${calfPart}-${period}-${today}.${extension}`
  }

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF("l", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const tableWidth = pageWidth - 30
      const periodLabel = period === "daily" ? t("pdf.reportDaily").replace("{date}", date)
        : period === "monthly" ? t("pdf.reportMonthly").replace("{month}", month)
        : period === "custom" ? t("pdf.reportCustom").replace("{start}", start).replace("{end}", end)
        : t("expenses.allTimeReport")

      doc.setTextColor(17, 24, 39)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text(reportTitle, 15, 18)
      doc.setDrawColor(226, 232, 240)
      doc.line(0, 26, pageWidth, 26)

      doc.setTextColor(55, 65, 81)
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      let y = 34
      const details = [
        t("pdf.calf").replace("{name}", calfId === "all" ? t('farmer.allCalves') : (pickedCalfName || t("pdf.unknown"))),
        ...(filterLine ? [filterLine] : []),
        t("pdf.reportType").replace("{label}", periodLabel),
        t("pdf.generated").replace("{date}", new Date().toLocaleString()),
        t("pdf.generatedBy").replace("{name}", generatedBy || t("pdf.unknown")),
      ]
      details.forEach(line => {
        doc.text(line, 15, y)
        y += 6
      })

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.rect(15, y, tableWidth, 16, "FD")
      doc.setFont("helvetica", "bold")
      summary.forEach((text, i) => {
        if (i === 0) doc.text(text, 20, y + 10)
        else if (i === summary.length - 1) doc.text(text, pageWidth - 20, y + 10, { align: "right" })
        else doc.text(text, pageWidth / 2, y + 10, { align: "center" })
      })
      y += 26

      const pdfColumns: { label: string; width: number; text: (r: R) => string }[] = [
        { label: t('farmer.date'), width: 22, text: r => r.date },
        { label: t('farmer.calf'), width: 36, text: r => r.calfName || "—" },
        { label: t('farmer.earTagId'), width: 33, text: r => calfOf(r)?.earTagId || "—" },
        { label: t('farmer.insuranceId'), width: 27, text: r => calfOf(r)?.insuranceId || "—" },
        ...columns.flatMap(c => c.pdf
          ? [{ label: c.pdf.label, width: c.pdf.width, text: c.pdf.text || ((r: R) => String(c.value(r)) || "—") }]
          : []),
      ]
      const columnX: number[] = []
      pdfColumns.reduce((x, c, i) => {
        columnX[i] = x
        return x + c.width + 2
      }, 18)

      const drawTableHeader = () => {
        doc.setFillColor(22, 163, 74)
        doc.rect(15, y - 6, tableWidth, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        pdfColumns.forEach((c, i) => doc.text(c.label, columnX[i], y))
        doc.setTextColor(55, 65, 81)
        doc.setFont("helvetica", "normal")
        y += 8
      }
      drawTableHeader()

      rows.forEach((r, rowIndex) => {
        const cells: string[][] = pdfColumns.map(c => doc.splitTextToSize(c.text(r), c.width))
        const rowHeight = Math.max(...cells.map(lines => lines.length)) * 4 + 3

        // Stops above the footer that gets drawn on every page below.
        if (y - 4 + rowHeight > pageHeight - 20) {
          doc.addPage()
          y = 20
          drawTableHeader()
        }
        if (rowIndex % 2 === 0) {
          doc.setFillColor(249, 250, 251)
          doc.rect(15, y - 4, tableWidth, rowHeight, "F")
        }
        cells.forEach((lines, i) => doc.text(lines, columnX[i], y))
        y += rowHeight
      })

      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        doc.setFillColor(248, 250, 252)
        doc.rect(0, pageHeight - 14, pageWidth, 14, "F")
        doc.setDrawColor(226, 232, 240)
        doc.line(0, pageHeight - 14, pageWidth, pageHeight - 14)
        doc.setFontSize(7)
        doc.setTextColor(107, 114, 128)
        doc.text(t("pdf.rights").replace("{year}", String(new Date().getFullYear())), 15, pageHeight - 5)
        doc.text(t("pdf.page").replace("{page}", String(page)).replace("{total}", String(totalPages)), pageWidth - 15, pageHeight - 5, { align: "right" })
      }

      doc.save(downloadName("pdf"))
      logPortalExport(activityName, "PDF").catch(() => {})
      onOpenChange(false)
    } catch (err) {
      console.error(`${activityName} PDF export failed:`, err)
      reportError(null)
    } finally {
      setExporting(false)
    }
  }

  const exportToExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import("xlsx")
      const sheetRows = rows.map(r => ({
        Date: r.date,
        Calf: r.calfName || "",
        "Ear Tag ID": calfOf(r)?.earTagId || "",
        "Insurance ID": calfOf(r)?.insuranceId || "",
        ...Object.fromEntries(columns.map(c => [c.name, c.value(r)])),
      }))
      const sheet = XLSX.utils.json_to_sheet(localizeColumns(sheetRows, t))
      sheet["!cols"] = [14, 24, 22, 22, ...columns.map(c => c.excelWidth)].map(wch => ({ wch }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, sheet, sheetName)
      XLSX.writeFile(wb, downloadName("xlsx"))
      logPortalExport(activityName, "Excel").catch(() => {})
      onOpenChange(false)
    } catch (err) {
      console.error(`${activityName} Excel export failed:`, err)
      reportError(null)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* pr-6 keeps a long title clear of the dialog's close button. */}
          <DialogTitle className="flex items-center gap-2 pr-6">
            <FileText className="h-5 w-5 shrink-0 text-green-600" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{t('farmer.calf')}</label>
            <Combobox
              value={calfId}
              onValueChange={setPickedCalf}
              options={[{ value: "all", label: t('farmer.allCalves') }, ...calfOptions]}
              searchPlaceholder={t('farmer.searchCalves')}
              emptyText={t('farmer.noCalvesMatch')}
            />
          </div>

          {extraFilter}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{t('farmer.reportType')}</label>
            <Select value={period} onValueChange={v => setPeriod(v as ReportPeriod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('farmer.dailyReport')}</SelectItem>
                <SelectItem value="monthly">{t('farmer.monthlyReport')}</SelectItem>
                <SelectItem value="total">{t('farmer.allTime')}</SelectItem>
                <SelectItem value="custom">{t('farmer.customReport')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === "daily" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t('farmer.selectDate')}</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          )}
          {period === "monthly" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t('farmer.selectMonth')}</label>
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
          )}
          {period === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.startDate')}</label>
                <Input type="date" value={start} max={end} onChange={e => setStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('farmer.endDate')}</label>
                <Input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} />
              </div>
            </div>
          )}

          <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-sm space-y-1">
            <p className="font-medium text-green-700">{t('farmer.preview')}</p>
            <p className="text-gray-600">{summary.join(" • ")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">{t('farmer.cancel')}</Button>
            <Button onClick={exportToExcel} disabled={exporting || rows.length === 0} className="rounded-lg bg-green-600 hover:bg-green-700 text-white gap-2">
              <Download className="h-4 w-4" /> {exporting ? t('farmer.exporting') : t('farmer.exportExcel')}
            </Button>
            <Button onClick={exportToPDF} disabled={exporting || rows.length === 0} className="col-span-2 bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2">
              <FileText className="h-4 w-4" /> {exporting ? t('farmer.exporting') : t('farmer.exportPDF')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
