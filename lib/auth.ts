"use server"

import clientPromise, { withDbRetry } from "./db"
import { cookies } from "next/headers"
import { ObjectId } from "mongodb"

interface User {
  _id: string
  role: string
  name: string
  email: string
  status: string
  phone?: string
  bio?: string
  district?: string
  sector?: string
  image?: string
  createdAt?: string | Date
  [key: string]: unknown
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const cookieStore = cookies()
    const sessionId = cookieStore.get("session")?.value
    
    if (!sessionId) {
      return null
    }

    // First, find the session in the sessions collection. Retried so a transient
    // read failure isn't mistaken for an expired/missing session (which would
    // redirect the user to /login on the next refresh).
    const session = await withDbRetry(() =>
      db.collection("sessions").findOne({
        sessionId,
        expiresAt: { $gt: new Date() },
      })
    )

    if (!session) {
      // Session expired or doesn't exist
      // Don't delete cookie here - let it expire naturally or handle in logout action
      return null
    }

    // Then, find the user using the userId from the session
    const user = await withDbRetry(() =>
      db.collection("users").findOne({
        _id: session.userId,
      })
    )

    if (!user) {
      // User doesn't exist, clean up the session from database
      await db.collection("sessions").deleteOne({ sessionId })
      // Don't delete cookie here
      return null
    }

    // Don't return the password
    const { password, ...userWithoutPassword } = user
    return { ...userWithoutPassword, _id: user._id.toString(), status: user.status } as User
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}