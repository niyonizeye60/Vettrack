import type { Metadata } from "next"
import PrivacyContent from "@/components/legal/privacy-content"

export const metadata: Metadata = {
  title: "Privacy Policy - NTDM Animal Hospital",
  description: "Privacy Policy for NTDM Animal Hospital's tracking, consultation, and marketplace platform.",
}

export default function PrivacyPage() {
  return <PrivacyContent />
}
