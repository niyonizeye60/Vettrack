export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/actions/auth";
import { getConsultationById, getDoctorsList } from "@/lib/actions";
import { redirect } from "next/navigation";
import EditConsultationForm from "@/components/dashboard/edit-consultation-form";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditConsultationPage({ params }: PageProps) {
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
  
  // Only pending consultations can be edited
  if (consultation.status !== "pending") {
    redirect(`/farmer/consultations/${id}`);
  }
  
  const doctors = await getDoctorsList();

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Consultation</h1>
        <Link 
          href={`/farmer/consultations/${id}`} 
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Cancel and return to details
        </Link>
      </div>
      <EditConsultationForm 
        consultation={consultation} 
        doctors={doctors} 
        farmerId={farmerId} 
      />
    </div>
  );
} 