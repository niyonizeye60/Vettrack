"use client";

import AddConsultationForm from "@/components/dashboard/add-consultation-form";
import { useLanguage } from "@/contexts/LanguageContext";

interface NewConsultationContentProps {
  doctors: any[];
  farmerId: string;
}

export default function NewConsultationContent({ doctors, farmerId }: NewConsultationContentProps) {
  const { t } = useLanguage();
  
  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">{t('farmer.addNewConsultation')}</h1>
      <AddConsultationForm doctors={doctors} farmerId={farmerId} />
    </div>
  );
}