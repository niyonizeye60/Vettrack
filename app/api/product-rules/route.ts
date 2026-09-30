export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getProductRules } from "@/lib/db-settings"
import { DEFAULT_PRODUCT_RULES } from "@/lib/product-rules"

/**
 * GET - the expiry rules in force (the sell-by cutoff superadmin sets, and the minimum
 * time a new listing must stay on sale), so forms and badges agree with the server.
 * Nothing here is private: it is the same rule the public pages already apply.
 */
export async function GET() {
  try {
    return NextResponse.json(await getProductRules())
  } catch (error) {
    console.error("Error loading product rules:", error)
    return NextResponse.json(DEFAULT_PRODUCT_RULES)
  }
}
