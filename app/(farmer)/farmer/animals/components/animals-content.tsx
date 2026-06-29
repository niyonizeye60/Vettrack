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
import Link from "next/link"
import { Bell, Eye, Pencil, Trash2, AlertTriangle } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { deleteAnimal } from "@/lib/actions"

interface AnimalsContentProps {
  animals: any[]
  farmerId: string
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-right text-gray-800">{value}</span>
    </div>
  )
}

export default function AnimalsContent({ animals, farmerId }: AnimalsContentProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()

  const [detailAnimal, setDetailAnimal] = useState<any | null>(null)
  const [deleteAnimalTarget, setDeleteAnimalTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [inseminationRecords, setInseminationRecords] = useState<any[]>([])
  const [recordsLoaded, setRecordsLoaded] = useState(false)

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

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('farmer.myAnimals')}</h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('farmer.registeredAnimals')}: <span className="font-semibold">{animals.length}</span>
          </p>
        </div>
        <div className="flex space-x-2">
          <Button asChild size="sm">
            <Link href="/farmer/animals/add">{t('farmer.registerNewAnimal')}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('farmer.animalsInventory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {animals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>{t('farmer.noAnimalsYet')}</p>
              <p className="mt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/farmer/animals/add">{t('farmer.registerAnAnimal')}</Link>
                </Button>
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('farmer.name')}</TableHead>
                  <TableHead>{t('farmer.type')}</TableHead>
                  <TableHead>{t('farmer.breed')}</TableHead>
                  <TableHead>{t('farmer.insuranceId')}</TableHead>
                  <TableHead>{t('animal.earTagId')}</TableHead>
                  <TableHead>{t('farmer.acquisitionType')}</TableHead>
                  <TableHead>{t('farmer.location')}</TableHead>
                  <TableHead>{t('farmer.status')}</TableHead>
                  <TableHead>{t('farmer.gender')}</TableHead>
                  <TableHead>{t('farmer.price')}</TableHead>
                  <TableHead>{t('farmer.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {animals.map((animal) => (
                  <TableRow key={animal._id}>
                    <TableCell className="font-medium">{animal.name}</TableCell>
                    <TableCell>{animal.type}</TableCell>
                    <TableCell>{animal.breed}</TableCell>
                    <TableCell>{animal.insuranceId}</TableCell>
                    <TableCell>{animal.earTagId}</TableCell>
                    <TableCell>{animal.acquisitionType}</TableCell>
                    <TableCell>{animal.district}, {animal.sector}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(animal.status)}>
                        {getStatusText(animal.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{animal.gender ? t(`farmer.${animal.gender}`) : t('farmer.undefined')}</TableCell>
                    <TableCell>RWF {animal.price}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-emerald-50"
                          title={t('farmer.viewDetails')}
                          onClick={() => setDetailAnimal(animal)}
                        >
                          <Eye className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-emerald-50"
                          title={t('farmer.edit')}
                          asChild
                        >
                          <Link href={`/farmer/animals/edit/${animal._id}`}>
                            <Pencil className="h-3.5 w-3.5 text-emerald-600" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-red-50"
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
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailAnimal} onOpenChange={(open) => !open && setDetailAnimal(null)}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600" />
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
