import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, User } from "lucide-react"
import Link from "next/link"

export default function ConsultationRequests() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Upcoming Consultations</CardTitle>
        <Button asChild size="sm" variant="ghost">
          <Link href="/dashboard/consultations">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[
            {
              id: "C001",
              doctor: "Dr. Jean Mugisha",
              date: "May 10, 2023",
              time: "10:00 AM",
              type: "Virtual",
            },
            {
              id: "C002",
              doctor: "Dr. Alice Uwimana",
              date: "May 15, 2023",
              time: "2:30 PM",
              type: "In-Person",
            },
          ].map((consultation) => (
            <div key={consultation.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{consultation.type} Consultation</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{consultation.id}</span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{consultation.doctor}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{consultation.date}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{consultation.time}</span>
                </div>
              </div>
              <div className="mt-3 flex space-x-2">
                <Button size="sm" className="w-full">
                  Join
                </Button>
                <Button size="sm" variant="outline" className="w-full">
                  Reschedule
                </Button>
              </div>
            </div>
          ))}

          <div className="pt-2">
            <Button asChild className="w-full">
              <Link href="/dashboard/consultations/new">Request Consultation</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
