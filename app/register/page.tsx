import type { Metadata } from "next"
import RegisterContent from "@/components/auth/register-content"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Register - NTDM Animal Hospital",
  description: "Create an account with NTDM Animal Hospital to access our services.",
}

export const dynamic = "force-dynamic"

export default async function RegisterPage() {
  const user = await getCurrentUser()

  // If user is already authenticated, redirect to their dashboard
  if (user) {
    if (user.role === "farmer") {
      redirect("/farmer")
    } else if (user.role === "doctor") {
      redirect("/veterinary")
    } else if(user.role === "admin") {
      redirect("/admin")
    }
    else if (user.role === "superadmin") {
      redirect("/superadmin")
    } else {
      redirect("/")
    }
  }
  
  return <RegisterContent />
}