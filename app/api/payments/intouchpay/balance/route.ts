export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getIntouchBalance } from "@/lib/payments/intouchpay"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !["superadmin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await getIntouchBalance()

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching IntouchPay balance:", error)
    return NextResponse.json({ balance: 0, success: false, message: "Failed to fetch balance" }, { status: 500 })
  }
}
