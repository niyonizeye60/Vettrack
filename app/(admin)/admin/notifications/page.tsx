"use client"

import SellerNotifications from "@/components/seller/seller-notifications"

/**
 * Everything admins are alerted about (lib/admin-notifications.ts), messages superadmin
 * sends them, and announcements. `role` must match the NotificationBell in AdminHeader.
 */
export default function AdminNotificationsPage() {
  return <SellerNotifications role="admin" descKey="admin.notificationsDesc" />
}
