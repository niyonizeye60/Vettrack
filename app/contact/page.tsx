import type { Metadata } from "next"
import ContactContent from "@/components/contact/contact-content"

export const metadata: Metadata = {
  title: "Contact Us - NTDM Animal Hospital",
  description: "Get in touch with NTDM Animal Hospital. Find our location, contact information, and business hours.",
}

export default function ContactPage() {
  return <ContactContent />
}