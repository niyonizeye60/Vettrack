"use client"

import { useEffect } from "react"
import AdminSidebar from "@/components/admin/admin-sidebar"
import AdminHeader from "@/components/admin/admin-header"
import StaffLayoutClient from "@/components/staff/staff-layout-client"

/** How often an open admin portal asks for the timed alert checks (lib/admin-alerts.ts). */
const ALERT_CHECK_MS = 60 * 60 * 1000

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  // The daily cron also runs these checks; asking from here means a consultation or ticket
  // that crosses 24 hours of waiting is flagged within the hour while admins are working.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible") {
        fetch("/api/admin/alerts/check", { method: "POST" }).catch(() => {})
      }
    }
    check()
    const timer = setInterval(check, ALERT_CHECK_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <StaffLayoutClient sidebar={<AdminSidebar />} header={<AdminHeader />}>
      {children}
    </StaffLayoutClient>
  )
}
