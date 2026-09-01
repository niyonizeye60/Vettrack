import type { Metadata } from "next"
import PrivacyContent from "@/components/legal/privacy-content"

export const metadata: Metadata = {
  title: "Privacy Policy - NTDM Vettrack",
  description: "Privacy Policy for NTDM Vettrack's tracking, consultation, and marketplace platform.",
}

export default function PrivacyPage() {
  return <PrivacyContent />
}
