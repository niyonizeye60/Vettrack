"use client"

import { useState } from "react"
import { Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"
import { formatFileSize, type ConsultationDocument } from "@/lib/consultation-document-rules"

// Browsers tend to allow the first download in a burst and then ask before allowing
// more, so the files are staggered rather than fired at once.
const DOWNLOAD_GAP_MS = 400

const documentUrl = (consultationId: string, docId: string) =>
  `/api/consultations/${consultationId}/documents/${docId}`

interface ConsultationDocumentsDownloadProps {
  consultationId: string
  documents: ConsultationDocument[]
}

/**
 * The download control for one row of the farmer's consultation list: nothing when the
 * case has no documents, an immediate download when it has one, and a chooser when it
 * has several.
 */
export default function ConsultationDocumentsDownload({ consultationId, documents }: ConsultationDocumentsDownloadProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  if (documents.length === 0) return null

  if (documents.length === 1) {
    const [only] = documents
    // A plain link, not a fetch: the response is an attachment, and this is the most
    // dependable way to save a file on a phone.
    return (
      <Button asChild variant="outline" size="sm" className="shrink-0" title={only.name}>
        <a href={documentUrl(consultationId, only.id)} download>
          <Download className="mr-1 h-3.5 w-3.5" />
          {t("consultationDocs.download")}
        </a>
      </Button>
    )
  }

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(documents.map((d) => d.id)) : new Set())

  const openChooser = () => {
    setSelected(new Set())
    setOpen(true)
  }

  const downloadSelected = () => {
    // In the order the list shows them, not the order they were ticked.
    documents
      .filter((d) => selected.has(d.id))
      .forEach((doc, i) => {
        window.setTimeout(() => {
          const link = document.createElement("a")
          link.href = documentUrl(consultationId, doc.id)
          link.download = ""
          link.style.display = "none"
          document.body.appendChild(link)
          link.click()
          link.remove()
        }, i * DOWNLOAD_GAP_MS)
      })
    setOpen(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" className="shrink-0" onClick={openChooser}>
        <Download className="mr-1 h-3.5 w-3.5" />
        {t("consultationDocs.download")} ({documents.length})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Flex column, not the default grid: a grid column grows to fit an unbreakable
            file name and pushes the whole dialog wider than a phone screen. Header and
            footer stay pinned; only the list scrolls. */}
        <DialogContent className="flex max-h-[85vh] w-11/12 flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-w-[480px]">
          <DialogHeader className="border-b border-gray-100 px-4 py-4 pr-12 text-left sm:px-6 sm:pr-12">
            <DialogTitle>{t("consultationDocs.chooseTitle")}</DialogTitle>
            <DialogDescription>{t("consultationDocs.chooseDesc")}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700">
              <Checkbox
                className="h-5 w-5 shrink-0"
                checked={selected.size === documents.length}
                onCheckedChange={(c) => toggleAll(c === true)}
              />
              {t("consultationDocs.selectAll")}
              <span className="ml-auto text-xs font-normal text-gray-400">
                {selected.size}/{documents.length}
              </span>
            </label>

            <ul className="space-y-2">
              {documents.map((doc) => {
                const isSelected = selected.has(doc.id)
                return (
                  <li key={doc.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors",
                        isSelected ? "border-green-300 bg-green-50" : "border-gray-100 hover:bg-gray-50"
                      )}
                    >
                      <Checkbox
                        className="h-5 w-5 shrink-0"
                        checked={isSelected}
                        onCheckedChange={(c) => toggle(doc.id, c === true)}
                      />
                      <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="min-w-0 flex-1">
                        <span
                          className="line-clamp-3 block text-sm text-gray-800 [overflow-wrap:anywhere]"
                          title={doc.name}
                        >
                          {doc.name}
                        </span>
                        <span className="block text-xs text-gray-400">
                          {formatFileSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>

            {selected.size > 1 && <p className="text-xs text-gray-400">{t("consultationDocs.multiHint")}</p>}
          </div>

          {/* Primary action on top when stacked on a phone (the footer is flex-col-reverse). */}
          <DialogFooter className="gap-2 border-t border-gray-100 px-4 py-3 sm:gap-0 sm:px-6 sm:py-4">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={selected.size === 0}
              onClick={downloadSelected}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {t("consultationDocs.downloadSelected")}
              {selected.size > 0 && ` (${selected.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
