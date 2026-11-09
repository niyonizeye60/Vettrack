"use client"

import { useUserStatus } from "@/hooks/useUserStatus"
import { useSessionTimeout } from "@/hooks/useSessionTimeout"
import { useDailySummaryEmail } from "@/hooks/useDailySummaryEmail"
import { useInseminationReminders } from "@/hooks/useInseminationReminders"
import { useCalfGraduationReminders } from "@/hooks/useCalfGraduationReminders"
import { useFeedingPlans } from "@/hooks/useFeedingPlans"

export default function UserStatusChecker() {
  const statusModal = useUserStatus()
  const sessionModal = useSessionTimeout()
  useDailySummaryEmail()
  useInseminationReminders()
  useCalfGraduationReminders()
  useFeedingPlans()
  return (
    <>
      {statusModal}
      {sessionModal}
    </>
  )
}