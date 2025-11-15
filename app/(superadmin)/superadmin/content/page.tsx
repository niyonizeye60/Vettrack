import { Suspense } from "react"
import { getSystemAnnouncements } from "@/lib/actions/superadmin"
import ContentPageClient from "./ContentPageClient"

export default async function ContentPage() {
  const announcements = await getSystemAnnouncements()

  return (
    <Suspense fallback={<div>Loading content...</div>}>
      <ContentPageClient initialAnnouncements={announcements} />
    </Suspense>
  )
}