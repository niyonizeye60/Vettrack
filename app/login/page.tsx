import type { Metadata } from "next"
import LoginContent from "@/components/auth/login-content"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Login - NTDM Animal Hospital",
  description: "Log in to your NTDM Animal Hospital account to access your dashboard and manage your animals.",
}

// ⬅️ force Next.js to render this page dynamically (SSR)
export const dynamic = "force-dynamic"

export default async function LoginPage() {
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

  return <LoginContent />
}