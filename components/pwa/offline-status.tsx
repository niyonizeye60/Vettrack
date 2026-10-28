"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CloudUpload, Loader2, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/LanguageContext"
import { localizeError } from "@/lib/error-messages"
import {
  onOutboxChange, outboxSupported, readOutbox, removeFromOutbox, retryFailed, sendOutbox, signedInFarmer,
  type OutboxEntry,
} from "./offline-outbox"

const REF_PREFIX = "offline:"

/**
 * The farmer portal's bar for working with no connection (./offline-outbox.ts). While
 * offline it says new records are kept on the phone. Once online it shows the records
 * still waiting to be sent, and any the server refused, which the farmer can try again
 * or remove.
 */
export default function OfflineStatus() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [supported, setSupported] = useState(false)
  const [online, setOnline] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [entries, setEntries] = useState<OutboxEntry[]>([])
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [removing, setRemoving] = useState<OutboxEntry | null>(null)

  const load = useCallback(async () => {
    const id = await signedInFarmer()
    setUserId(id)
    setEntries(id ? (await readOutbox(id)).filter((entry) => entry.status !== "sent") : [])
  }, [])

  const count = useCallback(
    (key: string, n: number) => t(n === 1 ? `${key}One` : `${key}Many`).replace("{count}", String(n)),
    [t]
  )

  useEffect(() => {
    if (!outboxSupported()) return
    setSupported(true)
    setOnline(navigator.onLine)
    load()
    const onConnection = () => setOnline(navigator.onLine)
    window.addEventListener("online", onConnection)
    window.addEventListener("offline", onConnection)
    const stop = onOutboxChange((message) => {
      load()
      if (message.sent) {
        toast({
          title: t("offline.sentTitle"),
          description: count("offline.sentDesc", message.sent),
          // The page's lists were loaded before; a reload shows the new records.
          action: (
            <ToastAction altText={t("offline.show")} onClick={() => window.location.reload()}>
              {t("offline.show")}
            </ToastAction>
          ),
        })
      }
    })
    return () => {
      window.removeEventListener("online", onConnection)
      window.removeEventListener("offline", onConnection)
      stop()
    }
  }, [load, toast, t, count])

  const pending = entries.filter((entry) => entry.status === "pending")
  const failed = entries.filter((entry) => entry.status === "failed")
  if (!supported || (online && entries.length === 0)) return null

  const sendNow = async () => {
    setSending(true)
    await sendOutbox()
    setSending(false)
  }
  const tryAgain = async () => {
    if (!userId) return
    setSending(true)
    await retryFailed(userId)
    await sendOutbox()
    setSending(false)
  }
  // Records made for this one (a dose for a new disease case) can't be saved without it.
  const dependents = (entry: OutboxEntry) =>
    entries.filter((other) => Object.values(other.body || {}).includes(REF_PREFIX + entry.id))
  const remove = async (entry: OutboxEntry) => {
    setRemoving(null)
    await removeFromOutbox([entry.id, ...dependents(entry).map((other) => other.id)])
  }

  const day = (value?: string) => {
    if (!value) return ""
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
    return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(language === "rw" ? "rw" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
  }
  const session = (value?: string) =>
    value === "Morning" ? t("farmer.morning") : value === "Evening" ? t("farmer.evening") : value || ""
  const describe = (entry: OutboxEntry) => {
    const b = entry.body || {}
    const details: Record<OutboxEntry["kind"], [unknown, unknown[]]> = {
      milk: [b.cowName, [day(b.date), session(b.session), b.liters ? `${b.liters} L` : ""]],
      disease: [b.animalName, [b.diseaseName, day(b.diagnosedDate)]],
      dose: [b.animalName, [b.diseaseName, day(b.date), session(b.session)]],
      vaccination: [b.subjectName, [b.vaccineName, day(b.date)]],
      insemination: [b.animalName, [day(b.date), Array.isArray(b.semenTypes) ? b.semenTypes.join(", ") : ""]],
      calf: [b.name, [day(b.birthDate)]],
      calfWeight: [b.calfName, [b.weight ? `${b.weight} kg` : "", day(b.date)]],
    }
    const [name, parts] = details[entry.kind] || ["", []]
    return {
      title: [t(`offline.kind.${entry.kind}`), name].filter(Boolean).join(" · "),
      detail: parts.filter(Boolean).join(" · "),
    }
  }
  const reason = (entry: OutboxEntry) =>
    entry.code === "PARENT_FAILED"
      ? t("offline.parentFailed")
      : localizeError(entry.error, language) || t("farmer.actionFailed")

  let bar: { tone: string; icon: React.ReactNode; text: string; action?: React.ReactNode }
  if (failed.length > 0) {
    bar = {
      tone: "border-red-200 bg-red-50 text-red-800",
      icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
      text: count("offline.barFailed", failed.length),
      action: (
        <Button size="sm" variant="outline" className="h-8 bg-white" onClick={() => setOpen(true)}>
          {t("offline.seeWhy")}
        </Button>
      ),
    }
  } else if (!online) {
    bar = {
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      icon: <WifiOff className="h-4 w-4 shrink-0" />,
      text: pending.length ? count("offline.barOfflineWaiting", pending.length) : t("offline.barOffline"),
      // With no connection a reload opens offline.html: the saved records, and the
      // forms that work without a connection.
      action: (
        <Button size="sm" variant="outline" className="h-8 bg-white" onClick={() => window.location.reload()}>
          {t("offline.openSaved")}
        </Button>
      ),
    }
  } else {
    bar = {
      tone: "border-blue-200 bg-blue-50 text-blue-900",
      icon: sending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <CloudUpload className="h-4 w-4 shrink-0" />,
      text: count("offline.barWaiting", pending.length),
      action: (
        <Button size="sm" variant="outline" className="h-8 bg-white" disabled={sending} onClick={sendNow}>
          {t("offline.sendNow")}
        </Button>
      ),
    }
  }

  return (
    <>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 text-sm print:hidden ${bar.tone}`} role="status">
        {bar.icon}
        <p className="min-w-0 flex-1">{bar.text}</p>
        <div className="flex shrink-0 gap-2">
          {entries.length > 0 && failed.length === 0 && (
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setOpen(true)}>
              {t("offline.seeRecords")}
            </Button>
          )}
          {bar.action}
        </div>
      </div>

      <Dialog open={open && entries.length > 0} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("offline.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("offline.dialogDesc")}</DialogDescription>
          </DialogHeader>
          <ul className="divide-y rounded-lg border">
            {[...failed, ...pending].map((entry) => {
              const { title, detail } = describe(entry)
              return (
                <li key={entry.id} className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-gray-900">{title}</p>
                    {detail && <p className="break-words text-xs text-gray-500">{detail}</p>}
                    {entry.status === "failed" ? (
                      <p className="mt-1 break-words text-xs text-red-600">{reason(entry)}</p>
                    ) : (
                      <p className="mt-1 text-xs text-blue-700">{t("offline.waiting")}</p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 shrink-0 text-red-600 hover:text-red-700" onClick={() => setRemoving(entry)}>
                    {t("common.remove")}
                  </Button>
                </li>
              )
            })}
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.close")}</Button>
            {failed.length > 0 && online && (
              <Button onClick={tryAgain} disabled={sending}>
                {sending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {t("common.tryAgain")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(value) => !value && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("offline.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("offline.removeDesc")}
              {removing && dependents(removing).length > 0 && ` ${count("offline.removeAlso", dependents(removing).length)}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => removing && remove(removing)}>
              {t("common.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
