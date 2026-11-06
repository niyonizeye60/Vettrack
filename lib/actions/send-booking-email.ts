"use server"

import { cookies, headers } from "next/headers"
import { sendBookingNotificationEmail } from "@/lib/email"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

export interface BookingData {
  name: string
  phone: string
  email?: string
  service: string
  animalType: string
  animalCount: string
  description?: string
  date: string
  timeSlot: string
}

const getServiceLabel = (serviceValue: string): string => {
  const serviceCategories = [
    {
      options: [
        { value: "basic-tracking", label: "Basic GPS Tracking - RWF 100" },
        { value: "advanced-monitoring", label: "Advanced Health Monitoring - RWF 100" },
        { value: "herd-management", label: "Herd Management System - RWF 100" },
        { value: "pet-tracking", label: "Pet Tracking Collar - RWF 100" },
      ],
    },
    {
      options: [
        { value: "general-consultation", label: "General Veterinary Consultation - RWF 100" },
        { value: "virtual-consultation", label: "Virtual Consultation - RWF 100" },
        { value: "emergency-consultation", label: "Emergency Consultation - RWF 100" },
        { value: "farm-visit", label: "Farm Visit - RWF 100" },
      ],
    },
    {
      options: [
        { value: "disease-screening", label: "Disease Screening - RWF 100" },
        { value: "vaccination-program", label: "Vaccination Program - RWF 100" },
        { value: "parasite-control", label: "Parasite Control - RWF 100" },
        { value: "reproductive-health", label: "Reproductive Health Monitoring - RWF 100" },
      ],
    },
  ]

  for (const category of serviceCategories) {
    const match = category.options.find((o) => o.value === serviceValue)
    if (match) return match.label
  }
  return serviceValue
}


// Public form: anyone can send it, so it gets the same limit as sign-up (by session, else by IP).
async function withinLimit() {
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || headers().get("x-real-ip")
  const { success } = await checkRateLimit(getRateLimitKey(cookies().get("session")?.value, ip), "sensitive")
  return success
}

export async function sendBookingEmail(bookingData: BookingData) {
  try {
    if (!(await withinLimit())) return { success: false, message: "Too many attempts. Please try again in a minute." }

    const result = await sendBookingNotificationEmail({
      ...bookingData,
      serviceLabel: getServiceLabel(bookingData.service),
    })

    if (!result.success) {
      const msg = result.error || "Failed to send booking email"
      // The email is only a notification to staff - when SMTP isn't configured
      // (e.g. local development) the booking itself is still valid, so treat it
      // as accepted and log the details instead of failing the form.
      if (msg === "Email service not configured") {
        console.warn("Booking email skipped (SMTP not configured). Booking details:", bookingData)
        return { success: true, message: "Booking request received! (Email notifications are not configured in this environment.)" }
      }
      // SMTP credentials are filled in but the send itself failed - that's a real
      // failure and the admin should know the notification didn't go out.
      return { success: false, message: msg }
    }

    return { success: true, message: "Booking email sent successfully!" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return { success: false, message }
  }
}
