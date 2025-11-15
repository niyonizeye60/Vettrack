"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { updateConsultationStatus } from "@/lib/actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell } from "lucide-react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

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
  doctor: any
  feedback?: string
}

interface VeterinaryConsultationsProps {
  consultations: Consultation[]
}

export default function VeterinaryConsultations({ consultations }: VeterinaryConsultationsProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [feedback, setFeedback] = useState("")
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [actionType, setActionType] = useState<"accept" | "reject" | "complete" | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)

  const handleStatusUpdate = async (id: string, newStatus: string, feedbackText?: string) => {
    setIsUpdating(true)
    try {
      // Make sure we're passing valid parameters
      if (!id || !newStatus) {
        console.error("Invalid parameters for status update");
        return;
      }
      
      // Ensure feedback is a string or undefined, not null
      const sanitizedFeedback = feedbackText || undefined;
      
      const result = await updateConsultationStatus(id, newStatus, sanitizedFeedback);
      if (result.success) {
        setSelectedConsultation(null);
        setFeedback("");
        setShowFeedbackForm(false);
        setActionType(null);
        router.refresh();
      } else {
        console.error("Failed to update consultation status");
      }
    } catch (error) {
      console.error("Error updating consultation status:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  const viewConsultationDetails = (consultation: Consultation) => {
    console.log("Opening dialog for consultation:", consultation._id);
    setSelectedConsultation(consultation);
    setShowFeedbackForm(false);
    setIsDetailsDialogOpen(true);
  };

  const initiateStatusUpdate = (consultation: Consultation, type: "accept" | "reject" | "complete") => {
    setSelectedConsultation(consultation);
    setActionType(type);
    setShowFeedbackForm(true);
    setIsDetailsDialogOpen(false);
    setIsFeedbackDialogOpen(true);
  };

  const submitFeedback = () => {
    if (!selectedConsultation || !actionType) {
      console.error("Missing consultation or action type");
      return;
    }
    
    const newStatus = actionType === "accept" ? "accepted" : 
                      actionType === "reject" ? "rejected" : 
                      "completed";
    
    // Ensure we have a valid ID
    if (!selectedConsultation._id) {
      console.error("Missing consultation ID");
      return;
    }
                      
    handleStatusUpdate(selectedConsultation._id, newStatus, feedback);
  }

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

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return t('vet.pending')
      case "accepted":
        return t('vet.accepted')
      case "rejected":
        return t('vet.rejected')
      case "completed":
        return t('vet.completed')
      default:
        return status
    }
  }

  const pendingConsultations = consultations.filter(c => c.status === "pending")
  const acceptedConsultations = consultations.filter(c => c.status === "accepted")
  const rejectedConsultations = consultations.filter(c => c.status === "rejected")
  const completedConsultations = consultations.filter(c => c.status === "completed")

  // Card component for mobile view
  const ConsultationCard = ({ consultation, showActions = true }: { consultation: Consultation, showActions?: boolean }) => (
    <div className="border rounded-md p-4 mb-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium">{consultation.fullName}</h3>
          <p className="text-sm text-gray-500">{consultation.phoneNumber}</p>
        </div>
        <Badge className={getStatusColor(consultation.status)}>
          {consultation.status}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 text-sm">
        <div className="font-medium">Animal:</div>
        <div>{consultation.service}</div>
        
        <div className="font-medium">Symptoms:</div>
        <div className="break-words">{consultation.type}</div>
        
        <div className="font-medium">Date:</div>
        <div>{consultation.date}</div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => viewConsultationDetails(consultation)}
        >
          View Details
        </Button>
        
        {consultation.status === "pending" && showActions && (
          <div className="flex flex-wrap gap-2 w-full mt-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => initiateStatusUpdate(consultation, "accept")}
              disabled={isUpdating}
            >
              Accept
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => initiateStatusUpdate(consultation, "reject")}
              disabled={isUpdating}
            >
              Reject
            </Button>
          </div>
        )}
        
        {consultation.status === "accepted" && showActions && (
          <Button
            variant="default"
            size="sm"
            className="w-full mt-2"
            onClick={() => initiateStatusUpdate(consultation, "complete")}
            disabled={isUpdating}
          >
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  )

  const ConsultationTable = ({ consultations, showActions = true }: { consultations: Consultation[], showActions?: boolean }) => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">{t('vet.farmer')}</TableHead>
            <TableHead className="whitespace-nowrap">{t('vet.animal')}</TableHead>
            <TableHead className="whitespace-nowrap">{t('vet.symptoms')}</TableHead>
            <TableHead className="whitespace-nowrap">{t('vet.status')}</TableHead>
            <TableHead className="whitespace-nowrap">{t('vet.date')}</TableHead>
            <TableHead className="whitespace-nowrap">{t('vet.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consultations.map((consultation) => (
            <TableRow key={consultation._id}>
              <TableCell className="min-w-[150px]">
                <div>
                  <div className="font-medium">{consultation.fullName}</div>
                  <div className="text-sm text-gray-500">{consultation.phoneNumber}</div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">{consultation.service}</TableCell>
              <TableCell className="max-w-xs truncate">
                {consultation.type}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge className={getStatusColor(consultation.status)}>
                  {consultation.status}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {consultation.date}
              </TableCell>
              <TableCell className="min-w-[200px]">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewConsultationDetails(consultation)}
                  >
                    View
                  </Button>
                  {consultation.status === "pending" && showActions && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => initiateStatusUpdate(consultation, "accept")}
                        disabled={isUpdating}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => initiateStatusUpdate(consultation, "reject")}
                        disabled={isUpdating}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {consultation.status === "accepted" && showActions && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => initiateStatusUpdate(consultation, "complete")}
                      disabled={isUpdating}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const EmptyState = ({ status }: { status: string }) => (
    <div className="text-center py-8 text-gray-500">
      <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
      <p>No {status} consultations</p>
    </div>
  )

  // Render different layout based on consultations and status
  const renderConsultations = (consultations: Consultation[], status: string, showActions: boolean) => {
    if (consultations.length === 0) {
      return <EmptyState status={status} />;
    }

    return (
      <>
        {/* Mobile view (card layout) */}
        <div className="md:hidden space-y-4">
          {consultations.map((consultation) => (
            <ConsultationCard 
              key={consultation._id} 
              consultation={consultation} 
              showActions={showActions} 
            />
          ))}
        </div>
        
        {/* Tablet and desktop view (table layout) */}
        <div className="hidden md:block">
          <ConsultationTable 
            consultations={consultations} 
            showActions={showActions} 
          />
        </div>
      </>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('vet.consultationRequests')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="space-y-4">
            <div className="overflow-x-auto">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="pending" className="flex items-center gap-1 text-xs sm:text-sm sm:gap-2">
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="whitespace-nowrap">Pending ({pendingConsultations.length})</span>
                </TabsTrigger>
                <TabsTrigger value="accepted" className="flex items-center gap-1 text-xs sm:text-sm sm:gap-2">
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="whitespace-nowrap">Accepted ({acceptedConsultations.length})</span>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="flex items-center gap-1 text-xs sm:text-sm sm:gap-2">
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="whitespace-nowrap">Rejected ({rejectedConsultations.length})</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center gap-1 text-xs sm:text-sm sm:gap-2">
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="whitespace-nowrap">Completed ({completedConsultations.length})</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="pending" className="mt-4">
              {renderConsultations(pendingConsultations, "pending", true)}
            </TabsContent>
            
            <TabsContent value="accepted" className="mt-4">
              {renderConsultations(acceptedConsultations, "accepted", true)}
            </TabsContent>
            
            <TabsContent value="rejected" className="mt-4">
              {renderConsultations(rejectedConsultations, "rejected", false)}
            </TabsContent>
            
            <TabsContent value="completed" className="mt-4">
              {renderConsultations(completedConsultations, "completed", false)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Consultation Details Dialog */}
      <Dialog 
        open={isDetailsDialogOpen} 
        onOpenChange={setIsDetailsDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px] w-11/12 max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Consultation Details</DialogTitle>
            <DialogDescription>
              View the details of this consultation request
            </DialogDescription>
          </DialogHeader>
          
          {selectedConsultation && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className="font-semibold">Farmer:</div>
                <div className="sm:col-span-2">{selectedConsultation.fullName}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className="font-semibold">Phone Number:</div>
                <div className="sm:col-span-2">{selectedConsultation.phoneNumber}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className="font-semibold">Animal:</div>
                <div className="sm:col-span-2">{selectedConsultation.service}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className="font-semibold">Symptoms:</div>
                <div className="sm:col-span-2 break-words">{selectedConsultation.type}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className="font-semibold">Date:</div>
                <div className="sm:col-span-2">{selectedConsultation.date} {selectedConsultation.time}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className="font-semibold">Status:</div>
                <div className="sm:col-span-2">
                  <Badge className={getStatusColor(selectedConsultation.status)}>
                    {selectedConsultation.status}
                  </Badge>
                </div>
              </div>
              {selectedConsultation.feedback && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="font-semibold">Feedback:</div>
                  <div className="sm:col-span-2 break-words">{selectedConsultation.feedback}</div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedConsultation?.status === "pending" && (
              <>
                <Button 
                  variant="default"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    initiateStatusUpdate(selectedConsultation, "accept");
                  }}
                >
                  Accept with Feedback
                </Button>
                <Button 
                  variant="destructive"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    initiateStatusUpdate(selectedConsultation, "reject");
                  }}
                >
                  Reject with Feedback
                </Button>
              </>
            )}
            {selectedConsultation?.status === "accepted" && (
              <Button 
                variant="default"
                className="w-full sm:w-auto"
                onClick={() => {
                  setIsDetailsDialogOpen(false);
                  initiateStatusUpdate(selectedConsultation, "complete");
                }}
              >
                Mark as Complete
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Form Dialog */}
      <Dialog 
        open={isFeedbackDialogOpen} 
        onOpenChange={setIsFeedbackDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px] w-11/12 max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>
              {actionType === "accept" ? "Accept Consultation" :
               actionType === "reject" ? "Reject Consultation" :
               "Mark Consultation as Complete"}
            </DialogTitle>
            <DialogDescription>
              Provide feedback to the farmer about this consultation
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="feedback">Feedback for the farmer</Label>
              <Textarea
                id="feedback"
                placeholder="Enter your feedback, instructions, or observations here..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="submit"
              className="w-full sm:w-auto"
              onClick={() => {
                submitFeedback();
                setIsFeedbackDialogOpen(false);
              }}
              disabled={isUpdating}
            >
              Submit
            </Button>
            <Button 
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setIsFeedbackDialogOpen(false);
                setFeedback("");
                setActionType(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}