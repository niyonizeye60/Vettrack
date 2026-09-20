"use client"

import { useState } from "react"
import { Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { useLanguage } from "@/contexts/LanguageContext"
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
        <DialogContent className="sm:max-w-[480px] w-11/12">
          <DialogHeader>
            <DialogTitle>{t("consultationDocs.chooseTitle")}</DialogTitle>
            <DialogDescription>{t("consultationDocs.chooseDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3 px-1 text-sm font-medium text-gray-700">
              <Checkbox checked={selected.size === documents.length} onCheckedChange={(c) => toggleAll(c === true)} />
              {t("consultationDocs.selectAll")}
            </label>

            <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
                    <Checkbox checked={selected.has(doc.id)} onCheckedChange={(c) => toggle(doc.id, c === true)} />
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-gray-800" title={doc.name}>{doc.name}</span>
                      <span className="block text-xs text-gray-400">
                        {formatFileSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            {selected.size > 1 && <p className="text-xs text-gray-400">{t("consultationDocs.multiHint")}</p>}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
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
