export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { getConsultationById } from "@/lib/actions";
import { redirect } from "next/navigation";
import ConsultationDetailContent from "./components/consultation-detail-content";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ConsultationDetailPage({ params }: PageProps) {
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
  
  // Doctor name is resolved server-side by getConsultationById.
  const doctorName = consultation.doctorName || "Unknown Doctor";

  return (
    <ConsultationDetailContent
      consultation={consultation}
      doctorName={doctorName}
      farmerId={farmerId}
    />
  );
} 