export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getHomeConsumptionBalance } from "@/lib/home-consumption"

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const balance = await getHomeConsumptionBalance(farmerId)
    return NextResponse.json(balance)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch home consumption balance" }, { status: 500 })
  }
}
