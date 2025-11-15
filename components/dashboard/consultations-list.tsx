import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import Link from "next/link"
import { getConsultations } from "@/lib/actions"

export default async function ConsultationsList() {
  const consultations = await getConsultations()

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <CardTitle>Consultations</CardTitle>
        <div className="flex space-x-2">
          <Button asChild size="sm">
            <Link href="/dashboard/consultations/new">New Consultation</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultations.map((consultation: any) => (
                <TableRow key={consultation._id}>
                  <TableCell className="font-medium">{consultation._id}</TableCell>
                  <TableCell>{consultation.service}</TableCell>
                  <TableCell>{consultation.doctor || consultation.name || "-"}</TableCell>
                  <TableCell>{consultation.date}</TableCell>
                  <TableCell>{consultation.time}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        consultation.type === "Virtual"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-purple-100 text-purple-800 border-purple-200"
                      }
                    >
                      {consultation.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        consultation.status === "Upcoming" || consultation.status === "Pending"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }
                    >
                      {consultation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/consultations/${consultation._id}`}>
                          <Bell className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Link>
                      </Button>
                      {consultation.status === "Upcoming" && consultation.type === "Virtual" && (
                        <Button variant="ghost" size="icon" className="text-blue-500">
                          <Bell className="h-4 w-4" />
                          <span className="sr-only">Join</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
