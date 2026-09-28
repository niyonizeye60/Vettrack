export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { isFarmLocationRestrictionEnabled } from "@/lib/farm-location-restriction"

// Lets the client location gate (components/livestock/location-gate.tsx) skip the GPS
// prompt while a superadmin has the restriction switched off. A UX hint only: the
// record routes re-read the setting server-side through verifyOnFarmLocation.
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ enabled: await isFarmLocationRestrictionEnabled() })
  } catch (error) {
    console.error("Error fetching farm location restriction:", error)
    return NextResponse.json({ enabled: true })
  }
}
