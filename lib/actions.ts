"use server"

import { revalidatePath } from "next/cache"
import clientPromise from "./db"
import { getCurrentUser } from "./auth"
import { ObjectId } from "mongodb"

// Animal-related actions
export async function registerAnimal(formData: FormData, ownerId: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Get user info for the owner
    const owner = await db.collection("users").findOne({ _id: new ObjectId(ownerId) })
    const ownerName = owner ? owner.name : formData.get("ownerName")

    const animal = {
      name: formData.get("name"),
      type: formData.get("type"),
      breed: formData.get("breed"),
      district: formData.get("district"),
      sector: formData.get("sector"),
      class: formData.get("class"),
      ownerName: ownerName, // Use user's name from DB if available
      phoneNumber: formData.get("phoneNumber"),
      price: Number(formData.get("price")),
      createdAt: new Date(),
      ownerId, // Associate this animal with its owner
      status: "Healthy", // Default status
      owner: { // Also store as embedded document for compatibility
        _id: ownerId,
        name: ownerName
      }
    }

    const result = await db.collection("animals").insertOne(animal)

    // Update the user's animals array
    await db.collection("users").updateOne(
      { _id: new ObjectId(ownerId) },
      { $push: { animals: result.insertedId } } as any
    )

    // Revalidate the animals page
    revalidatePath("/farmer/animals")

    return { success: true, id: result.insertedId }
  } catch (error) {
    console.error("Error registering animal:", error)
    return { success: false, error: "Failed to register animal" }
  }
}

export async function updateAnimal(id: string, formData: FormData) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Get the original animal to preserve owner information
    const originalAnimal = await db.collection("animals").findOne({
      _id: new ObjectId(id)
    })

    if (!originalAnimal) {
      return { success: false, error: "Animal not found" }
    }

    // Get ownerId from formData or use the original
    const ownerId = formData.get("ownerId") || originalAnimal.ownerId ||
      (originalAnimal.owner && originalAnimal.owner._id) || null

    // If we have an ownerId, get the owner info
    let ownerInfo = null
    if (ownerId) {
      try {
        const owner = await db.collection("users").findOne({ _id: new ObjectId(ownerId.toString()) })
        if (owner) {
          ownerInfo = {
            _id: owner._id,
            name: owner.name
          }
        }
      } catch (e) {
        console.error("Error fetching owner info:", e)
      }
    }

    const animal = {
      name: formData.get("name"),
      type: formData.get("type"),
      breed: formData.get("breed"),
      district: formData.get("district"),
      sector: formData.get("sector"),
      class: formData.get("class"),
      ownerName: formData.get("ownerName"),
      phoneNumber: formData.get("phoneNumber"),
      price: Number(formData.get("price")),
      status: formData.get("status") || originalAnimal.status || "Healthy",
      updatedAt: new Date(),
      ownerId: ownerId,
      // Preserve owner document format if it exists
      owner: ownerInfo || originalAnimal.owner || {
        _id: ownerId,
        name: formData.get("ownerName")
      }
    }

    const result = await db.collection("animals").updateOne(
      { _id: new ObjectId(id) },
      { $set: animal }
    )

    // Revalidate paths for both farmer and admin views
    revalidatePath("/farmer/animals")
    revalidatePath("/dashboard/animals")

    return { success: true, modifiedCount: result.modifiedCount }
  } catch (error) {
    console.error("Error updating animal:", error)
    return { success: false, error: "Failed to update animal" }
  }
}

export async function deleteAnimal(id: string, ownerId?: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // If ownerId is provided, verify ownership
    if (ownerId) {
      const animal = await db.collection("animals").findOne({
        _id: new ObjectId(id),
        $or: [
          { ownerId },
          { 'owner._id': ownerId },
          { 'owner': ownerId }
        ]
      })

      if (!animal) {
        return { success: false, error: "Animal not found or you don't have permission to delete it" }
      }
    }

    // Remove animal from the database
    const result = await db.collection("animals").deleteOne({
      _id: new ObjectId(id),
    })

    // If ownerId is provided, also update the user's animals array
    if (ownerId) {
      await db.collection("users").updateOne(
        { _id: new ObjectId(ownerId) },
        { $pull: { animals: new ObjectId(id) } } as any
      )
    }

    // Revalidate paths for both farmer and admin views
    revalidatePath("/farmer/animals")
    revalidatePath("/dashboard/animals")

    return { success: true, deletedCount: result.deletedCount }
  } catch (error) {
    console.error("Error deleting animal:", error)
    return { success: false, error: "Failed to delete animal" }
  }
}

// Consultation-related actions
export async function bookConsultation(formData: FormData, farmerId: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const consultation = {
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      service: formData.get("service"),
      doctor: formData.get("doctor"),
      date: formData.get("date"),
      time: formData.get("time"),
      type: formData.get("type"),
      status: "pending", // Using lowercase to be consistent
      createdAt: new Date(),
      farmerId // Associate this consultation with the farmer who created it
    }

    await db.collection("consultations").insertOne(consultation)
    revalidatePath("/dashboard/consultations")
    revalidatePath("/farmer/consultations") // Also revalidate the farmer path
    return { success: true }
  } catch (error) {
    console.error("Error booking consultation:", error)
    return { success: false }
  }
}

export async function updateConsultationStatus(id: string, status: string, feedback?: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Safely convert string ID to ObjectId
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      console.error("Invalid ObjectId format:", id);
      return { success: false, error: "Invalid consultation ID format" };
    }

    // Create the update data with proper typing
    const updateData: {
      status: string;
      updatedAt: Date;
      feedback?: string;
    } = {
      status,
      updatedAt: new Date()
    };

    // Only add feedback if it's defined and not empty
    if (feedback !== undefined && feedback !== '') {
      updateData.feedback = feedback;
    }

    const result = await db.collection("consultations").updateOne(
      { _id: objectId },
      { $set: updateData }
    );

    // Revalidate paths
    revalidatePath("/veterinary/consultations");
    revalidatePath("/dashboard/veterinary/consultations");
    revalidatePath("/farmer/consultations");

    return { success: true, modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error("Error updating consultation status:", error);
    return { success: false, error: "Failed to update consultation status" };
  }
}

// Message-related actions
export async function sendMessage(formData: FormData) {
  try {
    const client = await clientPromise
    const db = client.db()

    const message = {
      sender: formData.get("sender"),
      recipient: formData.get("recipient"),
      content: formData.get("content"),
      read: false,
      createdAt: new Date(),
    }

    await db.collection("messages").insertOne(message)
    revalidatePath("/dashboard/messages")
    return { success: true, message: "Message sent successfully" }
  } catch (error) {
    console.error("Error sending message:", error)
    return { success: false, message: "Failed to send message" }
  }
}

// Contact form action
export async function submitContactForm(formData: FormData) {
  try {
    const client = await clientPromise
    const db = client.db()

    const contact = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: formData.get("message"),
      createdAt: new Date(),
    }

    await db.collection("contacts").insertOne(contact)
    return { success: true, message: "Message sent successfully" }
  } catch (error) {
    console.error("Error submitting contact form:", error)
    return { success: false, message: "Failed to send message" }
  }
}

export async function getAnimals(ownerId?: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Build query to handle both new and old animals (with different ownerId field names)
    let query = {};

    if (ownerId) {
      // Handle both new and legacy ways animals might be associated with owners
      query = {
        $or: [
          { ownerId },  // New way with explicit ownerId
          { 'owner._id': ownerId }, // Potential legacy way with embedded owner document
          { 'owner': ownerId }  // Potential legacy way with direct reference
        ]
      };
    }

    console.log("Fetching animals with query:", query);

    const animals = await db.collection("animals").find(query).toArray()

    console.log(`Found ${animals.length} animals`);

    return animals.map(animal => ({
      _id: animal._id.toString(),
      name: animal.name,
      type: animal.type,
      breed: animal.breed,
      district: animal.district,
      sector: animal.sector,
      class: animal.class,
      ownerName: animal.ownerName,
      phoneNumber: animal.phoneNumber,
      price: animal.price,
      ownerId: animal.ownerId || null,
      status: animal.status || "Healthy",
      createdAt: animal.createdAt.toISOString()
    }))
  } catch (error) {
    console.error("Error fetching animals:", error)
    return []
  }
}

export async function getConsultations(doctorId?: string, farmerId?: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Build query based on user role
    let query = {}

    if (doctorId) {
      // Handle both string and ObjectId references for doctor
      query = { 
        $or: [
          { doctor: doctorId },
          { doctor: new ObjectId(doctorId) }
        ]
      }
    } else if (farmerId) {
      query = { farmerId }
    }

    console.log("Fetching consultations with query:", query)

    const consultations = await db.collection("consultations").find(query).toArray()

    console.log(`Found ${consultations.length} consultations`)

    // Get all unique doctor IDs from consultations - with validation
    const doctorIds = [...new Set(consultations.map((c) => c.doctor).filter(id => id && ObjectId.isValid(id)))]

    // Fetch doctor information for all doctor IDs
    const doctors = doctorIds.length > 0 ? await db
      .collection("users")
      .find({
        _id: { $in: doctorIds.map((id) => new ObjectId(id)) },
        role: "doctor",
      })
      .toArray() : []

    // Create a map of doctor ID to doctor name for quick lookup
    const doctorMap = new Map()
    doctors.forEach((doctor) => {
      doctorMap.set(doctor._id.toString(), doctor.name)
    })

    return consultations.map((c) => ({
      _id: c._id.toString(),
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      service: c.service,
      date: c.date,
      time: c.time,
      type: c.type,
      status: c.status.toLowerCase(),
      createdAt: c.createdAt.toISOString(),
      doctor: doctorMap.get(c.doctor) || c.doctor || "Unassigned",
      farmerId: c.farmerId || null,
      feedback: c.feedback || null,
    }))
  } catch (error) {
    console.error("Error fetching consultations:", error)
    return []
  }
}

export async function getDoctorsList() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const doctors = await db.collection("users").find({ role: "doctor" }).toArray()
    return doctors.map(d => ({
      _id: d._id.toString(),
      name: d.name,
      email: d.email,
      specialization: d.specialization || "",
      phone: d.phone || "",
    }))
  } catch (error) {
    console.error("Error fetching doctors:", error)
    return []
  }
}

export async function getConsultationById(id: string, farmerId?: string) {
  try {
    const client = await clientPromise;
    const db = client.db("ntdm_animal_hospital");

    // Build query to get consultation by ID
    const query: { _id: ObjectId; farmerId?: string } = {
      _id: new ObjectId(id)
    };

    // If farmerId is provided, make sure the consultation belongs to this farmer
    if (farmerId) {
      query.farmerId = farmerId;
    }

    const consultation = await db.collection("consultations").findOne(query);

    if (!consultation) {
      return null;
    }

    return {
      _id: consultation._id.toString(),
      fullName: consultation.fullName,
      phoneNumber: consultation.phoneNumber,
      service: consultation.service,
      date: consultation.date,
      time: consultation.time,
      type: consultation.type,
      status: consultation.status.toLowerCase(),
      createdAt: consultation.createdAt.toISOString(),
      doctor: consultation.doctor,
      farmerId: consultation.farmerId || null,
      feedback: consultation.feedback || null
    };
  } catch (error) {
    console.error("Error fetching consultation:", error);
    return null;
  }
}

export async function updateConsultation(id: string, formData: FormData, farmerId?: string) {
  try {
    const client = await clientPromise;
    const db = client.db("ntdm_animal_hospital");

    // If farmerId is provided, verify ownership
    if (farmerId) {
      const consultation = await db.collection("consultations").findOne({
        _id: new ObjectId(id),
        farmerId
      });

      if (!consultation) {
        return { success: false, error: "Consultation not found or you don't have permission to edit it" };
      }
    }

    const consultation = {
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      service: formData.get("service"),
      doctor: formData.get("doctor"),
      date: formData.get("date"),
      time: formData.get("time"),
      type: formData.get("type"),
      updatedAt: new Date()
    };

    const result = await db.collection("consultations").updateOne(
      { _id: new ObjectId(id) },
      { $set: consultation }
    );

    // Revalidate paths
    revalidatePath("/farmer/consultations");
    revalidatePath(`/farmer/consultations/${id}`);

    return { success: true, modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error("Error updating consultation:", error);
    return { success: false, error: "Failed to update consultation" };
  }
}

export async function deleteConsultation(id: string, farmerId?: string) {
  try {
    const client = await clientPromise;
    const db = client.db("ntdm_animal_hospital");

    // If farmerId is provided, verify ownership
    if (farmerId) {
      const consultation = await db.collection("consultations").findOne({
        _id: new ObjectId(id),
        farmerId
      });

      if (!consultation) {
        return { success: false, error: "Consultation not found or you don't have permission to delete it" };
      }
    }

    const result = await db.collection("consultations").deleteOne({
      _id: new ObjectId(id)
    });

    // Revalidate paths
    revalidatePath("/farmer/consultations");

    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error("Error deleting consultation:", error);
    return { success: false, error: "Failed to delete consultation" };
  }
}
export async function getUserConfig() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const config = await db.collection("userConfigs").findOne({ userId: user._id })
    return { success: true, config }
  } catch (error) {
    console.error("Error fetching user config:", error)
    return { success: false, error: "Failed to fetch user config" }
  }
}

export async function saveUserConfig(deviceId: string, apiKey: string, results: number) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const updated = await db.collection("userConfigs").findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          deviceId,
          apiKey,
          results,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: "after" }
    );

    if (!updated || !updated.value) {
      return { success: false, error: "Failed to save user config" };
    }

    return { success: true, config: updated.value };

  } catch (error) {
    console.error("Error saving user config:", error)
    return { success: false, error: "Failed to save user config" }
  }
}
export async function forceLogoutUser(userId: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    
    // Convert userId string to ObjectId for MongoDB query
    const userObjectId = new ObjectId(userId)
    
    // Delete all sessions for this specific user
    const deleteResult = await db.collection("sessions").deleteMany({
      userId: userObjectId
    })
    
    // Update user's online status to false
    await db.collection("users").updateOne(
      { _id: userObjectId },
      { 
        $set: { 
          isOnline: false,
          lastLogoutAt: new Date()
        }
      }
    )
    
    console.log(`Force logged out user ${userId}, deleted ${deleteResult.deletedCount} sessions`)
    
    return { 
      success: true, 
      message: `User logged out successfully. ${deleteResult.deletedCount} session(s) terminated.`
    }
  } catch (error) {
    console.error("Failed to force logout user:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}