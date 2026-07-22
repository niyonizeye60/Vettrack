"use client";

import { useRouter } from "next/navigation";
import AddConsultationForm from "@/components/dashboard/add-consultation-form";

interface NewConsultationContentProps {
  doctors: any[];
  farmerId: string;
  sickAnimals?: any[];
}

export default function NewConsultationContent({ doctors, farmerId, sickAnimals = [] }: NewConsultationContentProps) {
  const router = useRouter();
  return (
    <div className="max-w-xl mx-auto py-8">
      <AddConsultationForm
        doctors={doctors}
        farmerId={farmerId}
        sickAnimals={sickAnimals}
        onSuccess={() => router.push("/farmer/consultations")}
        onCancel={() => router.back()}
      />
    </div>
  );
}