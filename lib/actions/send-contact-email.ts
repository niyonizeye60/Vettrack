"use server"

import { cookies, headers } from "next/headers"
import { sendContactNotificationEmail } from "@/lib/email"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

interface ContactData {
  name: string
  email: string
  phone: string
  message: string
}


// Public form: anyone can send it, so it gets the same limit as sign-up (by session, else by IP).
async function withinLimit() {
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || headers().get("x-real-ip")
  const { success } = await checkRateLimit(getRateLimitKey(cookies().get("session")?.value, ip), "sensitive")
  return success
}

export async function sendContactEmail(contactData: ContactData) {
  try {
    if (!(await withinLimit())) return { success: false, message: "Too many attempts. Please try again in a minute." }

    const result = await sendContactNotificationEmail(contactData)

    if (!result.success) {
      const msg = result.error || "Failed to send message"
      return { success: false, message: msg }
    }

    return { success: true, message: "Message sent successfully!" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return { success: false, message }
  }
}
