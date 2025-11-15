'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { deleteAnimal } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface AnimalDetailsClientProps {
  animal: any;
  animalId: string;
}

export function AnimalDetailsClient({ animal, animalId }: AnimalDetailsClientProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const handleDelete = async () => {
    await deleteAnimal(animalId);
    router.push("/farmer/animals");
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
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-500">{t('animal.registeredOn')}</h3>
              <p>{new Date(animal.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 flex justify-between">
          <Button type="button" variant="destructive" onClick={handleDelete}>
            {t('animal.deleteAnimal')}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/farmer/animals/edit/${animalId}`}>{t('animal.editAnimal')}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}