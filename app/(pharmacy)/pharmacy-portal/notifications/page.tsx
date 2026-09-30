"use client"

import SellerNotifications from "@/components/seller/seller-notifications"

/** Review decisions on the pharmacy's drugs, sales, and announcements. */
export default function PharmacyNotificationsPage() {
  return <SellerNotifications role="pharmacy" descKey="pharmacy.notificationsDesc" />
}
