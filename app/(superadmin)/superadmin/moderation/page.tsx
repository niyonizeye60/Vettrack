export const dynamic = "force-dynamic"

import { Suspense } from "react"
import { getChatReports, getAllConversationsForModeration } from "@/lib/actions/chat-moderation"
import ChatModeration from "@/components/superadmin/chat-moderation"

export default async function ModerationPage() {
  const [reports, conversations] = await Promise.all([
    getChatReports(),
    getAllConversationsForModeration(),
  ])

  return (
    <Suspense fallback={<div>Loading moderation...</div>}>
      <ChatModeration initialReports={reports} initialConversations={conversations} />
    </Suspense>
  )
}
