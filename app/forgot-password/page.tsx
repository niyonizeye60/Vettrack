import type { Metadata } from "next"
import ForgotPasswordContent from "@/components/auth/forgot-password-content"

export const metadata: Metadata = {
  title: "Forgot Password - NTDM Vettrack",
  description: "Reset your NTDM Vettrack account password.",
}

export const dynamic = "force-dynamic"

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />
}
