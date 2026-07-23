export const dynamic = "force-dynamic"

import { Suspense } from "react"
import { getChatReports, getAllConversationsForModeration } from "@/lib/actions/chat-moderation"
import ChatModeration from "@/components/superadmin/chat-moderation"
import { Skeleton } from "@/components/ui/skeleton"

export default async function ModerationPage() {
  const [reports, conversations] = await Promise.all([
    getChatReports(),
    getAllConversationsForModeration(),
  ])

  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <ChatModeration initialReports={reports} initialConversations={conversations} />
    </Suspense>
  )
}
