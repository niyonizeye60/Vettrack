"use client";

import AddConsultationForm from "@/components/dashboard/add-consultation-form";

interface NewConsultationContentProps {
  doctors: any[];
  farmerId: string;
}

export default function NewConsultationContent({ doctors, farmerId }: NewConsultationContentProps) {
  return (
    <div className="max-w-xl mx-auto py-8">
      <AddConsultationForm doctors={doctors} farmerId={farmerId} />
    </div>
  );
}