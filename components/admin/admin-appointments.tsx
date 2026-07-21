"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, User, Phone, Plus, Edit, CheckCircle, XCircle, Loader2, CalendarX, X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"

interface Appointment {
  id: string
  fullName: string
  phoneNumber: string
  service: string
  date: string
  time: string
  type: string
  status: string
  createdAt: string
  doctorId: string | null
  doctorName: string | null
  farmerId: string | null
  feedback: string | null
  animalName: string | null
  animalType: string | null
  animalBreed: string | null
}

interface Doctor {
  id: string
  name: string
  email: string
  specialization: string
  phone: string
  status: string
}

interface Farmer {
  id: string
  name: string
  phone: string
}

const STATUSES = ["pending", "accepted", "rejected", "completed"]
const TYPES = ["Virtual", "In-Person"]

export default function AdminAppointments() {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("appointments")
  const [doctorFilter, setDoctorFilter] = useState<string | null>(null)

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editStatus, setEditStatus] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")

  const [scheduleFarmerId, setScheduleFarmerId] = useState("")
  const [scheduleDoctorId, setScheduleDoctorId] = useState("")
  const [scheduleService, setScheduleService] = useState("")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [scheduleType, setScheduleType] = useState("")

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const res = await fetch("/api/admin/appointments")
      const json = await res.json()
      if (res.ok) {
        setAppointments(json.appointments)
        setDoctors(json.doctors)
        setFarmers(json.farmers)
      }
    } catch (error) {
      console.error("Failed to load appointments:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData({ silent: true }), 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCount = appointments.filter((a) => a.date === todayStr).length
  const pendingCount = appointments.filter((a) => a.status === "pending").length
  const acceptedCount = appointments.filter((a) => a.status === "accepted").length
  const completedCount = appointments.filter((a) => a.status === "completed").length
  const rejectedCount = appointments.filter((a) => a.status === "rejected").length
  const virtualCount = appointments.filter((a) => a.type === "Virtual").length
  const inPersonCount = appointments.filter((a) => a.type === "In-Person").length
  const overdueCount = appointments.filter(
    (a) => a.status === "pending" && Date.now() - new Date(a.createdAt).getTime() > 30 * 60 * 1000
  ).length

  const visibleAppointments = doctorFilter
    ? appointments.filter((a) => a.doctorId === doctorFilter)
    : appointments

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "accepted": return "bg-green-100 text-green-800"
      case "completed": return "bg-blue-100 text-blue-800"
      case "rejected": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => t(`appointments.${status}`) || status

  const getTypeText = (type: string) => {
    if (type === "Virtual") return t("appointments.virtual")
    if (type === "In-Person") return t("appointments.inPerson")
    return type
  }

  const openEditDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setEditStatus(appointment.status)
    setEditDate(appointment.date)
    setEditTime(appointment.time)
    setIsAppointmentDialogOpen(true)
  }

  const handleQuickStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast({ title: t("appointments.updateSuccess") })
        fetchData({ silent: true })
      } else {
        toast({ title: t("common.error"), description: t("appointments.updateFailed"), variant: "destructive" })
      }
    } catch {
      toast({ title: t("common.error"), description: t("appointments.updateFailed"), variant: "destructive" })
    }
  }

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/appointments/${selectedAppointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, date: editDate, time: editTime }),
      })
      if (res.ok) {
        toast({ title: t("appointments.updateSuccess") })
        setIsAppointmentDialogOpen(false)
        fetchData({ silent: true })
      } else {
        toast({ title: t("common.error"), description: t("appointments.updateFailed"), variant: "destructive" })
      }
    } catch {
      toast({ title: t("common.error"), description: t("appointments.updateFailed"), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const resetScheduleForm = () => {
    setScheduleFarmerId("")
    setScheduleDoctorId("")
    setScheduleService("")
    setScheduleDate("")
    setScheduleTime("")
    setScheduleType("")
  }

  const handleScheduleAppointment = async () => {
    if (!scheduleFarmerId || !scheduleDoctorId || !scheduleService || !scheduleDate || !scheduleTime || !scheduleType) {
      toast({ title: t("common.error"), description: t("appointments.scheduleFailed"), variant: "destructive" })
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: scheduleFarmerId,
          doctorId: scheduleDoctorId,
          service: scheduleService,
          date: scheduleDate,
          time: scheduleTime,
          type: scheduleType,
        }),
      })
      if (res.ok) {
        toast({ title: t("appointments.scheduleSuccess") })
        setIsScheduleDialogOpen(false)
        resetScheduleForm()
        fetchData({ silent: true })
      } else {
        toast({ title: t("common.error"), description: t("appointments.scheduleFailed"), variant: "destructive" })
      }
    } catch {
      toast({ title: t("common.error"), description: t("appointments.scheduleFailed"), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const viewDoctorSchedule = (doctorId: string) => {
    setDoctorFilter(doctorId)
    setActiveTab("appointments")
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appointments">{t('admin.appointments')}</TabsTrigger>
          <TabsTrigger value="doctors">{t('admin.doctorAvailability')}</TabsTrigger>
          <TabsTrigger value="schedule">{t('admin.scheduleManagement')}</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          {/* Appointment Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4 sm:p-5">
                <p className="text-sm text-gray-500 font-medium">{t('appointments.todaysAppointments')}</p>
                <h3 className="text-2xl font-bold text-blue-600 mt-2">{todayCount}</h3>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4 sm:p-5">
                <p className="text-sm text-gray-500 font-medium">{t('appointments.pending')}</p>
                <h3 className="text-2xl font-bold text-yellow-600 mt-2">{pendingCount}</h3>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4 sm:p-5">
                <p className="text-sm text-gray-500 font-medium">{t('appointments.accepted')}</p>
                <h3 className="text-2xl font-bold text-green-600 mt-2">{acceptedCount}</h3>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4 sm:p-5">
                <p className="text-sm text-gray-500 font-medium">{t('appointments.completed')}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{completedCount}</h3>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold text-gray-900">{t('appointments.appointmentManagement')}</CardTitle>
                  {doctorFilter && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      {doctors.find((d) => d.id === doctorFilter)?.name}
                      <button onClick={() => setDoctorFilter(null)} aria-label="Clear filter">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
                <Button onClick={() => setIsScheduleDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('appointments.scheduleAppointment')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : visibleAppointments.length === 0 ? (
                <div className="text-center py-16">
                  <CalendarX className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">{t('appointments.noAppointmentsFound')}</p>
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-600">{t('appointments.appointment')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('appointments.doctor')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('appointments.dateTime')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('appointments.type')}</TableHead>
                    <TableHead className="font-semibold text-gray-600">{t('appointments.status')}</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600">{t('appointments.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAppointments.map((appointment) => (
                    <TableRow key={appointment.id} className="hover:bg-gray-50/80 transition-colors duration-150">
                      <TableCell>
                        <div>
                          <div className="font-medium">{appointment.fullName}</div>
                          <div className="text-sm text-gray-500">
                            {appointment.animalName
                              ? `${appointment.animalName}${appointment.animalType ? ` · ${appointment.animalType}` : ""}`
                              : appointment.service}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {appointment.phoneNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{appointment.doctorName || <span className="text-gray-400">{t('appointments.unassigned')}</span>}</TableCell>
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
                        <Badge variant="outline">
                          {getTypeText(appointment.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(appointment.status)}>
                          {getStatusText(appointment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(appointment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {appointment.status === "pending" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleQuickStatus(appointment.id, "accepted")}>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleQuickStatus(appointment.id, "rejected")}>
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctors" className="space-y-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100">
              <CardTitle className="text-base font-semibold text-gray-900">{t('appointments.doctorAvailability')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : doctors.length === 0 ? (
                <div className="text-center py-16 text-sm text-gray-500">{t('appointments.noDoctorsYet')}</div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((doctor) => {
                  const doctorToday = appointments.filter((a) => a.doctorId === doctor.id && a.date === todayStr).length
                  return (
                    <Card key={doctor.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
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
                                <Badge variant={doctor.status === 'active' ? 'default' : 'secondary'}>
                                  {t(`admin.${doctor.status}`) || doctor.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">{doctorToday}</div>
                            <p className="text-xs text-gray-500">{t('appointments.todaysAppointments')}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => viewDoctorSchedule(doctor.id)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            {t('appointments.viewSchedule')}
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" disabled={!doctor.phone} asChild={!!doctor.phone}>
                            {doctor.phone ? (
                              <a href={`tel:${doctor.phone}`}>
                                <Phone className="h-4 w-4 mr-2" />
                                {t('appointments.contact')}
                              </a>
                            ) : (
                              <span>
                                <Phone className="h-4 w-4 mr-2" />
                                {t('appointments.contact')}
                              </span>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100">
              <CardTitle className="text-base font-semibold text-gray-900">{t('appointments.scheduleManagement')}</CardTitle>
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
                        {overdueCount === 0 ? (
                          <span className="text-sm font-medium text-green-600">{t('appointments.onTrack')}</span>
                        ) : (
                          <span className="text-sm font-medium text-red-600">{overdueCount} {t('appointments.overdue')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">{t('appointments.appointmentBreakdown')}</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{virtualCount}</div>
                        <p className="text-xs text-gray-600">{t('appointments.virtual')}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{inPersonCount}</div>
                        <p className="text-xs text-gray-600">{t('appointments.inPerson')}</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-bold text-red-600">{rejectedCount}</div>
                        <p className="text-xs text-gray-600">{t('appointments.rejected')}</p>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => setIsScheduleDialogOpen(true)}>
                      <Clock className="h-4 w-4 mr-2" />
                      {t('appointments.scheduleAppointment')}
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
              {selectedAppointment && `${selectedAppointment.service}`}
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('appointments.farmer')}</Label>
                  <p className="text-sm">{selectedAppointment.fullName}</p>
                </div>
                <div>
                  <Label>{t('appointments.doctor')}</Label>
                  <p className="text-sm">{selectedAppointment.doctorName || t('appointments.unassigned')}</p>
                </div>
              </div>
              <div>
                <Label>{t('appointments.status')}</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`appointments.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('appointments.date')}</Label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </div>
                <div>
                  <Label>{t('appointments.time')}</Label>
                  <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAppointmentDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateAppointment} disabled={isSaving}>
              {isSaving ? t('common.loading') : t('appointments.updateAppointment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Appointment Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={(open) => { setIsScheduleDialogOpen(open); if (!open) resetScheduleForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('appointments.scheduleNewAppointment')}</DialogTitle>
            <DialogDescription>{t('appointments.createNewAppointment')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('appointments.farmer')}</Label>
              <Select value={scheduleFarmerId} onValueChange={setScheduleFarmerId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('appointments.selectFarmer')} />
                </SelectTrigger>
                <SelectContent>
                  {farmers.map((farmer) => (
                    <SelectItem key={farmer.id} value={farmer.id}>{farmer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('appointments.service')}</Label>
              <Input value={scheduleService} onChange={(e) => setScheduleService(e.target.value)} placeholder={t('appointments.enterService')} />
            </div>
            <div>
              <Label>{t('appointments.doctor')}</Label>
              <Select value={scheduleDoctorId} onValueChange={setScheduleDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('appointments.selectDoctor')} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}{doc.specialization ? ` (${doc.specialization})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('appointments.date')}</Label>
                <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </div>
              <div>
                <Label>{t('appointments.time')}</Label>
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t('appointments.type')}</Label>
              <Select value={scheduleType} onValueChange={setScheduleType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('appointments.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{getTypeText(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleScheduleAppointment} disabled={isSaving}>
              {isSaving ? t('common.loading') : t('appointments.scheduleAppointment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
