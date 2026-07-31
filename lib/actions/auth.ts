"use server"
import clientPromise, { withDbRetry } from "../db"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { sendWelcomeEmail } from "../email" // Import the email function
import { hashPassword, verifyPassword, isHashedPassword } from "../password"
import { logActivity, logSystemError } from "../activity-log"
import { checkRateLimit, getRateLimitKey } from "../rate-limit"

// Ensured once per warm process, not on every registration - createIndex is a
// no-op after the first call, but there's no need to pay even that round trip
// on every request. Failure (e.g. pre-existing duplicate emails in the
// collection from before this index existed) must not block registration -
// it just means we fall back to the findOne-only check below for this run.
let usersEmailIndexEnsured = false
async function ensureUsersEmailIndex(db: import("mongodb").Db) {
  if (usersEmailIndexEnsured) return
  try {
    await db.collection("users").createIndex({ email: 1 }, { unique: true })
    usersEmailIndexEnsured = true
  } catch (error) {
    console.error("Failed to ensure unique index on users.email:", error)
  }
}

// Same fail-safe-ensure pattern as ensureUsersEmailIndex - speeds up the
// per-email lockout lookup in loginUser without ever blocking login on
// index-creation failure.
let loginAttemptsIndexEnsured = false
async function ensureLoginAttemptsIndex(db: import("mongodb").Db) {
  if (loginAttemptsIndexEnsured) return
  try {
    await db.collection("login_attempts").createIndex({ email: 1, createdAt: 1 })
    loginAttemptsIndexEnsured = true
  } catch (error) {
    console.error("Failed to ensure index on login_attempts:", error)
  }
}

const LOGIN_LOCKOUT_THRESHOLD = 5
const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000

function getRequestRateLimitKey(sessionId: string | undefined) {
  const headerList = headers()
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip")
  return getRateLimitKey(sessionId, ip)
}

// Register a new user
export async function registerUser(formData: FormData) {
  try {
    const rateLimitKey = getRequestRateLimitKey(cookies().get("session")?.value)
    const { success: withinLimit } = await checkRateLimit(rateLimitKey, "sensitive")
    if (!withinLimit) {
      return { success: false, message: "Too many attempts. Please try again in a minute." }
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    await ensureUsersEmailIndex(db)

    const roleInput = formData.get("role")
    if (roleInput !== "farmer" && roleInput !== "doctor" && roleInput !== "admin" && roleInput !== "superadmin") {
      return { success: false, message: "Invalid account type" }
    }
    const role = roleInput

    // This action is reachable directly (it's a server action, not gated by
    // any UI), so admin/superadmin can only be created by an already
    // authenticated superadmin - never trust the client for privileged roles.
    if (role === "admin" || role === "superadmin") {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== "superadmin") {
        return { success: false, message: "Not authorized to create this account type" }
      }
    }

    // Create base user data
    const userData = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: await hashPassword(formData.get("password") as string),
      phone: formData.get("phone"),
      role,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Add role-specific data
    if (role === "doctor") {
      // Vet accounts require Extension Officer verification (license check)
      // before they can log in - see loginUser's status check below.
      userData.status = "pending_verification"
      Object.assign(userData, {
        licenseNumber: formData.get("licenseNumber"),
        specialization: formData.get("specialization"),
        district: formData.get("district"),
        sector: formData.get("sector"),
        availability: {
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          hours: {
            start: "08:00",
            end: "17:00",
          },
        },
        consultations: [],
      })
    } else if (role === "farmer") {
      Object.assign(userData, {
        district: formData.get("district"),
        sector: formData.get("sector"),
        animals: [],
      })
    } else if (role === "superadmin") {
      Object.assign(userData, {
        permissions: ["manage_users", "view_consultations", "manage_system"],
        lastLoginAt: null,
      })
    }

    // Check if email already exists
    const existingUser = await db.collection("users").findOne({ email: userData.email })
    if (existingUser) {
      return { success: false, message: "Email already in use" }
    }

    // Insert user into database. The findOne check above is only a fast
    // path - the unique index is what actually prevents two concurrent
    // registrations with the same email from both succeeding.
    let result
    try {
      result = await db.collection("users").insertOne(userData)
    } catch (insertError) {
      if (insertError instanceof Error && "code" in insertError && (insertError as { code?: number }).code === 11000) {
        return { success: false, message: "Email already in use" }
      }
      throw insertError
    }

    // Send welcome email after successful registration
    try {
      const emailResult = await sendWelcomeEmail(
        userData.email as string,
        userData.name as string,
        userData.role
      )
      
      if (emailResult.success) {
        console.log(`Welcome email sent successfully to ${userData.email}`)
      } else {
        console.error(`Failed to send welcome email: ${emailResult.error}`)
        // Note: We don't fail the registration if email fails
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError)
      // Continue with successful registration even if email fails
    }

    return {
      success: true,
      message: role === "doctor"
        ? "Application submitted! Your veterinarian account is pending verification by an Extension Officer - we'll notify you by email once it's approved."
        : "User registered successfully! Welcome email sent to your inbox.",
      userId: result.insertedId.toString(),
    }
  } catch (error) {
    console.error("Error registering user:", error)
    await logSystemError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: "auth.register",
    })
    if (error instanceof Error) {
      return { success: false, message: `Registration failed: ${error.message}` }
    }
    return { success: false, message: "Failed to register user" }
  }
}

// Login user
export async function loginUser(formData: FormData) {
  try {
    // IP/session-keyed budget - catches one attacker spraying guesses across
    // many different email addresses, which the per-email check below can't.
    const rateLimitKey = getRequestRateLimitKey(cookies().get("session")?.value)
    const { success: withinLimit } = await checkRateLimit(rateLimitKey, "sensitive")
    if (!withinLimit) {
      return { success: false, message: "Too many attempts. Please try again in a minute." }
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    await ensureLoginAttemptsIndex(db)

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Per-email lockout - catches repeated password guesses against one
    // account, even if the attacker rotates IPs to dodge the check above.
    const recentFailures = await db.collection("login_attempts").countDocuments({
      email,
      success: false,
      createdAt: { $gt: new Date(Date.now() - LOGIN_LOCKOUT_WINDOW_MS) },
    })
    if (recentFailures >= LOGIN_LOCKOUT_THRESHOLD) {
      return { success: false, message: "Too many failed login attempts. Please try again in 15 minutes." }
    }

    const user = await db.collection("users").findOne({ email })

    if (!user || !(await verifyPassword(password, user.password))) {
      await db.collection("login_attempts").insertOne({
        email,
        success: false,
        reason: "invalid_credentials",
        createdAt: new Date(),
      })
      return { success: false, message: "Invalid email or password" }
    }

    // Transparently upgrade legacy plain-text passwords to a bcrypt hash on successful login
    if (!isHashedPassword(user.password)) {
      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { password: await hashPassword(password) } }
      )
    }

    // Check if user account is suspended or inactive
    if (user.status === "suspended") {
      await db.collection("login_attempts").insertOne({
        email, success: false, reason: "account_suspended", createdAt: new Date(),
      })
      return { success: false, message: "Your account has been suspended. Please contact the administrator for assistance." }
    }

    if (user.status === "inactive") {
      await db.collection("login_attempts").insertOne({
        email, success: false, reason: "account_inactive", createdAt: new Date(),
      })
      return { success: false, message: "Your account is inactive. Please contact the administrator for assistance." }
    }

    if (user.status === "pending_verification") {
      await db.collection("login_attempts").insertOne({
        email, success: false, reason: "pending_verification", createdAt: new Date(),
      })
      return { success: false, message: "Your veterinarian account is pending verification by an Extension Officer. You'll be notified once it's approved." }
    }

    if (user.status === "rejected") {
      await db.collection("login_attempts").insertOne({
        email, success: false, reason: "application_rejected", createdAt: new Date(),
      })
      return { success: false, message: "Your veterinarian account application was not approved. Please contact the administrator for details." }
    }

    // Set a session cookie
    const sessionId = crypto.randomUUID()
    const cookieStore = cookies()
    cookieStore.set("session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })

    // Update last login time
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    )

    // Store session in database
    await db.collection("sessions").insertOne({
      sessionId,
      userId: user._id,
      role: user.role, // Store role for quick access
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 1 week
    })

    // Append-only login event log, used for daily-active-user trend reporting
    await db.collection("login_events").insertOne({
      userId: user._id,
      role: user.role,
      createdAt: new Date(),
    })

    await logActivity(user._id, "auth.login", `Logged in as ${user.role}`)

    // Mark the user online immediately so presence checks don't have to wait
    // for their first heartbeat ping to land.
    await db.collection("presence").updateOne(
      { _id: user._id },
      { $set: { lastActiveAt: new Date(), lastActiveRole: user.role, isOnline: true } },
      { upsert: true }
    )

    // Return success with redirect path instead of using redirect directly
    return {
      success: true,
      message: "Login successful",
      redirectPath: user.role === "doctor" ? "/veterinary" : 
                   user.role === "farmer" ? "/farmer" : 
                   user.role === "superadmin" ? "/superadmin" : 
                   user.role === "admin" ? "/admin" : "/"
    }
  } catch (error) {
    console.error("Error logging in:", error)
    await logSystemError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: "auth.login",
    })
    if (error instanceof Error) {
      return { success: false, message: `Login failed: ${error.message}` }
    }
    return { success: false, message: "Failed to log in" }
  }
}

// Logout user
export async function logoutUser() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    
    // Get the session ID from cookies
    const cookieStore = cookies()
    const sessionId = cookieStore.get("session")?.value

    if (sessionId) {
      // Look up the session before deleting it so we know who to mark offline -
      // covers manual logout, idle auto-logout, and the shared /api/logout route.
      const session = await db.collection("sessions").findOne({ sessionId })

      // Delete the session from database
      await db.collection("sessions").deleteOne({ sessionId })

      if (session?.userId) {
        await db.collection("presence").updateOne(
          { _id: session.userId },
          { $set: { isOnline: false } },
          { upsert: true }
        ).catch((err) => console.error("Error marking presence offline on logout:", err))

        await logActivity(session.userId, "auth.logout", `Logged out as ${session.role || "user"}`)
      }
    }

    // Delete the session cookie
    cookieStore.delete("session")
    
    return { success: true }
  } catch (error) {
    console.error("Error during logout:", error)
    await logSystemError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: "auth.logout",
    })
    // Even if there's an error, try to clear the cookie
    const cookieStore = cookies()
    cookieStore.delete("session")
    return { success: false, error: "Failed to logout" }
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const cookieStore = cookies()
    const sessionId = cookieStore.get("session")?.value
    if (!sessionId) {
      return null
    }

    // Retried so a transient read failure isn't mistaken for a missing session.
    // getCurrentUser is a read - it must never mutate the session cookie. This
    // function is also invoked during page render (e.g. requireSuperAdmin ->
    // getAllUsers), where cookies().delete() throws "Cookies can only be
    // modified in a Server Action or Route Handler"; deleting here also risked
    // signing out a perfectly valid session on a spurious miss. Cookie cleanup
    // belongs in logoutUser, not here - matching lib/auth.getCurrentUser.
    const session = await withDbRetry(() =>
      db.collection("sessions").findOne({
        sessionId,
        expiresAt: { $gt: new Date() },
      })
    )

    if (!session) {
      return null
    }

    const user = await withDbRetry(() =>
      db.collection("users").findOne({ _id: session.userId })
    )
    if (!user) {
      return null
    }

    // Don't return the password
    const { password, ...userWithoutPassword } = user
    // Attach role for easy access
    userWithoutPassword.role = session.role || user.role
    return userWithoutPassword
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

const handleLogout = async () => {
  try {
    await logoutUser();
    // Do NOT do anything else here. The server will redirect.
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      return;
    }
    // Optionally handle logout errors
  }
};