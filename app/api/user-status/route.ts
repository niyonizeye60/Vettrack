export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ status: 'unauthenticated' })
    }

    return NextResponse.json({ 
      status: user.status || 'active',
      userId: user._id 
    })
  } catch (error) {
    console.error('Error checking user status:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}