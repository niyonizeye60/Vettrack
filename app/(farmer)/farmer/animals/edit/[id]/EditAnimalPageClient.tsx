"use client"

import EditAnimalForm from "@/components/dashboard/edit-animal-form";
import { useLanguage } from "@/contexts/LanguageContext";

type Animal = {
  _id: string;
  name: string;
  type: string;
  breed: string;
  district: string;
  sector: string;
  class: string;
  ownerName: string;
  phoneNumber: string;
  price: number;
  status: string;
}

interface EditAnimalPageClientProps {
  animal: Animal;
  userId: string;
}

export default function EditAnimalPageClient({ animal, userId }: EditAnimalPageClientProps) {
  const { t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">{t('farmer.editAnimal')}</h1>
      <EditAnimalForm animal={animal} userId={userId} />
    </div>
  );
}