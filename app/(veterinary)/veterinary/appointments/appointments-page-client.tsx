"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Calendar, CheckCircle, Clock, MessageSquare, PawPrint, Phone, User, Video, MapPin
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { updateConsultationStatus } from "@/lib/actions"
import { useRouter } from "next/navigation"

interface Appointment {
  _id: string
  fullName: string
  phoneNumber: string
  service: string
  date: string
  time: string
  type: string
  status: string
  animalName?: string
  animalType?: string
  feedback?: string
}

interface AppointmentsPageClientProps {
  upcoming: Appointment[]
  past: Appointment[]
}

export default function AppointmentsPageClient({ upcoming, past }: AppointmentsPageClientProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()

  const [selected, setSelected] = useState<Appointment | null>(null)
  const [feedback, setFeedback] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleComplete = async () => {
    if (!selected) return
    setLoadingId(selected._id)
    try {
      const result = await updateConsultationStatus(selected._id, "completed", feedback.trim() || undefined)
      if (result.success) {
        toast({ title: t('vet.markedComplete'), description: t('vet.markedCompleteDesc') })
        setSelected(null)
        setFeedback("")
        router.refresh()
      } else {
        throw new Error()
      }
    } catch {
      toast({ title: t('common.error'), description: t('vet.statusUpdateFailed'), variant: "destructive" })
    } finally {
      setLoadingId(null)
    }
  }

  const typeBadge = (type: string) => type === "Virtual"
    ? <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200 gap-1"><Video className="h-2.5 w-2.5" />{type}</Badge>
    : <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 gap-1"><MapPin className="h-2.5 w-2.5" />{type}</Badge>

  const AppointmentTable = ({ appointments }: { appointments: Appointment[] }) => (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="font-semibold text-gray-600">{t('vet.farmer')}</TableHead>
              <TableHead className="font-semibold text-gray-600">{t('vet.animal')}</TableHead>
              <TableHead className="font-semibold text-gray-600">{t('vet.service')}</TableHead>
              <TableHead className="font-semibold text-gray-600">{t('vet.dateTime')}</TableHead>
              <TableHead className="font-semibold text-gray-600">{t('vet.consultType')}</TableHead>
              <TableHead className="font-semibold text-gray-600">{t('vet.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">{t('vet.noAppointments')}</p>
                </TableCell>
              </TableRow>
            ) : appointments.map((appt) => (
              <TableRow key={appt._id} className="hover:bg-gray-50/80 transition-colors duration-150">
                {/* Farmer */}
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{appt.fullName}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Phone className="h-2.5 w-2.5" /><span>{appt.phoneNumber}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                {/* Animal */}
                <TableCell>
                  {appt.animalName ? (
                    <div className="flex items-center gap-1.5">
                      <PawPrint className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{appt.animalName}</p>
                        {appt.animalType && <p className="text-xs text-gray-400">{appt.animalType}</p>}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </TableCell>
                {/* Service */}
                <TableCell>
                  <span className="text-sm text-gray-700">{appt.service}</span>
                </TableCell>
                {/* Date & Time */}
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-800">
                    <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-medium">{appt.date}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Clock className="h-2.5 w-2.5" /><span>{appt.time}</span>
                  </div>
                </TableCell>
                {/* Type */}
                <TableCell>{typeBadge(appt.type)}</TableCell>
                {/* Actions */}
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    {appt.status === "accepted" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        disabled={loadingId === appt._id}
                        onClick={() => { setSelected(appt); setFeedback("") }}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />{t('vet.complete')}
                      </Button>
                    )}
                    {appt.status === "completed" && (
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle className="h-2.5 w-2.5 mr-1" />{t('vet.completed')}
                      </Badge>
                    )}
                    <Link href="/veterinary/messages">
                      <Button variant="outline" size="sm" className="shrink-0">
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />{t('vet.contact')}
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">{t('vet.noAppointments')}</p>
          </div>
        ) : appointments.map((appt) => (
          <div key={appt._id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{appt.fullName}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Phone className="h-2.5 w-2.5" /><span>{appt.phoneNumber}</span>
                  </div>
                </div>
              </div>
              {typeBadge(appt.type)}
            </div>
            {appt.animalName && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 pl-8">
                <PawPrint className="h-2.5 w-2.5 text-amber-500" />
                <span>{appt.animalName}{appt.animalType ? ` · ${appt.animalType}` : ''}</span>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 pl-8 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{appt.date}</span>
              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{appt.time}</span>
            </div>
            <div className="flex gap-2 mt-3 pl-8">
              {appt.status === "accepted" && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loadingId === appt._id}
                  onClick={() => { setSelected(appt); setFeedback("") }}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />{t('vet.complete')}
                </Button>
              )}
              <Link href="/veterinary/messages">
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />{t('vet.contact')}
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  )

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('vet.appointments')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('vet.appointmentsDesc')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('vet.upcoming')}</p>
              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-green-600 mt-2">{upcoming.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('vet.scheduledVisits')}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('vet.past')}</p>
              <CheckCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-blue-600 mt-2">{past.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('vet.completedVisits')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-0 border-b border-gray-100">
          <Tabs defaultValue="upcoming">
            <div className="flex items-center justify-between gap-4 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Calendar className="h-5 w-5 text-green-600" />
                {t('vet.appointments')}
              </CardTitle>
              <TabsList className="bg-gray-100">
                <TabsTrigger value="upcoming" className="text-xs data-[state=active]:bg-white">
                  {t('vet.upcoming')}
                  {upcoming.length > 0 && (
                    <Badge className="ml-1.5 bg-green-600 text-white text-xs px-1.5 py-0 h-4">{upcoming.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="past" className="text-xs data-[state=active]:bg-white">
                  {t('vet.past')}
                  {past.length > 0 && (
                    <Badge className="ml-1.5 bg-blue-600 text-white text-xs px-1.5 py-0 h-4">{past.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upcoming" className="mt-0">
              <AppointmentTable appointments={upcoming} />
            </TabsContent>
            <TabsContent value="past" className="mt-0">
              <AppointmentTable appointments={past} />
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      {/* Complete dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md w-11/12">
          <DialogHeader>
            <DialogTitle>{t('vet.completeAppointment')}</DialogTitle>
            <DialogDescription>
              {selected?.fullName} — {selected?.animalName ?? selected?.service}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="appt-feedback">{t('vet.feedbackOptional')}</Label>
            <Textarea
              id="appt-feedback"
              placeholder={t('vet.feedbackPlaceholder')}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">{t('vet.cancel')}</Button>
            </DialogClose>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!!loadingId}
              onClick={handleComplete}
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />{t('vet.markComplete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
