"use client"

import { useEffect, useState } from "react"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Stethoscope, Activity, Pill, PawPrint, AlertCircle
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface ConsultationEntry {
  type: "consultation"
  id: string
  date: string | null
  time: string | null
  status: string
  service: string | null
  doctorName: string | null
  feedback: string | null
  diagnosis: string | null
  symptomsObserved: string | null
  treatmentGiven: string | null
  medicationDosage: string | null
  followUpNeeded: boolean
  followUpDate: string | null
}

interface DiseaseEntry {
  type: "disease_record"
  id: string
  date: string | null
  diseaseName: string
  symptoms: string | null
  treatment: string | null
  status: string | null
  resolvedDate: string | null
  notes: string | null
  veterinarianName: string | null
}

interface TreatmentDoseEntry {
  type: "treatment_dose"
  id: string
  date: string | null
  diseaseName: string | null
  session: string | null
  medicines: { medicineName: string; doseCount: number; volumeMl: number | null; cost: number }[]
  vetCost: number
  totalCost: number
  notes: string | null
}

type TimelineEntry = ConsultationEntry | DiseaseEntry | TreatmentDoseEntry

interface AnimalHistoryResponse {
  animal: {
    _id: string
    name: string
    type: string
    breed: string
    status: string
    ownerName: string
  } | null
  timeline: TimelineEntry[]
  counts: { consultations: number; diseaseRecords: number; treatmentDoses: number }
}

interface AnimalHistoryPanelProps {
  animalId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formatDate = (value: string | null) => {
  if (!value) return "—"
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

export default function AnimalHistoryPanel({ animalId, open, onOpenChange }: AnimalHistoryPanelProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [data, setData] = useState<AnimalHistoryResponse | null>(null)

  useEffect(() => {
    if (!open || !animalId) return
    let cancelled = false
    setLoading(true)
    setError(false)
    fetch(`/api/animal-history?animalId=${animalId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed")
        return res.json()
      })
      .then((json) => { if (!cancelled) setData(json) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, animalId])

  useEffect(() => {
    if (!open) setData(null)
  }, [open])

  const statusColor = (status: string | null) => {
    const s = (status || "").toLowerCase()
    if (["completed", "resolved", "healthy"].includes(s)) return "bg-emerald-50 text-emerald-700 border-emerald-200"
    if (["accepted", "under treatment"].includes(s)) return "bg-blue-50 text-blue-700 border-blue-200"
    if (["rejected"].includes(s)) return "bg-red-50 text-red-700 border-red-200"
    if (["pending", "active", "sick"].includes(s)) return "bg-amber-50 text-amber-700 border-amber-200"
    return "bg-gray-50 text-gray-600 border-gray-200"
  }

  const EntryRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null
    return (
      <div className="grid grid-cols-3 gap-3 text-xs">
        <p className="text-gray-400 font-medium">{label}</p>
        <p className="col-span-2 text-gray-700 break-words">{value}</p>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-green-600" />
            {t("vet.medicalHistory")}
          </SheetTitle>
          {data?.animal && (
            <SheetDescription>
              {data.animal.name} · {data.animal.type}{data.animal.breed ? ` · ${data.animal.breed}` : ""}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {loading && (
            <div className="space-y-3" aria-busy="true" aria-label={t("vet.loadingHistory")}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Skeleton className="h-7 w-7 rounded-lg flex-shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3.5 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
                  </div>
                  <div className="pl-9 space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-6 w-6 text-red-400 mb-2" />
              <p className="text-sm text-gray-500">{t("vet.errorLoadingHistory")}</p>
            </div>
          )}

          {!loading && !error && data && !data.animal && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
              {t("vet.animalRecordNotFound")}
            </div>
          )}

          {!loading && !error && data && data.timeline.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <PawPrint className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium">{t("vet.noMedicalHistory")}</p>
            </div>
          )}

          {!loading && !error && data && data.timeline.map((entry) => {
            if (entry.type === "consultation") {
              return (
                <div key={`c-${entry.id}`} className="rounded-lg border border-gray-100 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="bg-green-50 p-1.5 rounded-lg flex-shrink-0">
                        <Stethoscope className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{entry.service || t("vet.consultationRecord")}</p>
                        <p className="text-xs text-gray-400">{formatDate(entry.date)}{entry.doctorName ? ` · Dr. ${entry.doctorName}` : ""}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs flex-shrink-0 ${statusColor(entry.status)}`}>{entry.status}</Badge>
                  </div>
                  <div className="pl-8 space-y-1.5">
                    <EntryRow label={t("vet.diagnosis")} value={entry.diagnosis} />
                    <EntryRow label={t("vet.symptomsObserved")} value={entry.symptomsObserved} />
                    <EntryRow label={t("vet.treatmentGiven")} value={entry.treatmentGiven} />
                    <EntryRow label={t("vet.medicationDosage")} value={entry.medicationDosage} />
                    {entry.followUpNeeded && (
                      <EntryRow label={t("vet.followUpDate")} value={entry.followUpDate ? formatDate(entry.followUpDate) : t("vet.followUpNeeded")} />
                    )}
                    <EntryRow label={t("vet.feedback")} value={entry.feedback} />
                  </div>
                </div>
              )
            }
            if (entry.type === "disease_record") {
              return (
                <div key={`d-${entry.id}`} className="rounded-lg border border-gray-100 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="bg-amber-50 p-1.5 rounded-lg flex-shrink-0">
                        <Activity className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{entry.diseaseName}</p>
                        <p className="text-xs text-gray-400">{formatDate(entry.date)}{entry.veterinarianName ? ` · ${entry.veterinarianName}` : ""}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs flex-shrink-0 ${statusColor(entry.status)}`}>{entry.status}</Badge>
                  </div>
                  <div className="pl-8 space-y-1.5">
                    <EntryRow label={t("vet.symptomsObserved")} value={entry.symptoms} />
                    <EntryRow label={t("vet.treatmentGiven")} value={entry.treatment} />
                    <EntryRow label={t("vet.feedback")} value={entry.notes} />
                    {entry.resolvedDate && <EntryRow label={t("vet.resolvedDate")} value={formatDate(entry.resolvedDate)} />}
                  </div>
                </div>
              )
            }
            return (
              <div key={`t-${entry.id}`} className="rounded-lg border border-gray-100 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="bg-blue-50 p-1.5 rounded-lg flex-shrink-0">
                      <Pill className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{entry.diseaseName || t("vet.treatmentDose")}</p>
                      <p className="text-xs text-gray-400">{formatDate(entry.date)}{entry.session ? ` · ${entry.session}` : ""}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 flex-shrink-0">{entry.totalCost.toLocaleString()} RWF</span>
                </div>
                {entry.medicines.length > 0 && (
                  <div className="pl-8 space-y-1">
                    {entry.medicines.map((m, i) => (
                      <p key={i} className="text-xs text-gray-600">
                        {m.medicineName} — {m.doseCount}{m.volumeMl ? ` × ${m.volumeMl}ml` : ""}
                      </p>
                    ))}
                  </div>
                )}
                <EntryRow label={t("vet.feedback")} value={entry.notes} />
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
