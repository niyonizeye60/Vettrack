export const dynamic = "force-dynamic";
import { logoutUser } from "@/lib/actions/auth"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    await logoutUser()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}