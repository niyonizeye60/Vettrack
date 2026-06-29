"use server"
import clientPromise from "../db"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { sendWelcomeEmail } from "../email" // Import the email function
import { hashPassword, verifyPassword, isHashedPassword } from "../password"

// Register a new user
export async function registerUser(formData: FormData) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const role = formData.get("role") as "farmer" | "doctor" | "admin" | "superadmin"

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
      Object.assign(userData, {
        licenseNumber: formData.get("licenseNumber"),
        specialization: formData.get("specialization"),
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

    // Insert user into database
    const result = await db.collection("users").insertOne(userData)

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
      message: "User registered successfully! Welcome email sent to your inbox.",
      userId: result.insertedId.toString(),
    }
  } catch (error) {
    console.error("Error registering user:", error)
    if (error instanceof Error) {
      return { success: false, message: `Registration failed: ${error.message}` }
    }
    return { success: false, message: "Failed to register user" }
  }
}

// Login user
export async function loginUser(formData: FormData) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const user = await db.collection("users").findOne({ email })

    if (!user || !(await verifyPassword(password, user.password))) {
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
      return { success: false, message: "Your account has been suspended. Please contact the administrator for assistance." }
    }

    if (user.status === "inactive") {
      return { success: false, message: "Your account is inactive. Please contact the administrator for assistance." }
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
      // Delete the session from database
      await db.collection("sessions").deleteOne({ sessionId })
    }

    // Delete the session cookie
    cookieStore.delete("session")
    
    return { success: true }
  } catch (error) {
    console.error("Error during logout:", error)
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

    const session = await db.collection("sessions").findOne({
      sessionId,
      expiresAt: { $gt: new Date() },
    })

    if (!session) {
      cookieStore.delete("session")
      return null
    }

    const user = await db.collection("users").findOne({ _id: session.userId })
    if (!user) {
      cookieStore.delete("session")
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