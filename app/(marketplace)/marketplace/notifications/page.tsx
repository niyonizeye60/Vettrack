"use client"

import SellerNotifications from "@/components/seller/seller-notifications"

/** Stock and expiry alerts on Vettrack's own products, and announcements. */
export default function MarketplaceNotificationsPage() {
  return <SellerNotifications role="marketplace_admin" descKey="marketplace.notificationsDesc" />
}
