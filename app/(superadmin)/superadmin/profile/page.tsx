import { Suspense } from "react"
import { getCurrentUser } from "@/lib/auth"
import ProfilePageClient from "./ProfilePageClient"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/login")
  }

  // Convert user data to profile format
  const userProfile = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: (user as any).phone || "",
    role: user.role,
    bio: (user as any).bio || "",
    location: (user as any).location || "",
    createdAt: (user as any).createdAt || new Date(),
    updatedAt: (user as any).updatedAt || new Date()
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfilePageClient initialProfile={userProfile} />
    </Suspense>
  )
}