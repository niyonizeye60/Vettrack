"use client"

import SellerSales from "@/components/seller/seller-sales"

/** The feed supplier's sales. The page itself is shared with the pharmacy portal. */
export default function FeedSupplierSalesPage() {
  return (
    <SellerSales
      copy={{
        descKey: "feedSupplier.salesDesc",
        explainerKey: "feedSupplier.salesExplainer",
        searchKey: "feedSupplier.salesSearch",
      }}
    />
  )
}
