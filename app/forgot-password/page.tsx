import type { Metadata } from "next"
import ForgotPasswordContent from "@/components/auth/forgot-password-content"

export const metadata: Metadata = {
  title: "Forgot Password - NTDM Animal Hospital",
  description: "Reset your NTDM Animal Hospital account password.",
}

export const dynamic = "force-dynamic"

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />
}
