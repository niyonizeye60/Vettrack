import type { Metadata } from "next"
import TermsContent from "@/components/legal/terms-content"

export const metadata: Metadata = {
  title: "Terms of Service - NTDM Vettrack",
  description: "Terms of Service for NTDM Vettrack's tracking, consultation, and marketplace platform.",
}

export default function TermsPage() {
  return <TermsContent />
}
