"use server"

import { sendContactNotificationEmail } from "@/lib/email"

interface ContactData {
  name: string
  email: string
  phone: string
  message: string
}

export async function sendContactEmail(contactData: ContactData) {
  try {
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
