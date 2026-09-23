"use client"
import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, AlertCircle, Smartphone, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { sendBookingEmail, type BookingData } from "@/lib/actions/send-booking-email"

// Service categories for the form
const serviceCategories = [
  {
    label: "Tracking Services",
    options: [
      { value: "basic-tracking", label: "Basic GPS Tracking - RWF 100" },
      { value: "advanced-monitoring", label: "Advanced Health Monitoring - RWF 100" },
      { value: "herd-management", label: "Herd Management System - RWF 100" },
      { value: "pet-tracking", label: "Pet Tracking Collar - RWF 100" },
    ],
  },
  {
    label: "Consultation Services",
    options: [
      { value: "general-consultation", label: "General Veterinary Consultation - RWF 100" },
      { value: "virtual-consultation", label: "Virtual Consultation - RWF 100" },
      { value: "emergency-consultation", label: "Emergency Consultation - RWF 100" },
      { value: "farm-visit", label: "Farm Visit - RWF 100" },
    ],
  },
  {
    label: "Monitoring Services",
    options: [
      { value: "disease-screening", label: "Disease Screening - RWF 100" },
      { value: "vaccination-program", label: "Vaccination Program - RWF 100" },
      { value: "parasite-control", label: "Parasite Control - RWF 100" },
      { value: "reproductive-health", label: "Reproductive Health Monitoring - RWF 100" },
    ],
  },
]

// Time slots
const timeSlots = [
  "8:00 AM",
  "8:30 AM",
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
]

type Step = "form" | "awaiting" | "success" | "failed" | "timeout"

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 2 * 60 * 1000

export default function BookingForm() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>("form")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("")
  const [selectedService, setSelectedService] = useState<string>("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [animalType, setAnimalType] = useState("")
  const [animalCount, setAnimalCount] = useState("1")
  const [description, setDescription] = useState("")
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("")
  const mmPhoneTouched = useRef(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [payError, setPayError] = useState("")

  const [bookingId, setBookingId] = useState<string | null>(null)
  const [price, setPrice] = useState<number>(100)
  const bookingPayload = useRef<BookingData | null>(null)

  // Set initial service from URL query parameter
  useEffect(() => {
    const serviceParam = searchParams.get("service")
    if (serviceParam) {
      // Find the matching service in our categories
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

  // Default the mobile money number to the contact phone until edited
  useEffect(() => {
    if (!mmPhoneTouched.current) setMobileMoneyPhone(phone)
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
    setMobileMoneyPhone("")
    mmPhoneTouched.current = false
    setBookingId(null)
    setPayError("")
    setStep("form")
  }

  const notifyStaff = useCallback(() => {
    // Staff notification only - the booking itself is already stored. Fire and
    // forget; a missing SMTP setup must not affect the paid booking.
    if (!bookingPayload.current) return
    sendBookingEmail(bookingPayload.current).catch(() => {})
  }, [])

  const checkPayment = useCallback(async () => {
    if (!bookingId) return
    setChecking(true)
    try {
      const res = await fetch(`/api/bookings?id=${bookingId}`)
      const data = await res.json()
      if (res.ok && data.paymentStatus === "completed") {
        setStep("success")
        notifyStaff()
      } else if (res.ok && data.paymentStatus === "failed") {
        setStep("failed")
      }
    } catch (error) {
      console.error("Failed to check booking payment status:", error)
    } finally {
      setChecking(false)
    }
  }, [bookingId, notifyStaff])

  // From the timeout screen: check once, and if the payment still isn't
  // resolved, go back to waiting (which restarts the polling window). If the
  // check DID resolve it, checkPayment already moved us to success/failed and
  // this no-ops for those states.
  const checkAndResumeWaiting = useCallback(async () => {
    await checkPayment()
    setStep((current) => (current === "timeout" ? "awaiting" : current))
  }, [checkPayment])

  // Poll while waiting for the customer to approve the STK push. The bookings
  // GET endpoint re-verifies with IntouchPay directly once pending > 5s, so
  // this confirms even when the async gateway callback never arrives. When the
  // window expires we surface an explicit "timeout" state instead of silently
  // stopping, so the customer can resend / recheck / edit rather than staring
  // at an eternal spinner.
  useEffect(() => {
    if (step !== "awaiting") return
    const startedAt = Date.now()
    const interval = setInterval(() => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(interval)
        // Functional update: only time out if we're still awaiting — a poll
        // that just landed "completed"/"failed" must win over the deadline.
        setStep((current) => (current === "awaiting" ? "timeout" : current))
        return
      }
      checkPayment()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [step, checkPayment])

  const initiatePayment = async (id: string) => {
    const res = await fetch("/api/bookings/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: id, mobileMoneyPhone }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Failed to initiate payment")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mobileMoneyPhone.trim()) {
      setPayError("Enter the mobile money number to pay from")
      return
    }
    setIsSubmitting(true)
    setPayError("")

    try {
      const dateStr = date?.toLocaleDateString() || ""
      bookingPayload.current = {
        name,
        phone,
        email,
        service: selectedService,
        animalType,
        animalCount,
        description,
        date: dateStr,
        timeSlot: selectedTimeSlot,
      }

      // 1. Create the booking (price is validated server-side)
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bookingPayload.current,
          paymentMethod: "intouchpay",
          mobileMoneyPhone,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking")
      }

      // 2. Send the payment request to the phone (STK push). If this fails the
      // booking record already exists, so offer a payment retry rather than a
      // resubmit that would create a duplicate booking.
      setBookingId(data.bookingId)
      setPrice(data.price ?? 100)
      try {
        await initiatePayment(data.bookingId)
      } catch (payError) {
        setPayError(payError instanceof Error ? payError.message : "Failed to initiate payment")
        setStep("failed")
        return
      }

      // 3. Wait for approval
      setStep("awaiting")
    } catch (error) {
      console.error("Error submitting booking:", error)
      setPayError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const retryPayment = async () => {
    if (!bookingId) return
    setIsSubmitting(true)
    setPayError("")
    try {
      await initiatePayment(bookingId)
      setStep("awaiting")
    } catch (error) {
      setPayError(error instanceof Error ? error.message : "Failed to initiate payment. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Success: payment confirmed, booking confirmed
  // ---------------------------------------------------------------------------
  if (step === "success") {
    return (
      <Card className="max-w-3xl mx-auto shadow-salon border-0 hover:shadow-lg transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle>Booking Confirmed!</CardTitle>
          <CardDescription className="text-white/90">
            Your payment went through and your consultation is booked.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-green-800">Payment Successful! 🎉</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 inline-block">
              <p className="text-green-800 font-medium">✅ RWF {price.toLocaleString()} paid successfully</p>
              <p className="text-green-700 text-sm mt-1">Your booking has been confirmed.</p>
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-6">
              <p>📱 We will contact you at: {phone}</p>
              <p>📅 Requested date: {date?.toLocaleDateString()}</p>
              <p>🕐 Requested time: {selectedTimeSlot}</p>
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

  // ---------------------------------------------------------------------------
  // Awaiting approval of the mobile money prompt
  // ---------------------------------------------------------------------------
  if (step === "awaiting") {
    return (
      <Card className="max-w-3xl mx-auto shadow-salon border-0">
        <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-t-lg">
          <CardTitle>Approve the payment on your phone</CardTitle>
          <CardDescription className="text-white/90">
            We sent a mobile money request for RWF {price.toLocaleString()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-8">
            <div className="relative mx-auto mb-6 h-16 w-16">
              <Smartphone className="h-16 w-16 text-primary" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 animate-ping" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Check your phone</h3>
            <p className="text-sm text-gray-600 max-w-sm mx-auto mb-6">
              We sent a payment request to <span className="font-medium">{mobileMoneyPhone}</span>.
              Enter your PIN to approve it and confirm your booking.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for approval...
            </div>
            <Button variant="outline" className="mt-6" onClick={checkPayment} disabled={checking}>
              {checking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Check Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Timed out: no approval detected within the polling window. The booking
  // stays pending in the DB (never auto-failed on a guess) — offer resend,
  // recheck, or edit.
  // ---------------------------------------------------------------------------
  if (step === "timeout") {
    return (
      <Card className="max-w-3xl mx-auto shadow-salon border-0">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
          <CardTitle>Still waiting for approval</CardTitle>
          <CardDescription className="text-white/90">
            We haven't received the mobile money confirmation yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-6">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No payment detected yet</h3>
            <p className="text-sm text-gray-600 max-w-sm mx-auto mb-6">
              Nothing arrived on <span className="font-medium">{mobileMoneyPhone}</span> within
              the last two minutes. The request may have expired on your phone — resend it,
              check again, or edit your booking.
            </p>
            {payError && <p className="text-sm text-red-600 mb-4">{payError}</p>}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={retryPayment} disabled={isSubmitting} className="rounded-full shadow-md">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Resend Payment Request
              </Button>
              <Button variant="outline" onClick={checkAndResumeWaiting} disabled={checking}>
                {checking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Check Payment Status
              </Button>
              <Button variant="outline" onClick={() => setStep("form")} disabled={isSubmitting}>
                Edit Booking
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Failed: let the customer retry the same booking or go back and edit
  // ---------------------------------------------------------------------------
  if (step === "failed") {
    return (
      <Card className="max-w-3xl mx-auto shadow-salon border-0">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
          <CardTitle>Payment Failed</CardTitle>
          <CardDescription className="text-white/90">
            The mobile money payment was not completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Payment wasn't completed</h3>
            <p className="text-sm text-gray-600 max-w-sm mx-auto mb-6">
              You can retry the payment on {mobileMoneyPhone}, or go back and change your booking details.
            </p>
            {payError && <p className="text-sm text-red-600 mb-4">{payError}</p>}
            <div className="flex items-center justify-center gap-3">
              <Button onClick={retryPayment} disabled={isSubmitting} className="rounded-full shadow-md">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Try Payment Again
              </Button>
              <Button variant="outline" onClick={() => setStep("form")} disabled={isSubmitting}>
                Edit Booking
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------
  return (
    <Card className="max-w-3xl mx-auto shadow-salon border-0 hover:shadow-lg transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-t-lg">
        <CardTitle>Book Your Consultation</CardTitle>
        <CardDescription className="text-white/90">
          Fill out the form below to schedule your consultation with NTDM Animal Hospital.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        {/* Error Message */}
        {payError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 font-medium">Booking Failed</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{payError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  placeholder="Enter your phone number"
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
                      // Disable past dates and Sundays
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

            {/* Payment */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-gray-900">Mobile Money (MTN / Airtel)</span>
                </div>
                <span className="text-sm font-bold text-gray-900">RWF 100</span>
              </div>
              <div>
                <Label htmlFor="mobileMoneyPhone">Mobile Money Number</Label>
                <Input
                  id="mobileMoneyPhone"
                  value={mobileMoneyPhone}
                  onChange={(e) => {
                    mmPhoneTouched.current = true
                    setMobileMoneyPhone(e.target.value)
                  }}
                  placeholder="e.g. 0790706170"
                  required
                  className="border-gray-300 focus:border-primary focus:ring-primary mt-1.5"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  We'll send a payment request to this number — approve it with your PIN to confirm the booking.
                </p>
              </div>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shadow-md"
            disabled={!date || !selectedTimeSlot || !selectedService || !name || !phone || !mobileMoneyPhone || isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing Payment...
              </span>
            ) : (
              "Pay RWF 100 & Book Consultation"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
