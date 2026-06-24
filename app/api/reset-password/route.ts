export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import clientPromise from "@/lib/db"

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 })
    }

    const tokenHash = createHash("sha256").update(token).digest("hex")

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const user = await db.collection("users").findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { $gt: new Date() },
    })

    return NextResponse.json({ valid: !!user })
  } catch (error) {
    console.error("Error validating reset token:", error)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ success: false, message: "Token and password are required" }, { status: 400 })
    }

    if (password.length < 8 || !PASSWORD_COMPLEXITY_REGEX.test(password)) {
      return NextResponse.json({ success: false, message: "Password does not meet requirements" }, { status: 400 })
    }

    const tokenHash = createHash("sha256").update(token).digest("hex")

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const user = await db.collection("users").findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { $gt: new Date() },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid or expired reset link" }, { status: 400 })
    }

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { password, updatedAt: new Date() },
        $unset: { resetTokenHash: "", resetTokenExpiresAt: "" },
      }
    )

    return NextResponse.json({ success: true, message: "Password reset successfully" })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 })
  }
}
