"use client"
import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Clock, Mail, AlertCircle, MessageCircle, Loader2, Shield, Lock,
  CheckCircle, Smartphone, CreditCard, ArrowLeft, ArrowRight,
  Zap, Check, Eye, EyeOff
} from "lucide-react"
import { sendBookingEmail } from "@/lib/actions/send-booking-email"
import { formatPhoneForIntouchPay } from "@/lib/utils"

const WHATSAPP_NUMBER = "+250780519960"

type BookingStep = "details" | "payment" | "polling" | "success"

const BOOKING_FEE = 100

const getServiceLabel = (serviceValue: string): string => {
  for (const category of serviceCategories) {
    const match = category.options.find((o) => o.value === serviceValue)
    if (match) return match.label
  }
  return serviceValue
}

const getServicePrice = (_serviceValue: string): number => {
  return BOOKING_FEE
}

// Service categories for the form
const serviceCategories = [
  {
    label: "Tracking Services",
    options: [
      { value: "basic-tracking", label: "Basic GPS Tracking" },
      { value: "advanced-monitoring", label: "Advanced Health Monitoring" },
      { value: "herd-management", label: "Herd Management System" },
      { value: "pet-tracking", label: "Pet Tracking Collar" },
    ],
  },
  {
    label: "Consultation Services",
    options: [
      { value: "general-consultation", label: "General Veterinary Consultation" },
      { value: "virtual-consultation", label: "Virtual Consultation" },
      { value: "emergency-consultation", label: "Emergency Consultation" },
      { value: "farm-visit", label: "Farm Visit" },
    ],
  },
  {
    label: "Monitoring Services",
    options: [
      { value: "disease-screening", label: "Disease Screening" },
      { value: "vaccination-program", label: "Vaccination Program" },
      { value: "parasite-control", label: "Parasite Control" },
      { value: "reproductive-health", label: "Reproductive Health Monitoring" },
    ],
  },
]

// Time slots
const timeSlots = [
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM",
]

/** Format card number with spaces every 4 digits */
function formatCardNumber(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ")
}

/** Format expiry as MM/YY */
function formatExpiry(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 4)
  if (digits.length <= 2) return digits
  return digits.slice(0, 2) + " / " + digits.slice(2)
}

/** Simple card network detection */
function detectCardNetwork(num: string): "visa" | "mastercard" | null {
  const clean = num.replace(/\s/g, "")
  if (clean.startsWith("4")) return "visa"
  if (clean.startsWith("5")) return "mastercard"
  return null
}

type PaymentMethod = "intouchpay" | "pesapal"

export default function BookingForm() {
  const searchParams = useSearchParams()

  // Step management
  const [step, setStep] = useState<BookingStep>("details")
  const [bookingId, setBookingId] = useState<string | null>(null)

  // Form fields
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("")
  const [selectedService, setSelectedService] = useState<string>("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [animalType, setAnimalType] = useState("")
  const [animalCount, setAnimalCount] = useState("1")
  const [description, setDescription] = useState("")
  const [whatsappConfirm, setWhatsappConfirm] = useState(true)

  // Payment fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("intouchpay")
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("")
  const [pollingTransactionId, setPollingTransactionId] = useState<string | null>(null)

  // Card form state (for display only — actual processing is via Pesapal)
  const [cardName, setCardName] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [showCvv, setShowCvv] = useState(false)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [whatsappOpened, setWhatsappOpened] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })
  const [pollingStatus, setPollingStatus] = useState<"idle" | "polling" | "success" | "failed">("idle")
  const [pollingMessage, setPollingMessage] = useState("")

  // Set initial service from URL query parameter
  useEffect(() => {
    const serviceParam = searchParams.get("service")
    if (serviceParam) {
      for (const category of serviceCategories) {
        const matchingService = category.options.find((option) =>
          option.label.toLowerCase().includes(serviceParam.toLowerCase()),
        )
        if (matchingService) {
          setSelectedService(matchingService.value)
          break
        }
      }
    }
  }, [searchParams])

  // Auto-fill mobile phone with booking phone
  useEffect(() => {
    if (phone && !mobileMoneyPhone) {
      setMobileMoneyPhone(phone)
    }
  }, [phone])

  const resetForm = () => {
    setDate(undefined)
    setSelectedTimeSlot("")
    setSelectedService("")
    setName("")
    setPhone("")
    setEmail("")
    setAnimalType("")
    setAnimalCount("1")
    setDescription("")
    setWhatsappConfirm(true)
    setPaymentMethod("intouchpay")
    setMobileMoneyPhone("")
    setWhatsappOpened(false)
    setStep("details")
    setBookingId(null)
    setPollingTransactionId(null)
    setPollingStatus("idle")
    setSubmitStatus({ type: null, message: "" })
  }

  const currentPrice = BOOKING_FEE

  // Step 1: Create booking and move to payment
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, email, service: selectedService,
          animalType, animalCount, description,
          date: date?.toLocaleDateString() || "",
          timeSlot: selectedTimeSlot,
          paymentMethod,
          mobileMoneyPhone: paymentMethod === "intouchpay" ? mobileMoneyPhone : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitStatus({ type: "error", message: data.error || "Failed to create booking" })
        return
      }

      setBookingId(data.bookingId)
      setStep("payment")
    } catch {
      setSubmitStatus({ type: "error", message: "An unexpected error occurred." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2a: Initiate IntouchPay (Mobile Money) payment
  const handleMobileMoneyPayment = async () => {
    if (!bookingId || !mobileMoneyPhone) return
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    try {
      const res = await fetch("/api/bookings/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, mobileMoneyPhone: formatPhoneForIntouchPay(mobileMoneyPhone) }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitStatus({ type: "error", message: data.error || "Payment initiation failed" })
        return
      }

      setPollingTransactionId(data.requestTransactionId)
      setStep("polling")
      setPollingStatus("polling")
      setPollingMessage("Payment prompt sent to your phone. Please approve the payment on your device.")
    } catch {
      setSubmitStatus({ type: "error", message: "Network error. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2b: Initiate Pesapal (Card) payment
  const handleCardPayment = async () => {
    if (!bookingId) return
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    try {
      const res = await fetch("/api/bookings/pesapal-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitStatus({ type: "error", message: data.error || "Failed to initiate card payment" })
        return
      }

      // Redirect to Pesapal payment page
      window.location.href = data.redirectUrl
    } catch {
      setSubmitStatus({ type: "error", message: "Network error. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Poll for payment status (Mobile Money flow only)
  const checkPaymentStatus = useCallback(async () => {
    if (!bookingId) return

    try {
      const res = await fetch(`/api/bookings?id=${bookingId}`)
      const data = await res.json()

      if (data.paymentStatus === "completed" || data.bookingStatus === "confirmed") {
        setPollingStatus("success")
        setStep("success")

        // Send confirmation email and optionally open WhatsApp
        const bookingData = {
          name, phone, email, service: selectedService,
          animalType, animalCount, description,
          date: date?.toLocaleDateString() || "",
          timeSlot: selectedTimeSlot,
          whatsappConfirm,
        }
        try {
          await sendBookingEmail(bookingData)
        } catch {
          // Email failure is non-blocking
        }

        if (whatsappConfirm) {
          const serviceLabel = getServiceLabel(selectedService)
          const msg = [
            `Hello NTDM Animal Hospital! 🐾`,
            `I just paid for and booked a consultation.`,
            ``,
            `📋 Booking Summary:`,
            `• Name: ${name}`,
            `• Service: ${serviceLabel} (RWF ${currentPrice.toLocaleString()})`,
            `• Animal: ${animalCount}x ${animalType}`,
            `• Date: ${date?.toLocaleDateString()}`,
            `• Time: ${selectedTimeSlot}`,
            phone ? `• Phone: ${phone}` : "",
            ``,
            `✅ Payment confirmed. Please confirm my appointment. Thank you!`,
          ].filter((l) => l !== undefined).join("\n")
          window.open(
            `https://wa.me/${WHATSAPP_NUMBER.replace(/\s+/g, "")}?text=${encodeURIComponent(msg)}`,
            "_blank"
          )
          setWhatsappOpened(true)
        }
        return
      }

      if (data.paymentStatus === "failed" || data.bookingStatus === "payment_failed") {
        setPollingStatus("failed")
        setSubmitStatus({ type: "error", message: "Payment failed. Please try again." })
        setStep("payment")
        return
      }
    } catch {
      // Ignore polling errors
    }
  }, [bookingId, name, phone, email, selectedService, animalType, animalCount, description, date, selectedTimeSlot, whatsappConfirm, currentPrice])

  // Polling effect
  useEffect(() => {
    if (step !== "polling" || !pollingTransactionId) return

    const interval = setInterval(checkPaymentStatus, 5000)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setPollingStatus("failed")
      setSubmitStatus({ type: "error", message: "Payment timed out. Please try again." })
      setStep("payment")
    }, 5 * 60 * 1000) // 5 minutes timeout

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [step, pollingTransactionId, checkPaymentStatus])

  // Show success screen
  if (step === "success") {
    return (
      <Card className="max-w-3xl mx-auto shadow-salon border-0 hover:shadow-lg transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6" />
            Booking Confirmed!
          </CardTitle>
          <CardDescription className="text-white/90">
            Payment received and booking confirmed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <Mail className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-green-800">Booking Paid & Confirmed!</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium mb-1">✅ Payment of RWF {currentPrice.toLocaleString()} received</p>
              <p className="text-green-700 text-sm">Your consultation booking is confirmed. You will receive a confirmation shortly.</p>
            </div>
            {whatsappOpened && (
              <div className="bg-[#e7f8ee] border border-[#25D366] rounded-lg p-4 mb-4 flex items-start gap-3 text-left">
                <MessageCircle className="h-5 w-5 text-[#25D366] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-800">WhatsApp opened with your booking summary</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Send the pre-filled message to receive a WhatsApp confirmation from our team.
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2 text-sm text-gray-600 mb-6">
              <p>📱 We will contact you at: {phone}</p>
              <p>📅 Requested date: {date?.toLocaleDateString()}</p>
              <p>🕐 Requested time: {selectedTimeSlot}</p>
              <p>💰 Amount paid: RWF {currentPrice.toLocaleString()}</p>
            </div>
            <Button
              onClick={resetForm}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-md"
            >
              Book Another Consultation
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step indicators
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {(["details", "payment", "polling"] as BookingStep[]).map((s, i) => {
        const isActive = step === s
        const isCompleted = (step === "payment" && s === "details") ||
                            (step === "polling" && (s === "details" || s === "payment"))
        return (
          <div key={s} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
              isActive ? "bg-blue-600 text-white" :
              isCompleted ? "bg-green-500 text-white" :
              "bg-gray-200 text-gray-500"
            }`}>
              {isCompleted ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            {i < 2 && <div className={`w-8 h-0.5 mx-1 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />}
          </div>
        )
      })}
    </div>
  )

  // Detect mobile network
  const detectNetwork = (phone: string): "mtn" | "airtel" | null => {
    if (phone.length < 3) return null
    const prefix = phone.slice(0, 3)
    if (prefix.startsWith("078") || prefix.startsWith("079")) return "mtn"
    if (prefix.startsWith("073") || prefix.startsWith("072")) return "airtel"
    return null
  }

  const network = detectNetwork(mobileMoneyPhone)
  const phoneValid = mobileMoneyPhone.length >= 10

  return (
    <Card className="max-w-3xl mx-auto shadow-salon border-0 hover:shadow-lg transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          {step === "payment" && (
            <button onClick={() => setStep("details")} className="p-1 hover:bg-white/20 rounded">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {step === "details" ? "Book Your Consultation" :
           step === "payment" ? "Complete Payment" :
           "Confirming Payment..."}
        </CardTitle>
        <CardDescription className="text-white/90">
          {step === "details"
            ? "Fill out the form below to schedule your consultation."
            : step === "payment"
            ? "Choose your payment method to confirm your booking."
            : "Please wait while we confirm your payment..."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <StepIndicator />

        {/* Error Message */}
        {submitStatus.type === "error" && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 font-medium">Error</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{submitStatus.message}</p>
            <Button
              onClick={() => setSubmitStatus({ type: null, message: "" })}
              variant="outline"
              size="sm"
              className="mt-3 border-red-300 text-red-700 hover:bg-red-50"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Step 1: Booking Details */}
        {step === "details" && (
          <form onSubmit={handleCreateBooking} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="border-gray-300 focus:border-primary focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0780000000"
                    required
                    className="border-gray-300 focus:border-primary focus:ring-primary"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="border-gray-300 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="service">Select Service</Label>
                <Select value={selectedService} onValueChange={setSelectedService} required>
                  <SelectTrigger id="service" className="border-gray-300 focus:border-primary focus:ring-primary">
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCategories.map((category) => (
                      <div key={category.label}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{category.label}</div>
                        {category.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price display — flat RWF 100 */}
              {selectedService && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Booking Fee</span>
                  </div>
                  <span className="text-lg font-bold text-blue-900">
                    RWF {currentPrice.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="animalType">Animal Type</Label>
                  <Select value={animalType} onValueChange={setAnimalType} required>
                    <SelectTrigger id="animalType" className="border-gray-300 focus:border-primary focus:ring-primary">
                      <SelectValue placeholder="Select animal type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cow">Cow</SelectItem>
                      <SelectItem value="goat">Goat</SelectItem>
                      <SelectItem value="sheep">Sheep</SelectItem>
                      <SelectItem value="chicken">Chicken</SelectItem>
                      <SelectItem value="dog">Dog</SelectItem>
                      <SelectItem value="cat">Cat</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="animalCount">Number of Animals</Label>
                  <Input
                    id="animalCount"
                    type="number"
                    min="1"
                    value={animalCount}
                    onChange={(e) => setAnimalCount(e.target.value)}
                    className="border-gray-300 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description of Issue (Optional)</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the issue or reason for consultation"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Select Date</Label>
                  <div className="border rounded-md mt-1.5 border-gray-300">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date < today || date.getDay() === 0
                      }}
                      className="rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <Label>Select Time Slot</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5 h-[280px] overflow-y-auto border rounded-md p-2 border-gray-300">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={selectedTimeSlot === slot ? "default" : "outline"}
                        className={`justify-start ${selectedTimeSlot === slot ? "bg-primary text-primary-foreground" : ""}`}
                        onClick={() => setSelectedTimeSlot(slot)}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shadow-md h-12 text-base"
              disabled={!date || !selectedTimeSlot || !selectedService || !name || !phone || isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Booking...
                </div>
              ) : (
                <>
                  Continue to Payment — <strong>RWF {currentPrice.toLocaleString()}</strong>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" />
              Payment required to confirm your booking
            </p>
          </form>
        )}

        {/* Step 2: Payment */}
        {step === "payment" && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                Booking Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service:</span>
                  <span className="font-medium">{getServiceLabel(selectedService)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium">{date?.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time:</span>
                  <span className="font-medium">{selectedTimeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Animal:</span>
                  <span className="font-medium">{animalCount}x {animalType}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="text-gray-600 font-medium">Total to Pay:</span>
                  <span className="text-lg font-bold text-gray-900">RWF {currentPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Choose Payment Method</Label>
              <div className="space-y-3">
                {/* Mobile Money Option */}
                <div
                  className={`relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                    paymentMethod === "intouchpay"
                      ? "border-green-500 bg-green-50/50 shadow-md shadow-green-100"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                  onClick={() => setPaymentMethod("intouchpay")}
                >
                  {paymentMethod === "intouchpay" && (
                    <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center ${
                        paymentMethod === "intouchpay" ? "bg-green-500 text-white" : "bg-gradient-to-br from-green-400 to-green-600 text-white"
                      }`}>
                        <Smartphone className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-gray-900">Mobile Money</p>
                        <p className="text-sm text-gray-500">MTN Mobile Money or Airtel Money</p>
                      </div>
                    </div>

                    {paymentMethod === "intouchpay" && (
                      <div className="mt-3 pt-3 border-t border-green-100" onClick={(e) => e.stopPropagation()}>
                        <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Enter your MTN / Airtel number
                        </Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                            <span className="text-sm font-medium text-gray-500">+250</span>
                            <span className="mx-1 text-gray-300">|</span>
                          </div>
                          <Input
                            type="tel"
                            placeholder="7XXXXXXXX"
                            value={mobileMoneyPhone}
                            onChange={(e) => setMobileMoneyPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            className="pl-16 h-11 text-base font-medium border-2 focus:border-green-500"
                          />
                        </div>
                        {phoneValid && network && (
                          <div className="mt-2 flex items-center gap-2">
                            {network === "mtn" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
                                <Zap className="h-3 w-3" /> MTN Mobile Money
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-1 rounded-full">
                                <Zap className="h-3 w-3" /> Airtel Money
                              </span>
                            )}
                          </div>
                        )}
                        <Button
                          className="w-full mt-3 h-11 text-base rounded-full shadow-md bg-green-600 hover:bg-green-700"
                          onClick={handleMobileMoneyPayment}
                          disabled={!mobileMoneyPhone || isSubmitting}
                        >
                          {isSubmitting ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Initiating Payment...
                            </div>
                          ) : (
                            <>
                              <Smartphone className="h-4 w-4 mr-2" />
                              Pay RWF {currentPrice.toLocaleString()} via Mobile Money
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card (Pesapal) Option */}
                <div
                  className={`relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                    paymentMethod === "pesapal"
                      ? "border-indigo-500 bg-indigo-50/50 shadow-md shadow-indigo-100"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                  onClick={() => setPaymentMethod("pesapal")}
                >
                  {paymentMethod === "pesapal" && (
                    <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center ${
                        paymentMethod === "pesapal" ? "bg-indigo-500 text-white" : "bg-gradient-to-br from-indigo-400 to-indigo-600 text-white"
                      }`}>
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-gray-900">Debit / Credit Card</p>
                        <p className="text-sm text-gray-500">Pay with Visa, Mastercard via Pesapal</p>
                      </div>
                    </div>

                    {paymentMethod === "pesapal" && (
                      <div className="mt-4 pt-3 border-t border-indigo-100 space-y-4" onClick={(e) => e.stopPropagation()}>
                        {/* Visual Card Preview */}
                        <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-700 rounded-xl p-4 text-white relative overflow-hidden shadow-lg">
                          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10" />
                          <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-white/10" />
                          <div className="relative z-10">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-xs font-medium opacity-80">
                                {detectCardNetwork(cardNumber) === "visa" ? "VISA" : detectCardNetwork(cardNumber) === "mastercard" ? "MASTERCARD" : "CREDIT CARD"}
                              </span>
                              <Shield className="h-4 w-4 opacity-80" />
                            </div>
                            <p className="text-lg tracking-widest font-mono mb-3">
                              {cardNumber || "••••  ••••  ••••  ••••"}
                            </p>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[10px] opacity-70 mb-0.5">CARD HOLDER</p>
                                <p className="text-sm font-medium tracking-wide truncate max-w-[160px]">
                                  {cardName.toUpperCase() || "YOUR NAME"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] opacity-70 mb-0.5">EXPIRES</p>
                                <p className="text-sm font-mono font-medium">{cardExpiry || "MM / YY"}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Cardholder Name */}
                        <div>
                          <Label htmlFor="cardName" className="text-sm font-medium text-gray-700">Cardholder Name</Label>
                          <Input
                            id="cardName"
                            type="text"
                            placeholder="John Doe"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="h-11 text-base border-2 focus:border-indigo-500"
                          />
                        </div>

                        {/* Card Number */}
                        <div>
                          <Label htmlFor="cardNumber" className="text-sm font-medium text-gray-700">Card Number</Label>
                          <div className="relative">
                            <Input
                              id="cardNumber"
                              type="tel"
                              placeholder="1234 5678 9012 3456"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                              className="h-11 text-base font-mono tracking-wider border-2 focus:border-indigo-500 pr-12"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {detectCardNetwork(cardNumber) === "visa" && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">VISA</span>
                              )}
                              {detectCardNetwork(cardNumber) === "mastercard" && (
                                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">MC</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expiry + CVV */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="cardExpiry" className="text-sm font-medium text-gray-700">Expiry Date</Label>
                            <Input
                              id="cardExpiry"
                              type="tel"
                              placeholder="MM / YY"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                              className="h-11 text-base font-mono border-2 focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cardCvv" className="text-sm font-medium text-gray-700">CVV</Label>
                            <div className="relative">
                              <Input
                                id="cardCvv"
                                type={showCvv ? "tel" : "password"}
                                placeholder="***"
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                className="h-11 text-base font-mono border-2 focus:border-indigo-500 pr-10"
                                maxLength={4}
                              />
                              <button
                                type="button"
                                onClick={() => setShowCvv(!showCvv)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Security notice */}
                        <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
                          <Lock className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                          <p className="text-xs text-indigo-700">
                            Your card details are encrypted and processed securely by <strong>Pesapal</strong>.
                          </p>
                        </div>

                        <Button
                          className="w-full h-11 text-base rounded-full shadow-md bg-indigo-600 hover:bg-indigo-700"
                          onClick={handleCardPayment}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Redirecting to Pesapal...
                            </div>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Pay RWF {currentPrice.toLocaleString()} with Card
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" />
              Secured payment — your information is protected
            </p>
          </div>
        )}

        {/* Step 3: Polling (Mobile Money only) */}
        {step === "polling" && (
          <div className="text-center py-8 space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Waiting for Payment Confirmation</h3>
              <p className="text-sm text-gray-500">{pollingMessage}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left max-w-md mx-auto">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Please check your phone</p>
                  <p className="text-yellow-700 mt-1">
                    You should receive a USSD prompt on <strong>{mobileMoneyPhone}</strong>.
                    Enter your PIN to approve the payment of <strong>RWF {currentPrice.toLocaleString()}</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                This page will update automatically when payment is confirmed.
              </p>
              <p className="text-xs text-gray-400">
                Timeout in 5 minutes — you can go back and try again.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStep("payment")
                setPollingStatus("idle")
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Go Back
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
