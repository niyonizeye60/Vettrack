import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import NewConsultationContent from "./new-consultation-content";
import { getDoctorsList } from "@/lib/actions";

export default async function NewConsultationPage() {
  const currentUser = await getCurrentUser();
  
  // Redirect if not logged in or not a farmer
  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login");
  }
  
  const doctors = await getDoctorsList();
  
  return (
    <NewConsultationContent 
      doctors={doctors} 
      farmerId={currentUser._id.toString()} 
    />
  );
} 