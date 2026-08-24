"use client"

import AdminSidebar from "@/components/admin/admin-sidebar"
import AdminHeader from "@/components/admin/admin-header"
import StaffLayoutClient from "@/components/staff/staff-layout-client"

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StaffLayoutClient sidebar={<AdminSidebar />} header={<AdminHeader />}>
      {children}
    </StaffLayoutClient>
  )
}
