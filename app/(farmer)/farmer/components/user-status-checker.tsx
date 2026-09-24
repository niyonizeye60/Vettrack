"use client"

import { useUserStatus } from "@/hooks/useUserStatus"
import { useSessionTimeout } from "@/hooks/useSessionTimeout"
import { useDailySummaryEmail } from "@/hooks/useDailySummaryEmail"
import { useInseminationReminders } from "@/hooks/useInseminationReminders"

export default function UserStatusChecker() {
  const statusModal = useUserStatus()
  const sessionModal = useSessionTimeout()
  useDailySummaryEmail()
  useInseminationReminders()
  return (
    <>
      {statusModal}
      {sessionModal}
    </>
  )
}