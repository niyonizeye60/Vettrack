export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { logActivity } from "@/lib/activity-log"
import { createRule, getActiveRule, listRules, serializeRule } from "@/lib/db-commission-rules"

const ruleSchema = z
  .object({
    mode: z.enum(["percent", "flat"]),
    value: z.coerce.number().positive("Enter a value above zero"),
    minFee: z.coerce.number().min(0).nullable().optional(),
    maxFee: z.coerce.number().min(0).nullable().optional(),
    effectiveFrom: z.string().datetime().optional(),
  })
  .refine((r) => r.mode !== "percent" || r.value <= 100, {
    message: "A percentage cannot exceed 100",
    path: ["value"],
  })
  .refine((r) => r.minFee == null || r.maxFee == null || r.minFee <= r.maxFee, {
    message: "The minimum fee cannot be above the maximum",
    path: ["minFee"],
  })

/** GET - the rule in force plus the history behind it. */
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!can(currentUser.role, "finance.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [active, history] = await Promise.all([getActiveRule("sales"), listRules("sales")])
    return NextResponse.json({ active, history: history.map(serializeRule) })
  } catch (error) {
    console.error("Error loading commission rules:", error)
    return NextResponse.json({ error: "Failed to load commission settings" }, { status: 500 })
  }
}

/**
 * POST - set a new fee.
 *
 * Appends rather than edits. The previous rule stays exactly as it was, so figures
 * already reported against it cannot shift under a later rate change.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!can(currentUser.role, "finance.commission.configure")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const parsed = ruleSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid commission settings" },
        { status: 400 }
      )
    }

    const rule = await createRule(
      {
        mode: parsed.data.mode,
        value: parsed.data.value,
        minFee: parsed.data.minFee ?? null,
        maxFee: parsed.data.maxFee ?? null,
        effectiveFrom: parsed.data.effectiveFrom ? new Date(parsed.data.effectiveFrom) : undefined,
      },
      currentUser._id
    )

    await logActivity(
      currentUser._id,
      "finance.commission.updated",
      `Connection fee set to ${parsed.data.mode === "percent" ? `${parsed.data.value}%` : `RWF ${parsed.data.value}`}`
    )

    return NextResponse.json(serializeRule(rule), { status: 201 })
  } catch (error) {
    console.error("Error saving commission rule:", error)
    return NextResponse.json({ error: "Failed to save commission settings" }, { status: 500 })
  }
}
