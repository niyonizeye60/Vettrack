"use client"

import SellerSales from "@/components/seller/seller-sales"

/** The pharmacy's drug sales. The page itself is shared with the feed supplier portal. */
export default function PharmacySalesPage() {
  return (
    <SellerSales
      copy={{
        descKey: "pharmacy.salesDesc",
        explainerKey: "pharmacy.salesExplainer",
        searchKey: "pharmacy.salesSearch",
      }}
    />
  )
}
