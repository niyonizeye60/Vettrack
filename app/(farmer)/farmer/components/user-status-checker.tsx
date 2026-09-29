"use client"

import { useUserStatus } from "@/hooks/useUserStatus"
import { useSessionTimeout } from "@/hooks/useSessionTimeout"
import { useDailySummaryEmail } from "@/hooks/useDailySummaryEmail"
import { useInseminationReminders } from "@/hooks/useInseminationReminders"
import { useCalfGraduationReminders } from "@/hooks/useCalfGraduationReminders"

export default function UserStatusChecker() {
  const statusModal = useUserStatus()
  const sessionModal = useSessionTimeout()
  useDailySummaryEmail()
  useInseminationReminders()
  useCalfGraduationReminders()
  return (
    <>
      {statusModal}
      {sessionModal}
    </>
  )
}