export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"
import clientPromise from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const user = await db.collection("users").findOne({ email })

    if (user) {
      const rawToken = randomBytes(32).toString("hex")
      const resetTokenHash = createHash("sha256").update(rawToken).digest("hex")
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000)

      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { resetTokenHash, resetTokenExpiresAt } }
      )

      try {
        await sendPasswordResetEmail(user.email, user.name, rawToken)
      } catch (emailError) {
        console.error("Error sending password reset email:", emailError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    })
  } catch (error) {
    console.error("Error processing forgot password request:", error)
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 })
  }
}
