import type { Metadata } from "next"
import LoginContent from "@/components/auth/login-content"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { homePathForRole } from "@/lib/roles"

export const metadata: Metadata = {
  title: "Login - NTDM Vettrack",
  description: "Log in to your NTDM Vettrack account to access your dashboard and manage your animals.",
}

// ⬅️ force Next.js to render this page dynamically (SSR)
export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const user = await getCurrentUser()
  
  // If user is already authenticated, redirect to their dashboard
  if (user) {
    redirect(homePathForRole(user.role))
  }

  return <LoginContent />
}