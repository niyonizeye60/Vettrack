import type { Metadata } from "next"
import RegisterContent from "@/components/auth/register-content"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { homePathForRole } from "@/lib/roles"

export const metadata: Metadata = {
  title: "Register - NTDM Vettrack",
  description: "Create an account with NTDM Vettrack to access our services.",
}

export const dynamic = "force-dynamic"

export default async function RegisterPage() {
  const user = await getCurrentUser()

  // If user is already authenticated, redirect to their dashboard
  if (user) {
    redirect(homePathForRole(user.role))
  }
  
  return <RegisterContent />
}