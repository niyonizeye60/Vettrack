"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, User, MapPin, Phone, Plus, Edit, CheckCircle, XCircle } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

const mockAppointments = [
  {
    id: "1",
    farmer: "John Doe",
    doctor: "Dr. Sarah Wilson",
    animal: "Cow - Bella",
    date: "2024-01-22",
    time: "10:00 AM",
    status: "scheduled",
    type: "routine",
    location: "Kigali, Nyarugenge"
  },
  {
    id: "2",
    farmer: "Mary Johnson",
    doctor: "Dr. Mike Brown",
    animal: "Goat - Charlie",
    date: "2024-01-22",
    time: "2:00 PM",
    status: "confirmed",
    type: "emergency",
    location: "Kigali, Gasabo"
  },
  {
    id: "3",
    farmer: "Peter Smith",
    doctor: "Dr. Sarah Wilson",
    animal: "Pig - Porky",
    date: "2024-01-23",
    time: "9:00 AM",
    status: "pending",
    type: "consultation",
    location: "Kigali, Kicukiro"
  }
]

const mockDoctors = [
  {
    id: "1",
    name: "Dr. Sarah Wilson",
    specialization: "Large Animals",
    availability: "Available",
    appointments: 5,
    rating: 4.8
  },
  {
    id: "2",
    name: "Dr. Mike Brown",
    specialization: "Small Animals",
    availability: "Busy",
    appointments: 8,
    rating: 4.9
  }
]

export default function AdminAppointments() {
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const { t } = useLanguage()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800"
      case "confirmed": return "bg-green-100 text-green-800"
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "completed": return "bg-gray-100 text-gray-800"
      case "cancelled": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "emergency": return "bg-red-100 text-red-800"
      case "routine": return "bg-green-100 text-green-800"
      case "consultation": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appointments">{t('admin.appointments')}</TabsTrigger>
          <TabsTrigger value="doctors">{t('admin.doctorAvailability')}</TabsTrigger>
          <TabsTrigger value="schedule">{t('admin.scheduleManagement')}</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          {/* Appointment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-blue-600">18</div>
                <p className="text-sm text-muted-foreground">{t('appointments.todaysAppointments')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">12</div>
                <p className="text-sm text-muted-foreground">{t('appointments.confirmed')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-yellow-600">4</div>
                <p className="text-sm text-muted-foreground">{t('appointments.pending')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-red-600">2</div>
                <p className="text-sm text-muted-foreground">{t('appointments.emergency')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('appointments.appointmentManagement')}</CardTitle>
                <Button onClick={() => setIsScheduleDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('appointments.scheduleAppointment')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('appointments.appointment')}</TableHead>
                    <TableHead>{t('appointments.doctor')}</TableHead>
                    <TableHead>{t('appointments.dateTime')}</TableHead>
                    <TableHead>{t('appointments.type')}</TableHead>
                    <TableHead>{t('appointments.status')}</TableHead>
                    <TableHead className="text-right">{t('appointments.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{appointment.farmer}</div>
                          <div className="text-sm text-gray-500">{appointment.animal}</div>
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {appointment.location}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{appointment.doctor}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm">{appointment.date}</div>
                            <div className="text-xs text-gray-500">{appointment.time}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(appointment.type)}>
                          {appointment.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedAppointment(appointment)
                              setIsAppointmentDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('appointments.doctorAvailability')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockDoctors.map((doctor) => (
                  <Card key={doctor.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{doctor.name}</h3>
                            <p className="text-sm text-gray-600">{doctor.specialization}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={doctor.availability === 'Available' ? 'default' : 'secondary'}>
                                {doctor.availability}
                              </Badge>
                              <span className="text-xs text-gray-500">★ {doctor.rating}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{doctor.appointments}</div>
                          <p className="text-xs text-gray-500">{t('appointments.todaysAppointments')}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Calendar className="h-4 w-4 mr-2" />
                          {t('appointments.viewSchedule')}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Phone className="h-4 w-4 mr-2" />
                          {t('appointments.contact')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('appointments.scheduleManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">{t('appointments.emergencyRouting')}</h4>
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{t('appointments.emergencyProtocol')}</p>
                          <p className="text-xs text-gray-600">{t('appointments.autoAssign')}</p>
                        </div>
                        <Badge variant="default">{t('appointments.active')}</Badge>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{t('appointments.responseTimeTarget')}</p>
                          <p className="text-xs text-gray-600">{t('appointments.thirtyMinutes')}</p>
                        </div>
                        <span className="text-sm font-medium text-green-600">{t('appointments.onTrack')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-4">{t('appointments.appointmentSlots')}</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">24</div>
                        <p className="text-xs text-gray-600">{t('appointments.available')}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">18</div>
                        <p className="text-xs text-gray-600">{t('appointments.booked')}</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-bold text-red-600">2</div>
                        <p className="text-xs text-gray-600">{t('appointments.blocked')}</p>
                      </div>
                    </div>
                    <Button className="w-full">
                      <Clock className="h-4 w-4 mr-2" />
                      {t('appointments.manageTimeSlots')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Appointment Detail Dialog */}
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('appointments.appointmentDetails')}</DialogTitle>
            <DialogDescription>
              {selectedAppointment && `Appointment #${selectedAppointment.id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('appointments.farmer')}</Label>
                  <p className="text-sm">{selectedAppointment.farmer}</p>
                </div>
                <div>
                  <Label>{t('appointments.doctor')}</Label>
                  <p className="text-sm">{selectedAppointment.doctor}</p>
                </div>
              </div>
              <div>
                <Label>{t('appointments.status')}</Label>
                <Select defaultValue={selectedAppointment.status}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">{t('appointments.scheduled')}</SelectItem>
                    <SelectItem value="confirmed">{t('appointments.confirmed')}</SelectItem>
                    <SelectItem value="completed">{t('appointments.completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('appointments.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('appointments.date')}</Label>
                  <Input type="date" defaultValue={selectedAppointment.date} />
                </div>
                <div>
                  <Label>{t('appointments.time')}</Label>
                  <Input type="time" defaultValue="10:00" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAppointmentDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button>{t('appointments.updateAppointment')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Appointment Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('appointments.scheduleNewAppointment')}</DialogTitle>
            <DialogDescription>{t('appointments.createNewAppointment')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('appointments.farmer')}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t('appointments.selectFarmer')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="john">John Doe</SelectItem>
                  <SelectItem value="mary">Mary Johnson</SelectItem>
                  <SelectItem value="peter">Peter Smith</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('appointments.doctor')}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t('appointments.selectDoctor')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sarah">Dr. Sarah Wilson</SelectItem>
                  <SelectItem value="mike">Dr. Mike Brown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('appointments.date')}</Label>
                <Input type="date" />
              </div>
              <div>
                <Label>{t('appointments.time')}</Label>
                <Input type="time" />
              </div>
            </div>
            <div>
              <Label>{t('appointments.type')}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t('appointments.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">{t('appointments.routine')}</SelectItem>
                  <SelectItem value="emergency">{t('appointments.emergency')}</SelectItem>
                  <SelectItem value="consultation">{t('appointments.consultation')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button>{t('appointments.scheduleAppointment')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}