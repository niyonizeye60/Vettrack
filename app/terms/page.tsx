import type { Metadata } from "next"
import TermsContent from "@/components/legal/terms-content"

export const metadata: Metadata = {
  title: "Terms of Service - NTDM Animal Hospital",
  description: "Terms of Service for NTDM Animal Hospital's tracking, consultation, and marketplace platform.",
}

export default function TermsPage() {
  return <TermsContent />
}
