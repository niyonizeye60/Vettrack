export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { getConsultationById } from "@/lib/actions";
import { redirect } from "next/navigation";
import DeleteConsultationForm from "@/components/dashboard/delete-consultation-form";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function DeleteConsultationPage({ params }: PageProps) {
  const id = String(params.id);
  
  const currentUser = await getCurrentUser();
  
  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login");
  }
  
  const farmerId = currentUser._id.toString();
  const consultation = await getConsultationById(id, farmerId);
  
  if (!consultation) {
    notFound();
  }
  
  // Only pending consultations can be deleted
  if (consultation.status !== "pending") {
    redirect(`/farmer/consultations/${id}`);
  }
  
  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Delete Consultation</h1>
      <DeleteConsultationForm 
        consultation={consultation} 
        farmerId={farmerId} 
      />
    </div>
  );
} 