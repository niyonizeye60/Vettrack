"use server"

import nodemailer from "nodemailer"

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

export async function sendBookingEmail(bookingData: BookingData) {
  try {
    console.log("Starting email send process...")
    console.log("Environment check:", {
      hasHost: !!process.env.SMTP_HOST,
      hasPort: !!process.env.SMTP_PORT,
      hasUser: !!process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD,
    })

    // Validate environment variables
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error("Missing required email configuration. Please check environment variables.")
    }

    // Create transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    console.log("Transporter created successfully")

    // Verify connection
    await transporter.verify()
    console.log("SMTP connection verified")

    // Get service label from the booking data
    const getServiceLabel = (serviceValue: string) => {
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

      for (const category of serviceCategories) {
        const service = category.options.find((option) => option.value === serviceValue)
        if (service) return service.label
      }
      return serviceValue
    }

    const serviceLabel = getServiceLabel(bookingData.service)

    // Email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🐾 New Booking Consultation</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">NTDM Animal Hospital</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Booking Details</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #667eea; margin-top: 0;">Client Information</h3>
            <p><strong>Name:</strong> ${bookingData.name}</p>
            <p><strong>Phone:</strong> ${bookingData.phone}</p>
            ${bookingData.email ? `<p><strong>Email:</strong> ${bookingData.email}</p>` : ""}
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #667eea; margin-top: 0;">Service Information</h3>
            <p><strong>Service:</strong> ${serviceLabel}</p>
            <p><strong>Animal Type:</strong> ${bookingData.animalType}</p>
            <p><strong>Number of Animals:</strong> ${bookingData.animalCount}</p>
            ${bookingData.description ? `<p><strong>Description:</strong> ${bookingData.description}</p>` : ""}
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #667eea; margin-top: 0;">Appointment Schedule</h3>
            <p><strong>Date:</strong> ${bookingData.date}</p>
            <p><strong>Time:</strong> ${bookingData.timeSlot}</p>
            <p><strong>WhatsApp Confirmation:</strong> ${bookingData.whatsappConfirm ? "Yes" : "No"}</p>
          </div>

          <div style="background: #e8f2ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #333;"><strong>📅 Next Steps:</strong> Please confirm this appointment and contact the client to finalize the booking details.</p>
          </div>
        </div>

        <div style="background: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 14px;">NTDM Animal Hospital - Professional Veterinary Care</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">Booking submitted at: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `

    console.log("Sending email...")

    // Send email
    const info = await transporter.sendMail({
      from: `"NTDM Animal Hospital" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to your own email
      subject: `🐾 New Booking: ${bookingData.name} - ${serviceLabel}`,
      html: emailContent,
    })

    console.log("Email sent successfully:", info.messageId)

    return {
      success: true,
      message: "Booking email sent successfully!",
      messageId: info.messageId,
    }
  } catch (error) {
    console.error("Error sending email:", error)

    // Provide more specific error messages
    let errorMessage = "Failed to send booking email"

    if (error instanceof Error) {
      if (error.message.includes("authentication")) {
        errorMessage = "Email authentication failed. Please check email credentials."
      } else if (error.message.includes("connection")) {
        errorMessage = "Could not connect to email server. Please try again."
      } else if (error.message.includes("environment")) {
        errorMessage = "Email configuration is incomplete."
      } else {
        errorMessage = `Email error: ${error.message}`
      }
    }

    return {
      success: false,
      message: errorMessage,
    }
  }
}
