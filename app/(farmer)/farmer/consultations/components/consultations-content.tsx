"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowUpDown, Bell, ChevronLeft, ChevronRight, Eye, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { deleteConsultation } from "@/lib/actions"
import AddConsultationForm from "@/components/dashboard/add-consultation-form"
import EditConsultationForm from "@/components/dashboard/edit-consultation-form"
import ConsultationDocuments from "@/components/dashboard/consultation-documents"
import ConsultationDocumentsDownload from "@/components/dashboard/consultation-documents-download"

interface Doctor {
  _id: string
  name: string
  email: string
  specialization: string
  phone: string
}

interface SickAnimal {
  _id: string
  name: string
  type: string
  breed: string
}

interface ConsultationsPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface ConsultationsFilters {
  status: string
  animalId: string
  doctor: string
  month: string
  startDate: string
  endDate: string
  sortBy: string
  sortOrder: string
}

const SORT_OPTIONS = [
  { value: "createdAt_desc", sortBy: "createdAt", sortOrder: "desc", label: "Newest booked" },
  { value: "createdAt_asc", sortBy: "createdAt", sortOrder: "asc", label: "Oldest booked" },
  { value: "date_desc", sortBy: "date", sortOrder: "desc", label: "Appointment date (latest)" },
  { value: "date_asc", sortBy: "date", sortOrder: "asc", label: "Appointment date (earliest)" },
  { value: "status_asc", sortBy: "status", sortOrder: "asc", label: "Status (A–Z)" },
] as const

interface FilterOption { _id: string; name: string }

interface ConsultationsContentProps {
  consultations: any[]
  pagination: ConsultationsPagination
  filters: ConsultationsFilters
  // Distinct animals/doctors that actually appear in this farmer's consultations -
  // scoped for the History filters below, as opposed to `doctors`, which is every
  // doctor on the roster and is used for booking a new consultation.
  filterOptions: { animals: FilterOption[]; doctors: FilterOption[] }
  doctors: Doctor[]
  farmerId: string
  sickAnimals: SickAnimal[]
  openAdd?: boolean
  farmerName?: string
  farmerPhone?: string
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-right text-gray-800">{value}</span>
    </div>
  )
}

export default function ConsultationsContent({ consultations, pagination, filters, filterOptions, doctors, farmerId, sickAnimals, openAdd, farmerName, farmerPhone }: ConsultationsContentProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()

  const buildUrl = (overrides: Partial<ConsultationsFilters & { page: number }>) => {
    const merged = { ...filters, page: pagination.page, ...overrides }
    const params = new URLSearchParams()
    if (merged.status) params.set("status", merged.status)
    if (merged.animalId) params.set("animalId", merged.animalId)
    if (merged.doctor) params.set("doctor", merged.doctor)
    if (merged.month) params.set("month", merged.month)
    else {
      if (merged.startDate) params.set("startDate", merged.startDate)
      if (merged.endDate) params.set("endDate", merged.endDate)
    }
    if (merged.sortBy !== "createdAt") params.set("sortBy", merged.sortBy)
    if (merged.sortOrder !== "desc") params.set("sortOrder", merged.sortOrder)
    if (merged.page > 1) params.set("page", String(merged.page))
    const qs = params.toString()
    return `/farmer/consultations${qs ? `?${qs}` : ""}`
  }

  const goToPage = (p: number) => router.push(buildUrl({ page: p }))
  const setFilter = (patch: Partial<ConsultationsFilters>) => router.push(buildUrl({ ...patch, page: 1 }))
  const clearFilters = () => router.push("/farmer/consultations")

  const currentSortValue = SORT_OPTIONS.find(o => o.sortBy === filters.sortBy && o.sortOrder === filters.sortOrder)?.value || "createdAt_desc"
  const setSort = (value: string) => {
    const opt = SORT_OPTIONS.find(o => o.value === value)
    if (opt) router.push(buildUrl({ sortBy: opt.sortBy, sortOrder: opt.sortOrder, page: 1 }))
  }

  const hasActiveFilters = !!(filters.status || filters.animalId || filters.doctor || filters.month || filters.startDate || filters.endDate)

  const [addOpen, setAddOpen] = useState(openAdd ?? false)
  const [editConsultation, setEditConsultation] = useState<any | null>(null)
  const [detailConsultation, setDetailConsultation] = useState<any | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "accepted": return "bg-green-100 text-green-800"
      case "rejected": return "bg-red-100 text-red-800"
      case "completed": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case "pending": return t('farmer.pending')
      case "accepted": return t('farmer.accepted')
      case "rejected": return t('farmer.rejected')
      default: return status
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const result = await deleteConsultation(deleteId, farmerId)
      if (!result.success) {
        toast({ title: t('farmer.actionFailed'), variant: "destructive" })
      }
      router.refresh()
    } catch {
      toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('farmer.myConsultations')}</h1>
          <p className="text-sm text-gray-500">{t('farmer.consultationHistory')}</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          {t('farmer.newConsultation')}
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">{t('farmer.consultationHistory')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 bg-gray-50 border-b border-gray-100 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              <Combobox
                value={filters.animalId || "all"}
                onValueChange={(v) => setFilter({ animalId: v === "all" ? "" : v })}
                options={[
                  { value: "all", label: t('farmer.allAnimals') || "All animals" },
                  ...filterOptions.animals.map(a => ({ value: a._id, label: a.name })),
                ]}
                placeholder={t('farmer.animal')}
                searchPlaceholder={t('farmer.searchAnimals') || "Search animals…"}
                emptyText={t('farmer.noResultsFound') || "No animals found."}
              />
              <Combobox
                value={filters.doctor || "all"}
                onValueChange={(v) => setFilter({ doctor: v === "all" ? "" : v })}
                options={[
                  { value: "all", label: t('farmer.doctor') },
                  ...filterOptions.doctors.map(d => ({ value: d._id, label: d.name })),
                ]}
                placeholder={t('farmer.doctor')}
                searchPlaceholder="Search doctors…"
                emptyText="No doctors found."
              />
              <Select value={filters.status || "all"} onValueChange={(v) => setFilter({ status: v === "all" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder={t('farmer.status')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('farmer.status')}</SelectItem>
                  <SelectItem value="pending">{t('farmer.pending')}</SelectItem>
                  <SelectItem value="accepted">{t('farmer.accepted')}</SelectItem>
                  <SelectItem value="rejected">{t('farmer.rejected')}</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="month"
                value={filters.month}
                onChange={(e) => setFilter({ month: e.target.value, startDate: "", endDate: "" })}
              />
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilter({ startDate: e.target.value, month: "" })}
                placeholder="Start date"
              />
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilter({ endDate: e.target.value, month: "" })}
                placeholder="End date"
              />
            </div>

            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">{pagination.total} record{pagination.total !== 1 ? "s" : ""} found</p>
              <div className="flex items-center gap-2 ml-auto">
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-lg">{t('farmer.clearFilters')}</Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-lg gap-1.5 shrink-0" title="Sort">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={currentSortValue} onValueChange={setSort}>
                      {SORT_OPTIONS.map(o => (
                        <DropdownMenuRadioItem key={o.value} value={o.value}>{o.label}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {pagination.total === 0 && hasActiveFilters ? (
            <div className="text-center py-10 text-gray-500 px-6">
              <div className="mx-auto mb-3 flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                <Bell className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">{t('farmer.noResultsFound') || "No consultations match your filters"}</p>
              <p className="mt-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  {t('farmer.clearFilters')}
                </Button>
              </p>
            </div>
          ) : pagination.total === 0 ? (
            <div className="text-center py-10 text-gray-500 px-6">
              <div className="mx-auto mb-3 flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                <Bell className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">{t('farmer.noConsultationsYet')}</p>
              <p className="mt-2">
                <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                  {t('farmer.bookAConsultation')}
                </Button>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-600">{t('farmer.animal')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.service')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.doctor')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.date')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.time')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.type')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.status')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultations.map((consultation) => (
                    <TableRow key={consultation._id} className="hover:bg-gray-50/80 transition-colors duration-150">
                      <TableCell className="text-sm text-gray-800">
                        {consultation.animalName
                          ? <span className="font-medium">{consultation.animalName}<span className="text-gray-400 font-normal"> · {consultation.animalType}</span></span>
                          : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{consultation.service}</TableCell>
                      <TableCell className="text-sm text-gray-600">{consultation.doctor || <span className="text-gray-400">—</span>}</TableCell>
                      <TableCell className="text-sm text-gray-600">{consultation.date}</TableCell>
                      <TableCell className="text-sm text-gray-600">{consultation.time}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{consultation.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(consultation.status)}>
                          {getStatusText(consultation.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => setDetailConsultation(consultation)}
                          >
                            {t('farmer.view')}
                          </Button>
                          <ConsultationDocumentsDownload
                            consultationId={consultation._id}
                            documents={consultation.documents ?? []}
                          />
                          {consultation.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={() => setEditConsultation(consultation)}
                              >
                                <Pencil className="h-3.5 w-3.5 mr-1" />{t('farmer.edit')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-red-50 shrink-0"
                                title={t('farmer.delete')}
                                onClick={() => setDeleteId(consultation._id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-medium">{(pagination.page - 1) * pagination.pageSize + 1}</span>
                {" - "}
                <span className="font-medium">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span>
                {" "}of{" "}
                <span className="font-medium">{pagination.total}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const startPage = Math.max(1, pagination.page - 2)
                  const p = startPage + i
                  if (p > pagination.totalPages) return null
                  return (
                    <Button
                      key={p}
                      variant={p === pagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(p)}
                      className="min-w-[36px]"
                    >
                      {p}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Consultation Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => !open && setAddOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('farmer.newConsultation')}</DialogTitle>
          </DialogHeader>
          <AddConsultationForm
            doctors={doctors}
            farmerId={farmerId}
            sickAnimals={sickAnimals}
            farmerName={farmerName}
            farmerPhone={farmerPhone}
            onSuccess={() => { setAddOpen(false); router.refresh() }}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Consultation Dialog */}
      <Dialog open={!!editConsultation} onOpenChange={(open) => !open && setEditConsultation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('farmer.editConsultation')}</DialogTitle>
          </DialogHeader>
          {editConsultation && (
            <EditConsultationForm
              consultation={editConsultation}
              doctors={doctors}
              farmerId={farmerId}
              onSuccess={() => { setEditConsultation(null); router.refresh() }}
              onCancel={() => setEditConsultation(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailConsultation} onOpenChange={(open) => !open && setDetailConsultation(null)}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              {t('farmer.consultationFor')}
            </DialogTitle>
          </DialogHeader>

          {detailConsultation && (
            <div className="min-w-0 space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-2">
              {detailConsultation.feedback && (
                <Alert variant={detailConsultation.status === "rejected" ? "destructive" : "default"}>
                  <MessageSquare className="h-4 w-4" />
                  <AlertTitle>
                    {detailConsultation.status === "accepted" ? t('farmer.acceptedWithFeedback') :
                     detailConsultation.status === "rejected" ? t('farmer.rejectedWithFeedback') :
                     detailConsultation.status === "completed" ? t('farmer.completedWithFeedback') : ""}
                  </AlertTitle>
                  <AlertDescription>{detailConsultation.feedback}</AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg p-4 space-y-1 bg-white">
                <DetailRow label={t('farmer.fullName')} value={detailConsultation.fullName} />
                <DetailRow label={t('farmer.phoneNumber')} value={detailConsultation.phoneNumber} />
                {detailConsultation.animalName && (
                  <DetailRow label={t('farmer.animal')} value={`${detailConsultation.animalName} (${detailConsultation.animalType})`} />
                )}
                <DetailRow label={t('farmer.service')} value={detailConsultation.service} />
                <DetailRow label={t('farmer.doctor')} value={detailConsultation.doctor || "-"} />
                <DetailRow label={t('farmer.date')} value={detailConsultation.date} />
                <DetailRow label={t('farmer.time')} value={detailConsultation.time} />
                <DetailRow label={t('farmer.type')} value={detailConsultation.type} />
                <DetailRow
                  label={t('farmer.status')}
                  value={
                    <Badge className={getStatusColor(detailConsultation.status)}>
                      {getStatusText(detailConsultation.status)}
                    </Badge>
                  }
                />
                <DetailRow
                  label={t('farmer.createdAt')}
                  value={new Date(detailConsultation.createdAt).toLocaleString()}
                />
              </div>

              <ConsultationDocuments
                consultationId={detailConsultation._id}
                documents={detailConsultation.documents ?? []}
                mode="farmer"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('farmer.deleteConsultationConfirm')}. {t('farmer.deleteConsultationConfirmDesc')}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? t('farmer.deletingConsultation') : t('farmer.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
