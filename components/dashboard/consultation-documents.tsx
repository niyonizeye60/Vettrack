"use client"

import { useRef, useState } from "react"
import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MAX_PER_CONSULTATION,
  documentExtension,
  formatFileSize,
  type ConsultationDocument,
} from "@/lib/consultation-document-rules"

interface ConsultationDocumentsProps {
  consultationId: string
  documents: ConsultationDocument[]
  /** The vet can attach and remove documents; the farmer can only download them. */
  mode: "vet" | "farmer"
  /** Vet only: whether this case is in a status that accepts new documents. */
  canUpload?: boolean
  /** Called after an upload or removal so the parent can refetch. */
  onChange?: () => void
}

// File names are one long unbreakable string, so let them wrap anywhere rather than
// stretching whatever dialog they sit in.
const NAME_CLASS = "line-clamp-3 text-sm text-gray-800 [overflow-wrap:anywhere]"

export default function ConsultationDocuments({
  consultationId,
  documents,
  mode,
  canUpload = false,
  onChange,
}: ConsultationDocumentsProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [staged, setStaged] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState<ConsultationDocument | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)

  const isVet = mode === "vet"
  const atLimit = documents.length >= DOCUMENT_MAX_PER_CONSULTATION
  const showUpload = isVet && canUpload

  // Nothing to show and nothing the viewer can do about it - keep the dialog uncluttered.
  if (documents.length === 0 && !showUpload) return null

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset so choosing the same file again after cancelling still fires onChange.
    e.target.value = ""
    if (!file) return
    if (!documentExtension(file.name)) {
      toast({ title: t("consultationDocs.typeNotAllowed"), variant: "destructive" })
      return
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      toast({
        title: `${t("consultationDocs.tooLarge")} (${formatFileSize(DOCUMENT_MAX_BYTES)})`,
        variant: "destructive",
      })
      return
    }
    setStaged(file)
  }

  const handleUpload = async () => {
    if (!staged) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", staged)
      const res = await fetch(`/api/consultations/${consultationId}/documents`, { method: "POST", body })
      // A platform-level rejection (e.g. body too large) isn't JSON.
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        toast({ title: t("consultationDocs.uploaded") })
        setStaged(null)
        onChange?.()
      } else {
        toast({ title: t("consultationDocs.uploadFailed"), description: data?.message, variant: "destructive" })
      }
    } catch {
      toast({ title: t("consultationDocs.uploadFailed"), variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    const target = removing
    if (!target) return
    setRemoveBusy(true)
    try {
      const res = await fetch(`/api/consultations/${consultationId}/documents/${target.id}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: t("consultationDocs.removed") })
        onChange?.()
      } else {
        toast({ title: t("consultationDocs.removeFailed"), variant: "destructive" })
      }
    } catch {
      toast({ title: t("consultationDocs.removeFailed"), variant: "destructive" })
    } finally {
      setRemoveBusy(false)
      setRemoving(null)
    }
  }

  return (
    <div className="min-w-0 space-y-2 border-t border-gray-100 pt-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Paperclip className="h-3 w-3" />
        {t("consultationDocs.title")}
        {documents.length > 0 && <span className="font-normal text-gray-400">({documents.length})</span>}
      </p>

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2.5 rounded-md border border-gray-100 px-2.5 py-2">
              <FileText className="h-4 w-4 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className={NAME_CLASS} title={doc.name}>{doc.name}</p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              {/* A plain link, not a fetch: the response is an attachment, and this is the
                  most dependable way to save a file on a phone. Icon-only on a narrow
                  screen so the file name keeps the room. */}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 w-9 shrink-0 p-0 text-xs sm:h-7 sm:w-auto sm:px-2"
              >
                <a
                  href={`/api/consultations/${consultationId}/documents/${doc.id}`}
                  download
                  title={t("consultationDocs.download")}
                  aria-label={`${t("consultationDocs.download")}: ${doc.name}`}
                >
                  <Download className="h-4 w-4 sm:mr-1 sm:h-3 sm:w-3" />
                  <span className="hidden sm:inline">{t("consultationDocs.download")}</span>
                </a>
              </Button>
              {isVet && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 shrink-0 p-0 hover:bg-red-50 sm:h-7 sm:w-7"
                  title={t("consultationDocs.remove")}
                  aria-label={`${t("consultationDocs.remove")}: ${doc.name}`}
                  onClick={() => setRemoving(doc)}
                >
                  <Trash2 className="h-4 w-4 text-red-500 sm:h-3.5 sm:w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {showUpload && (
        <div className="space-y-2">
          <input ref={inputRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" onChange={handleSelect} />

          {atLimit ? (
            <p className="text-xs text-gray-500">{t("consultationDocs.limitReached")}</p>
          ) : staged ? (
            // The farmer is notified the moment this is sent, so the vet confirms the file first.
            <div className="space-y-2.5 rounded-md border border-green-100 bg-green-50 p-2.5">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 shrink-0 text-green-600" />
                <div className="min-w-0 flex-1">
                  <p className={NAME_CLASS} title={staged.name}>{staged.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(staged.size)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 text-white hover:bg-green-700"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                  {uploading ? t("consultationDocs.uploading") : t("consultationDocs.upload")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStaged(null)} disabled={uploading}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => inputRef.current?.click()}>
                <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                {t("consultationDocs.choose")}
              </Button>
              <p className="text-xs text-gray-400">{t("consultationDocs.vetHint")}</p>
            </>
          )}
        </div>
      )}

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && !removeBusy && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("consultationDocs.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium break-all">{removing?.name}</span>
              <br />
              {t("consultationDocs.removeDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeBusy}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeBusy}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t("consultationDocs.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
