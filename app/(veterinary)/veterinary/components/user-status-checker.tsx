"use client"

import { useUserStatus } from "@/hooks/useUserStatus"
import { useSessionTimeout } from "@/hooks/useSessionTimeout"

export default function UserStatusChecker() {
  const statusModal = useUserStatus()
  const sessionModal = useSessionTimeout()
  return (
    <>
      {statusModal}
      {sessionModal}
    </>
  )
}