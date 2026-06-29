'use client'

import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { deleteAnimal } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface AnimalDetailsClientProps {
  animal: any;
  animalId: string;
  farmerId: string;
}

export function AnimalDetailsClient({ animal, animalId, farmerId }: AnimalDetailsClientProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkingPregnancy, setCheckingPregnancy] = useState(true);
  const [pregnancy, setPregnancy] = useState<{ expectedBirthDate: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkPregnancy() {
      try {
        const res = await fetch(`/api/insemination?farmerId=${farmerId}`);
        const records = await res.json();
        if (cancelled || !Array.isArray(records)) return;
        const today = new Date().toISOString().split("T")[0];
        const active = records.find(
          (r: any) =>
            r.animalId === animalId &&
            r.expectedBirthDate &&
            r.expectedBirthDate >= today &&
            !r.deliveredBabies &&
            !r.pregnancyFailed
        );
        setPregnancy(active ? { expectedBirthDate: active.expectedBirthDate } : null);
      } catch (error) {
        console.error("Error checking pregnancy status:", error);
      } finally {
        if (!cancelled) setCheckingPregnancy(false);
      }
    }
    checkPregnancy();
    return () => { cancelled = true };
  }, [animalId, farmerId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteAnimal(animalId, farmerId);
      if (result.success) {
        router.push("/farmer/animals");
        router.refresh();
      } else {
        toast({ title: t('farmer.actionFailed'), variant: "destructive" });
        setDeleting(false);
        setDeleteOpen(false);
      }
    } catch (error) {
      console.error("Error deleting animal:", error);
      toast({ title: t('farmer.actionFailed'), variant: "destructive" });
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case "Healthy":
        return t('farmer.healthy');
      case "Sick":
        return t('farmer.sick');
      case "Under Treatment":
        return t('farmer.underTreatment');
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('animal.details')}</h1>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href="/farmer/animals">{t('animal.backToAnimals')}</Link>
          </Button>
        </div>
      </div>
      
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50">
          <div className="flex justify-between items-center">
            <CardTitle>
              {animal.name}
              <Badge className="ml-2">{animal.type}</Badge>
            </CardTitle>
            <Badge 
              variant="outline"
              className={
                animal.status === "Healthy"
                  ? "bg-green-100 text-green-800"
                  : animal.status === "Sick"
                  ? "bg-yellow-100 text-yellow-800"
                  : animal.status === "Under Treatment"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }
            >
              {getStatusTranslation(animal.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('animal.breed')}</h3>
              <p>{animal.breed}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('animal.class')}</h3>
              <p>{animal.class}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('animal.earTagId')}</h3>
              <p>{animal.earTagId || t('farmer.notAvailable')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('animal.location')}</h3>
              <p>{animal.district}, {animal.sector}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('animal.price')}</h3>
              <p>RWF {animal.price}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('animal.owner')}</h3>
              <p>{animal.ownerName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('animal.phone')}</h3>
              <p>{animal.phoneNumber}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('farmer.acquisitionType')}</h3>
              <p>{t(`farmer.${animal.acquisitionType}`)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('farmer.gender')}</h3>
              <p>{t(`farmer.${animal.gender}`)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('farmer.insuranceId')}</h3>
              <p>{animal.insuranceId || t('farmer.notAvailable')}</p>
            </div>
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-500">{t('animal.registeredOn')}</h3>
              <p>{new Date(animal.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 flex justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={checkingPregnancy}
          >
            {checkingPregnancy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('animal.checkingPregnancy')}
              </>
            ) : (
              t('animal.deleteAnimal')
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/farmer/animals/edit/${animalId}`}>{t('animal.editAnimal')}</Link>
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('farmer.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('animal.deleteAnimalConfirm').replace('{name}', animal.name)}.{" "}
              {t('animal.deleteAnimalConfirmDesc')}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pregnancy && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('animal.pregnancyWarningTitle')}</AlertTitle>
              <AlertDescription>
                {t('animal.pregnancyWarningDesc').replace('{date}', pregnancy.expectedBirthDate)}
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
  );
}