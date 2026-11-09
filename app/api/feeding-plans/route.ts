export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { errorMessage } from "@/lib/error-messages"
import { createFeedingPlan, listFeedingPlans, stopFeedingPlan, updateFeedingPlan } from "@/lib/feeding-plans"

// Feeding plans on the Animal Expenses tab - see lib/feeding-plans.ts. Same access as
// /api/animal-expenses: a farmer manages their own farm's, staff any farm's.

const isStaffRole = (role: string) => ["admin", "superadmin"].includes(role)

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: errorMessage("unauthorized") }, { status: 401 })

    const farmerId = new URL(req.url).searchParams.get("farmerId")
    if (!farmerId) return NextResponse.json({ error: errorMessage("invalidRequest") }, { status: 400 })
    if (!isStaffRole(currentUser.role) && farmerId !== currentUser._id) {
      return NextResponse.json({ error: errorMessage("forbidden") }, { status: 403 })
    }

    return NextResponse.json(await listFeedingPlans(farmerId))
  } catch (error) {
    console.error("Error fetching feeding plans:", error)
    return NextResponse.json({ error: errorMessage("failedToFetchFeedingPlans") }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: errorMessage("unauthorized") }, { status: 401 })

    const body = await req.json().catch(() => null)
    const farmerId = body?.farmerId
    if (typeof farmerId !== "string" || !farmerId) {
      return NextResponse.json({ error: errorMessage("invalidRequest") }, { status: 400 })
    }
    if (!isStaffRole(currentUser.role) && farmerId !== currentUser._id) {
      return NextResponse.json({ error: errorMessage("forbidden") }, { status: 403 })
    }

    const result = await createFeedingPlan(
      {
        farmerId,
        startDate: body.startDate,
        endDate: body.endDate,
        time: body.time,
        notes: body.notes,
        animalIds: body.animalIds,
        rations: body.rations,
      },
      currentUser._id
    )
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    await logActivity(
      currentUser._id,
      "livestock.feeding_plan_created",
      `${Array.isArray(body.animalIds) ? body.animalIds.length : 0} animals, ${body.startDate} to ${body.endDate}`
    )
    return NextResponse.json({ success: true, id: result.id, recorded: result.recorded })
  } catch (error) {
    console.error("Error creating feeding plan:", error)
    return NextResponse.json({ error: errorMessage("failedToSaveFeedingPlan") }, { status: 500 })
  }
}

/** Edit a running or upcoming plan. The records already written stay as they are. */
export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: errorMessage("unauthorized") }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (typeof body?.id !== "string") {
      return NextResponse.json({ error: errorMessage("invalidRequest") }, { status: 400 })
    }

    const result = await updateFeedingPlan(
      body.id,
      {
        startDate: body.startDate,
        endDate: body.endDate,
        time: body.time,
        notes: body.notes,
        animalIds: body.animalIds,
        rations: body.rations,
      },
      { _id: currentUser._id, isStaff: isStaffRole(currentUser.role) }
    )
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    await logActivity(currentUser._id, "livestock.feeding_plan_updated", body.id)
    return NextResponse.json({ success: true, recorded: result.recorded })
  } catch (error) {
    console.error("Error updating feeding plan:", error)
    return NextResponse.json({ error: errorMessage("failedToSaveFeedingPlan") }, { status: 500 })
  }
}

/** Stop a plan early: { id, status: "stopped" }. Its records so far stay. */
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: errorMessage("unauthorized") }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (typeof body?.id !== "string" || body?.status !== "stopped") {
      return NextResponse.json({ error: errorMessage("invalidRequest") }, { status: 400 })
    }

    const result = await stopFeedingPlan(body.id, { _id: currentUser._id, isStaff: isStaffRole(currentUser.role) })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    await logActivity(currentUser._id, "livestock.feeding_plan_stopped", body.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error stopping feeding plan:", error)
    return NextResponse.json({ error: errorMessage("failedToStopFeedingPlan") }, { status: 500 })
  }
}
