"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Bell, Eye, Pencil, Plus, Trash2, AlertTriangle, Search, PawPrint } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { deleteAnimal } from "@/lib/actions"
import AddAnimalForm from "@/components/dashboard/add-animal-form"
import EditAnimalForm from "@/components/dashboard/edit-animal-form"

interface AnimalsContentProps {
  animals: any[]
  farmerId: string
  openAdd?: boolean
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-right text-gray-800">{value}</span>
    </div>
  )
}

export default function AnimalsContent({ animals, farmerId, openAdd }: AnimalsContentProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()

  const [addOpen, setAddOpen] = useState(openAdd ?? false)
  const [editAnimal, setEditAnimal] = useState<any | null>(null)
  const [detailAnimal, setDetailAnimal] = useState<any | null>(null)
  const [deleteAnimalTarget, setDeleteAnimalTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [inseminationRecords, setInseminationRecords] = useState<any[]>([])
  const [recordsLoaded, setRecordsLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    let cancelled = false
    async function loadInseminationRecords() {
      try {
        const res = await fetch(`/api/insemination?farmerId=${farmerId}`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setInseminationRecords(data)
      } catch (error) {
        console.error("Error loading insemination records:", error)
      } finally {
        if (!cancelled) setRecordsLoaded(true)
      }
    }
    loadInseminationRecords()
    return () => { cancelled = true }
  }, [farmerId])

  const getPregnancy = (animalId: string) => {
    const today = new Date().toISOString().split("T")[0]
    return inseminationRecords.find(
      (r) =>
        r.animalId === animalId &&
        r.expectedBirthDate &&
        r.expectedBirthDate >= today &&
        !r.deliveredBabies &&
        !r.pregnancyFailed
    )
  }

  const getStatusColor = (status: string) =>
    status === "Healthy" ? "bg-green-100 text-green-800" :
    status === "Sick" ? "bg-yellow-100 text-yellow-800" :
    status === "Under Treatment" ? "bg-blue-100 text-blue-800" :
    "bg-gray-100 text-gray-800"

  const getStatusText = (status: string) =>
    status === "Healthy" ? t('farmer.healthy') :
    status === "Sick" ? t('farmer.sick') :
    status === "Under Treatment" ? t('farmer.underTreatment') :
    status

  const handleDelete = async () => {
    if (!deleteAnimalTarget) return
    setDeleting(true)
    try {
      const result = await deleteAnimal(deleteAnimalTarget._id, farmerId)
      if (result.success) {
        router.refresh()
      } else {
        toast({ title: t('farmer.actionFailed'), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deleting animal:", error)
      toast({ title: t('farmer.actionFailed'), variant: "destructive" })
    } finally {
      setDeleting(false)
      setDeleteAnimalTarget(null)
    }
  }

  const deletePregnancy = deleteAnimalTarget ? getPregnancy(deleteAnimalTarget._id) : null

  const filteredAnimals = animals.filter((a) => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return true
    return (
      a.name?.toLowerCase().includes(q) ||
      a.type?.toLowerCase().includes(q) ||
      a.breed?.toLowerCase().includes(q) ||
      a.insuranceId?.toLowerCase().includes(q) ||
      a.earTagId?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('farmer.myAnimals')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('farmer.registeredAnimals')}: <span className="font-semibold">{animals.length}</span>
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          {t('farmer.registerNewAnimal')}
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <PawPrint className="h-5 w-5 text-green-600" />
              {t('farmer.animalsInventory')}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('farmer.searchAnimals') || "Search animals…"}
                className="pl-9 bg-white h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {animals.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <PawPrint className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium">{t('farmer.noAnimalsYet')}</p>
              <p className="mt-3">
                <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                  {t('farmer.registerAnAnimal')}
                </Button>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-600">{t('farmer.name')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.type')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.breed')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.insuranceId')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('animal.earTagId')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.acquisitionType')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.location')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.status')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.gender')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.price')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('farmer.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnimals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12">
                        <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                          <PawPrint className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">{t('farmer.noResultsFound') || "No animals match your search"}</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredAnimals.map((animal) => (
                    <TableRow key={animal._id} className="hover:bg-gray-50/80 transition-colors duration-150">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                            <PawPrint className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <span className="font-medium text-gray-800 text-sm">{animal.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{animal.type}</TableCell>
                      <TableCell className="text-sm text-gray-600">{animal.breed}</TableCell>
                      <TableCell className="text-sm text-gray-600">{animal.insuranceId || <span className="text-gray-400">—</span>}</TableCell>
                      <TableCell className="text-sm text-gray-600">{animal.earTagId || <span className="text-gray-400">—</span>}</TableCell>
                      <TableCell className="text-sm text-gray-600">{animal.acquisitionType || <span className="text-gray-400">—</span>}</TableCell>
                      <TableCell className="text-sm text-gray-600">{animal.district}, {animal.sector}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(animal.status)}>
                          {getStatusText(animal.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{animal.gender ? t(`farmer.${animal.gender}`) : t('farmer.undefined')}</TableCell>
                      <TableCell className="text-sm text-gray-600">RWF {animal.price}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => setDetailAnimal(animal)}
                          >
                            {t('farmer.view')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => setEditAnimal(animal)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />{t('farmer.edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-red-50 shrink-0"
                            title={t('farmer.delete')}
                            disabled={!recordsLoaded}
                            onClick={() => setDeleteAnimalTarget(animal)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Animal Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => !open && setAddOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('farmer.addAnimal')}</DialogTitle>
          </DialogHeader>
          <AddAnimalForm
            userId={farmerId}
            onSuccess={() => { setAddOpen(false); router.refresh() }}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Animal Dialog */}
      <Dialog open={!!editAnimal} onOpenChange={(open) => !open && setEditAnimal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('farmer.editAnimal')}</DialogTitle>
          </DialogHeader>
          {editAnimal && (
            <EditAnimalForm
              animal={editAnimal}
              farmerId={farmerId}
              onSuccess={() => { setEditAnimal(null); router.refresh() }}
              onCancel={() => setEditAnimal(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailAnimal} onOpenChange={(open) => !open && setDetailAnimal(null)}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              {t('animal.details')}
            </DialogTitle>
          </DialogHeader>

          {detailAnimal && (
            <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-2">
              <div className="border rounded-lg p-4 space-y-1 bg-white">
                <DetailRow label={t('farmer.name')} value={detailAnimal.name} />
                <DetailRow label={t('farmer.type')} value={detailAnimal.type} />
                <DetailRow label={t('animal.breed')} value={detailAnimal.breed} />
                <DetailRow label={t('animal.class')} value={detailAnimal.class} />
                <DetailRow label={t('animal.earTagId')} value={detailAnimal.earTagId || t('farmer.notAvailable')} />
                <DetailRow label={t('farmer.insuranceId')} value={detailAnimal.insuranceId || t('farmer.notAvailable')} />
                <DetailRow label={t('animal.location')} value={`${detailAnimal.district}, ${detailAnimal.sector}`} />
                <DetailRow label={t('animal.price')} value={`RWF ${detailAnimal.price}`} />
                <DetailRow label={t('animal.owner')} value={detailAnimal.ownerName} />
                <DetailRow label={t('animal.phone')} value={detailAnimal.phoneNumber} />
                <DetailRow
                  label={t('farmer.acquisitionType')}
                  value={detailAnimal.acquisitionType ? t(`farmer.${detailAnimal.acquisitionType}`) : t('farmer.notAvailable')}
                />
                <DetailRow
                  label={t('farmer.gender')}
                  value={detailAnimal.gender ? t(`farmer.${detailAnimal.gender}`) : t('farmer.undefined')}
                />
                <DetailRow
                  label={t('farmer.status')}
                  value={
                    <Badge className={getStatusColor(detailAnimal.status)}>
                      {getStatusText(detailAnimal.status)}
                    </Badge>
                  }
                />
                <DetailRow
                  label={t('animal.registeredOn')}
                  value={new Date(detailAnimal.createdAt).toLocaleDateString()}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAnimalTarget} onOpenChange={(open) => !deleting && !open && setDeleteAnimalTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAnimalTarget && t('animal.deleteAnimalConfirm').replace('{name}', deleteAnimalTarget.name)}.{" "}
              {t('animal.deleteAnimalConfirmDesc')}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deletePregnancy && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('animal.pregnancyWarningTitle')}</AlertTitle>
              <AlertDescription>
                {t('animal.pregnancyWarningDesc').replace('{date}', deletePregnancy.expectedBirthDate)}
              </AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? t('common.deleting') : t('animal.deleteAnimal')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
