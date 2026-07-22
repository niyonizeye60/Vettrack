"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Search, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Phone,
  User,
  Calendar,
  Stethoscope,
  Users
} from "lucide-react"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"

interface Consultation {
  _id: string
  fullName: string
  phoneNumber: string
  service: string
  date: string
  time: string
  type: string
  status: string
  createdAt: string
  updatedAt?: string | null
  doctor: string
  farmer: string
  farmerId: string | null
  feedback?: string | null
}

interface ConsultationsManagementProps {
  consultations: Consultation[]
}

export default function ConsultationsManagement({ consultations }: ConsultationsManagementProps) {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

  // Filter consultations based on search term
  const filteredConsultations = consultations.filter(consultation =>
    consultation.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consultation.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consultation.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consultation.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consultation.farmer.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "accepted":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
        return <XCircle className="h-4 w-4" />
      case "completed":
        return <FileText className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const pendingConsultations = filteredConsultations.filter(c => c.status === "pending")
  const acceptedConsultations = filteredConsultations.filter(c => c.status === "accepted")
  const rejectedConsultations = filteredConsultations.filter(c => c.status === "rejected")
  const completedConsultations = filteredConsultations.filter(c => c.status === "completed")

  const viewConsultationDetails = (consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setIsDetailsDialogOpen(true)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{filteredConsultations.length}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('superadmin.total')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {pendingConsultations.length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('superadmin.pending')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {acceptedConsultations.length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('superadmin.approved')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {completedConsultations.length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('superadmin.completed')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">{t('superadmin.consultationsManagement')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('superadmin.searchPatientService')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Responsive Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <ScrollArea className="w-full">
          <TabsList className="grid w-full grid-cols-5 min-w-fit">
            <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">
              {t('superadmin.all')}
              <span className="hidden sm:inline ml-1">({filteredConsultations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm px-2 sm:px-3">
              {t('superadmin.pending')}
              <span className="hidden sm:inline ml-1">({pendingConsultations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs sm:text-sm px-2 sm:px-3">
              <span className="hidden sm:inline">{t('superadmin.approved')}</span>
              <span className="sm:hidden">OK</span>
              <span className="hidden sm:inline ml-1">({acceptedConsultations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs sm:text-sm px-2 sm:px-3">
              {t('superadmin.rejected')}
              <span className="hidden sm:inline ml-1">({rejectedConsultations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm px-2 sm:px-3">
              {t('superadmin.done')}
              <span className="hidden sm:inline ml-1">({completedConsultations.length})</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="all">
          <ConsultationsView 
            consultations={filteredConsultations} 
            onViewDetails={viewConsultationDetails}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
          />
        </TabsContent>

        <TabsContent value="pending">
          <ConsultationsView 
            consultations={pendingConsultations} 
            onViewDetails={viewConsultationDetails}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
          />
        </TabsContent>

        <TabsContent value="accepted">
          <ConsultationsView 
            consultations={acceptedConsultations} 
            onViewDetails={viewConsultationDetails}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
          />
        </TabsContent>

        <TabsContent value="rejected">
          <ConsultationsView 
            consultations={rejectedConsultations} 
            onViewDetails={viewConsultationDetails}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
          />
        </TabsContent>

        <TabsContent value="completed">
          <ConsultationsView 
            consultations={completedConsultations} 
            onViewDetails={viewConsultationDetails}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
          />
        </TabsContent>
      </Tabs>

      {/* Consultation Details Dialog - Responsive */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('superadmin.consultationDetails')}</DialogTitle>
            <DialogDescription>
              {t('superadmin.completeInformation')}
            </DialogDescription>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-6">
              {/* Patient & Service Info - Stack on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('superadmin.patientInformation')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">{t('superadmin.name')}:</span> {selectedConsultation.fullName}</p>
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedConsultation.phoneNumber}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    {t('superadmin.serviceDetails')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">{t('superadmin.service')}:</span> {selectedConsultation.service}</p>
                    <p><span className="font-medium">{t('superadmin.type')}:</span> {selectedConsultation.type}</p>
                  </div>
                </div>
              </div>

              {/* Schedule & Assignment - Stack on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('superadmin.schedule')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">{t('superadmin.date')}:</span> {selectedConsultation.date}</p>
                    <p><span className="font-medium">{t('superadmin.time')}:</span> {selectedConsultation.time}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t('superadmin.assignment')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">{t('superadmin.doctor')}:</span> {selectedConsultation.doctor}</p>
                    <p><span className="font-medium">{t('superadmin.farmer')}:</span> {selectedConsultation.farmer}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">{t('superadmin.status')}</h4>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(selectedConsultation.status)}
                  <Badge className={getStatusColor(selectedConsultation.status)}>
                    {selectedConsultation.status}
                  </Badge>
                </div>
              </div>

              {/* Feedback - Full width */}
              {selectedConsultation.feedback && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">{t('superadmin.feedback')}</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedConsultation.feedback}</p>
                  </div>
                </div>
              )}

              {/* Timestamps - Stack on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">{t('superadmin.created')}</h4>
                  <p className="text-sm text-gray-600">
                    {format(new Date(selectedConsultation.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
                {selectedConsultation.updatedAt && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">{t('superadmin.lastUpdated')}</h4>
                    <p className="text-sm text-gray-600">
                      {format(new Date(selectedConsultation.updatedAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Unified consultations view component that handles both mobile and desktop
function ConsultationsView({ 
  consultations, 
  onViewDetails, 
  getStatusColor, 
  getStatusIcon 
}: {
  consultations: Consultation[]
  onViewDetails: (consultation: Consultation) => void
  getStatusColor: (status: string) => string
  getStatusIcon: (status: string) => React.ReactNode
}) {
  const { t } = useLanguage()
  
  if (consultations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">{t('superadmin.noConsultationsFound')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Mobile Card View - Visible on mobile/tablet */}
      <div className="block lg:hidden space-y-4">
        {consultations.map((consultation) => (
          <Card key={consultation._id} className="p-4">
            <div className="space-y-4">
              {/* Header with patient and status */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{consultation.fullName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {consultation.phoneNumber}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(consultation)}
                  className="p-2"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              {/* Service and type */}
              <div className="space-y-1">
                <p className="font-medium text-sm">{consultation.service}</p>
                <p className="text-xs text-muted-foreground">{consultation.type}</p>
              </div>

              {/* Status badge */}
              <div className="flex items-center space-x-2">
                {getStatusIcon(consultation.status)}
                <Badge className={`${getStatusColor(consultation.status)} text-xs`}>
                  {consultation.status}
                </Badge>
              </div>

              {/* Doctor and farmer info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground">{t('superadmin.doctor')}</p>
                  <p className="truncate">{consultation.doctor}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">{t('superadmin.farmer')}</p>
                  <p className="truncate">{consultation.farmer}</p>
                </div>
              </div>

              {/* Schedule and created date */}
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium">{t('superadmin.schedule')}</p>
                  <p>{consultation.date}</p>
                  <p>{consultation.time}</p>
                </div>
                <div>
                  <p className="font-medium">{t('superadmin.created')}</p>
                  <p>{format(new Date(consultation.createdAt), "MMM dd, yyyy")}</p>
                  <p>{format(new Date(consultation.createdAt), "h:mm a")}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          
            <Table>
             <TableHeader>
              <TableRow>
                <TableHead className="w-[18%]">{t('superadmin.patientDetails')}</TableHead>
                <TableHead className="w-[16%]">{t('superadmin.serviceType')}</TableHead>
                <TableHead className="w-[12%]">{t('superadmin.doctor')}</TableHead>
                <TableHead className="w-[12%]">{t('superadmin.farmer')}</TableHead>
                <TableHead className="w-[10%]">{t('superadmin.status')}</TableHead>
                <TableHead className="w-[12%]">{t('superadmin.schedule')}</TableHead>
                <TableHead className="w-[10%]">{t('superadmin.created')}</TableHead>
                <TableHead className="text-right w-[10%]">{t('superadmin.actions')}</TableHead>
              </TableRow>
            </TableHeader>
                            <TableBody>
                {consultations.map((consultation) => (
                  <TableRow key={consultation._id}>
                    <TableCell className="text-sm">
                      <div className="truncate max-w-[100px]">
                        <div className="font-medium truncate">{consultation.fullName}</div>
                        <div className="text-gray-500 flex items-center gap-1 truncate">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{consultation.phoneNumber}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="truncate max-w-[120px]">
                        <div className="font-medium truncate">{consultation.service}</div>
                        <div className="text-gray-500 truncate">{consultation.type}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="truncate max-w-[100px]">
                        <div className="font-medium truncate">{consultation.doctor}</div>
                        <div className="text-gray-500">{t('superadmin.doctor')}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="truncate max-w-[100px]">
                        <div className="font-medium truncate">{consultation.farmer}</div>
                        <div className="text-gray-500">{t('superadmin.farmer')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(consultation.status)}
                        <Badge className={getStatusColor(consultation.status)}>
                          {consultation.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{consultation.date}</div>
                        <div className="text-sm text-gray-500">{consultation.time}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(consultation.createdAt), "MMM dd, yyyy")}</div>
                        <div className="text-gray-500">{format(new Date(consultation.createdAt), "h:mm a")}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(consultation)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          
        </CardContent>
      </Card>
    </>
  )
}