"use client"

import { useEffect, useState } from "react"
import { DEFAULT_PRODUCT_RULES, type ProductRules } from "@/lib/product-rules"

/**
 * The expiry rules in force (lib/product-rules.ts), fetched once per page. Until they
 * arrive the defaults stand in; the server applies the real values either way, so a
 * badge that is briefly off by the default is the worst that can happen.
 */
export function useProductRules(): ProductRules {
  const [rules, setRules] = useState<ProductRules>(DEFAULT_PRODUCT_RULES)

  useEffect(() => {
    let cancelled = false
    fetch("/api/product-rules")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.sellByDays === "number") setRules(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return rules
}
