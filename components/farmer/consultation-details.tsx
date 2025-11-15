"use server";

import { notFound } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/actions/auth"
import { getConsultationById, getDoctorsList } from "@/lib/actions"
import { redirect } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, MessageSquare } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ConsultationDetailsProps {
  id: string;
}

export default async function ConsultationDetails({ id }: ConsultationDetailsProps) {
  const currentUser = await getCurrentUser();
  
  // Redirect if not logged in or not a farmer
  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login");
  }
  
  const farmerId = currentUser._id.toString();
  const consultation = await getConsultationById(id, farmerId);
  
  if (!consultation) {
    notFound();
  }
  
  // Get doctor info if available
  let doctorName = "Unknown Doctor";
  if (consultation.doctor) {
    const doctors = await getDoctorsList();
    const doctor = doctors.find(d => d._id === consultation.doctor);
    if (doctor) {
      doctorName = doctor.name;
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Consultation Details</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/farmer/consultations">Back to All Consultations</Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Consultation for {consultation.service}</CardTitle>
          <div className="mt-1">
            <Badge className={getStatusColor(consultation.status)}>
              {consultation.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {consultation.feedback && (
            <Alert className="mb-6" variant={consultation.status === "rejected" ? "destructive" : "default"}>
              <MessageSquare className="h-4 w-4" />
              <AlertTitle>
                {consultation.status === "accepted" ? "Accepted" : 
                 consultation.status === "rejected" ? "Rejected" : 
                 consultation.status === "completed" ? "Completed" : ""} with feedback
              </AlertTitle>
              <AlertDescription>
                {consultation.feedback}
              </AlertDescription>
            </Alert>
          )}
          
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.fullName}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.phoneNumber}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Service</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.service}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Doctor</dt>
              <dd className="mt-1 text-sm text-gray-900">{doctorName}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.date}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Time</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.time}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{consultation.type}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <Badge className={getStatusColor(consultation.status)}>
                  {consultation.status}
                </Badge>
              </dd>
            </div>
            
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(consultation.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </CardContent>
        {consultation.status === "pending" && (
          <CardFooter className="flex justify-end space-x-4 pt-4 border-t">
            <Button asChild variant="secondary" size="lg">
              <Link href={`/farmer/consultations/${id}/edit`}>
                Edit Consultation
              </Link>
            </Button>
            <Button asChild variant="destructive" size="lg">
              <Link href={`/farmer/consultations/${id}/delete`}>
                Delete Consultation
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 