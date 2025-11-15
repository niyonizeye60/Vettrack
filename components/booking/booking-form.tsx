"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, Mail, AlertCircle } from "lucide-react"
import { sendBookingEmail } from "@/lib/actions/send-booking-email"

// Service categories for the form
const serviceCategories = [
  {
    label: "Tracking Services",
    options: [
      { value: "basic-tracking", label: "Basic GPS Tracking - RWF 15,000" },
      { value: "advanced-monitoring", label: "Advanced Health Monitoring - RWF 25,000" },
      { value: "herd-management", label: "Herd Management System - RWF 100,000" },
      { value: "pet-tracking", label: "Pet Tracking Collar - RWF 12,000" },
    ],
  },
  {
    label: "Consultation Services",
    options: [
      { value: "general-consultation", label: "General Veterinary Consultation - RWF 5,000" },
      { value: "virtual-consultation", label: "Virtual Consultation - RWF 3,000" },
      { value: "emergency-consultation", label: "Emergency Consultation - RWF 8,000" },
      { value: "farm-visit", label: "Farm Visit - RWF 15,000" },
    ],
  },
  {
    label: "Monitoring Services",
    options: [
      { value: "disease-screening", label: "Disease Screening - RWF 7,000" },
      { value: "vaccination-program", label: "Vaccination Program - RWF 10,000" },
      { value: "parasite-control", label: "Parasite Control - RWF 6,000" },
      { value: "reproductive-health", label: "Reproductive Health Monitoring - RWF 8,000" },
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

export default function BookingForm() {
  const searchParams = useSearchParams()
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

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
    setSubmitStatus({ type: null, message: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    try {
      // Prepare booking data
      const bookingData = {
        name,
        phone,
        email,
        service: selectedService,
        animalType,
        animalCount,
        description,
        date: date?.toLocaleDateString() || "",
        timeSlot: selectedTimeSlot,
        whatsappConfirm,
      }

      console.log("Sending booking email...", bookingData)

      // Send booking email
      const result = await sendBookingEmail(bookingData)

      console.log("Email result:", result)

      if (result.success) {
        setSubmitStatus({
          type: "success",
          message: "Booking email sent successfully! We will contact you soon to confirm your appointment.",
        })

        // Reset form after 5 seconds
        setTimeout(() => {
          resetForm()
        }, 5000)
      } else {
        setSubmitStatus({
          type: "error",
          message: result.message || "Failed to send booking email. Please try again or contact us directly.",
        })
      }
    } catch (error) {
      console.error("Error submitting booking:", error)
      setSubmitStatus({
        type: "error",
        message: "An unexpected error occurred. Please try again or contact us directly.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show success screen
  if (submitStatus.type === "success") {
    return (
      <Card className="max-w-3xl mx-auto shadow-salon border-0 hover:shadow-lg transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle>Booking Confirmed!</CardTitle>
          <CardDescription className="text-white/90">
            Your consultation request has been sent successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <Mail className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-green-800">Email Sent Successfully!</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 font-medium mb-2">✅ Booking details sent to NTDM Animal Hospital</p>
              <p className="text-green-700 text-sm">{submitStatus.message}</p>
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-6">
              <p>📧 Confirmation sent to: ntdm2050@gmail.com</p>
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
        {submitStatus.type === "error" && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 font-medium">Booking Failed</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{submitStatus.message}</p>
            <Button
              onClick={() => setSubmitStatus({ type: null, message: "" })}
              variant="outline"
              size="sm"
              className="mt-3 border-red-300 text-red-700 hover:bg-red-50"
            >
              Try Again
            </Button>
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="whatsapp"
                checked={whatsappConfirm}
                onCheckedChange={(checked) => setWhatsappConfirm(checked as boolean)}
              />
              <label
                htmlFor="whatsapp"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Send confirmation via WhatsApp
              </label>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shadow-md"
            disabled={!date || !selectedTimeSlot || !selectedService || !name || !phone || isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Email...
              </div>
            ) : (
              "Book Consultation"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
