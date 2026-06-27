import type { Metadata } from "next"
import { Suspense } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import ResetPasswordForm from "@/components/auth/reset-password-form"

export const metadata: Metadata = {
  title: "Reset Password - NTDM Animal Hospital",
  description: "Choose a new password for your NTDM Animal Hospital account.",
}

export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex pt-20">
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="https://images.unsplash.com/photo-1568572933382-74d440642117?w=1200&h=1600&fit=crop&crop=focalpoint&auto=format&q=80"
          alt="Veterinarian with animals"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
