"use server"

import { sendBookingNotificationEmail } from "@/lib/email"

interface BookingData {
  name: string
  phone: string
  email?: string
  service: string
  animalType: string
  animalCount: string
  description?: string
  date: string
  timeSlot: string
  whatsappConfirm: boolean
}

const getServiceLabel = (serviceValue: string): string => {
  const serviceCategories = [
    {
      options: [
        { value: "basic-tracking", label: "Basic GPS Tracking - RWF 15,000" },
        { value: "advanced-monitoring", label: "Advanced Health Monitoring - RWF 25,000" },
        { value: "herd-management", label: "Herd Management System - RWF 100,000" },
        { value: "pet-tracking", label: "Pet Tracking Collar - RWF 12,000" },
      ],
    },
    {
      options: [
        { value: "general-consultation", label: "General Veterinary Consultation - RWF 5,000" },
        { value: "virtual-consultation", label: "Virtual Consultation - RWF 3,000" },
        { value: "emergency-consultation", label: "Emergency Consultation - RWF 8,000" },
        { value: "farm-visit", label: "Farm Visit - RWF 15,000" },
      ],
    },
    {
      options: [
        { value: "disease-screening", label: "Disease Screening - RWF 7,000" },
        { value: "vaccination-program", label: "Vaccination Program - RWF 10,000" },
        { value: "parasite-control", label: "Parasite Control - RWF 6,000" },
        { value: "reproductive-health", label: "Reproductive Health Monitoring - RWF 8,000" },
      ],
    },
  ]

  for (const category of serviceCategories) {
    const match = category.options.find((o) => o.value === serviceValue)
    if (match) return match.label
  }
  return serviceValue
}

export async function sendBookingEmail(bookingData: BookingData) {
  try {
    const result = await sendBookingNotificationEmail({
      ...bookingData,
      serviceLabel: getServiceLabel(bookingData.service),
    })

    if (!result.success) {
      const msg = result.error || "Failed to send booking email"
      return { success: false, message: msg }
    }

    return { success: true, message: "Booking email sent successfully!" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return { success: false, message }
  }
}
