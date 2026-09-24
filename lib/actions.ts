"use server"

import { revalidatePath } from "next/cache"
import clientPromise from "./db"
import { getCurrentUser } from "./auth"
import { ObjectId } from "mongodb"
import { sendConsultationRequestEmail } from "./email"
import { logActivity, logSystemError } from "./activity-log"
import { deleteDocumentsForConsultation, getDocumentsByConsultation } from "./consultation-documents"

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
      weight: formData.get("weight") ? Number(formData.get("weight")) : null,
      acquisitionType: formData.get("acquisitionType"),
      earTagId: formData.get("earTagId") || null,
      insuranceId: formData.get("insuranceId") || null,
      gender: formData.get("gender") || null,
      lactationStatus: formData.get("type") === "cow" && formData.get("gender") === "female" ? "dry" : null,
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

    const actor = await getCurrentUser()
    if (actor) await logActivity(actor._id, "livestock.animal_registered", `Registered animal "${animal.name}"`)

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
      weight: formData.get("weight") ? Number(formData.get("weight")) : (originalAnimal.weight ?? null),
      acquisitionType: formData.get("acquisitionType") || originalAnimal.acquisitionType || null,
      earTagId: formData.get("earTagId") || originalAnimal.earTagId || null,
      insuranceId: formData.get("insuranceId") || originalAnimal.insuranceId || null,
      gender: formData.get("gender") || originalAnimal.gender || null,
      lactationStatus: formData.get("type") === "cow" && (formData.get("gender") || originalAnimal.gender) === "female"
        ? (originalAnimal.lactationStatus || "dry")
        : null,
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

    const actor = await getCurrentUser()
    if (actor) await logActivity(actor._id, "livestock.animal_updated", `Updated animal "${animal.name}"`)

    return { success: true, modifiedCount: result.modifiedCount }
  } catch (error) {
    console.error("Error updating animal:", error)
    return { success: false, error: "Failed to update animal" }
  }
}

export async function updateAnimalLactationStatus(id: string, status: "lactating" | "dry", ownerId?: string) {
  try {
    if (status !== "lactating" && status !== "dry") {
      return { success: false, error: "Invalid lactation status" }
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const query: Record<string, any> = { _id: new ObjectId(id) }
    if (ownerId) {
      query.$or = [
        { ownerId },
        { 'owner._id': ownerId },
        { 'owner': ownerId }
      ]
    }

    const animal = await db.collection("animals").findOne(query)
    if (!animal) {
      return { success: false, error: "Animal not found or you don't have permission to edit it" }
    }
    if (animal.type !== "cow" || animal.gender !== "female") {
      return { success: false, error: "Only female cows have a lactation status" }
    }

    await db.collection("animals").updateOne(
      { _id: new ObjectId(id) },
      { $set: { lactationStatus: status, updatedAt: new Date() } }
    )

    revalidatePath("/farmer/animals")
    revalidatePath("/dashboard/animals")

    const actor = await getCurrentUser()
    if (actor) await logActivity(actor._id, "livestock.animal_updated", `Marked "${animal.name}" as ${status}`)

    return { success: true }
  } catch (error) {
    console.error("Error updating lactation status:", error)
    return { success: false, error: "Failed to update lactation status" }
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

    const animalToDelete = await db.collection("animals").findOne({ _id: new ObjectId(id) })

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

    const actor = await getCurrentUser()
    if (actor) await logActivity(actor._id, "livestock.animal_deleted", `Deleted animal "${animalToDelete?.name || id}"`)

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

    const animalId    = formData.get("animalId")   as string | null
    const animalName  = formData.get("animalName")  as string | null
    const animalType  = formData.get("animalType")  as string | null
    const animalBreed = formData.get("animalBreed") as string | null

    const consultation: Record<string, any> = {
      fullName:    formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      service:     formData.get("service"),
      doctor:      formData.get("doctor"),
      date:        formData.get("date"),
      time:        formData.get("time"),
      type:        formData.get("type"),
      status:      "pending",
      createdAt:   new Date(),
      farmerId,
    }

    if (animalId)    consultation.animalId    = animalId
    if (animalName)  consultation.animalName  = animalName
    if (animalType)  consultation.animalType  = animalType
    if (animalBreed) consultation.animalBreed = animalBreed

    await db.collection("consultations").insertOne(consultation)
    revalidatePath("/dashboard/consultations")
    revalidatePath("/farmer/consultations") // Also revalidate the farmer path

    // Notify the selected vet by email. Wrapped separately so a failed email
    // never fails the booking itself.
    try {
      const doctorId = consultation.doctor as string | null
      if (doctorId && ObjectId.isValid(doctorId)) {
        // In-app notification so the vet's bell reflects the new request.
        await db.collection("notifications").insertOne({
          title: "New consultation request",
          message: `${consultation.fullName} requested a consultation${consultation.animalName ? ` for ${consultation.animalName}` : ""}.`,
          type: "consultation",
          priority: "normal",
          read: false,
          deletedBy: [],
          userId: new ObjectId(doctorId),
          actionUrl: "/veterinary/consultations",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        }).catch((err) => console.error("Error inserting consultation notification:", err))

        const doctor = await db.collection("users").findOne({ _id: new ObjectId(doctorId) })
        if (doctor?.email) {
          await sendConsultationRequestEmail(doctor.email, doctor.name, {
            fullName:    consultation.fullName,
            phoneNumber: consultation.phoneNumber,
            service:     consultation.service,
            type:        consultation.type,
            date:        consultation.date,
            time:        consultation.time,
            animalName:  consultation.animalName,
            animalType:  consultation.animalType,
            animalBreed: consultation.animalBreed,
          })
        }
      }
    } catch (emailError) {
      console.error("Error sending consultation request email:", emailError)
    }

    const actor = await getCurrentUser()
    if (actor) await logActivity(actor._id, "consultation.booked", `Booked a ${consultation.service || "consultation"}${consultation.animalName ? ` for ${consultation.animalName}` : ""}`)

    return { success: true }
  } catch (error) {
    console.error("Error booking consultation:", error)
    await logSystemError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: "consultation.booked",
    })
    return { success: false }
  }
}

// Vet-initiated appointment — created directly by the doctor (e.g. from the
// calendar), so it starts "accepted" instead of going through the farmer's
// pending-request flow.
export async function createAppointment(formData: FormData) {
  try {
    const actor = await getCurrentUser()
    if (!actor || actor.role !== "doctor") {
      return { success: false, error: "Unauthorized" }
    }

    const farmerId = formData.get("farmerId") as string | null
    if (!farmerId) {
      return { success: false, error: "Patient is required" }
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const animalId    = formData.get("animalId")   as string | null
    const animalName  = formData.get("animalName")  as string | null
    const animalType  = formData.get("animalType")  as string | null
    const animalBreed = formData.get("animalBreed") as string | null

    const consultation: Record<string, any> = {
      fullName:    formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      service:     formData.get("service"),
      doctor:      actor._id,
      date:        formData.get("date"),
      time:        formData.get("time"),
      type:        formData.get("type"),
      status:      "accepted",
      createdAt:   new Date(),
      farmerId,
    }

    if (animalId)    consultation.animalId    = animalId
    if (animalName)  consultation.animalName  = animalName
    if (animalType)  consultation.animalType  = animalType
    if (animalBreed) consultation.animalBreed = animalBreed

    await db.collection("consultations").insertOne(consultation)

    revalidatePath("/veterinary/calendar")
    revalidatePath("/veterinary/appointments")
    revalidatePath("/veterinary")
    revalidatePath("/farmer/consultations")

    // Let the farmer know their vet scheduled this for them.
    try {
      if (ObjectId.isValid(farmerId)) {
        await db.collection("notifications").insertOne({
          title: "Appointment scheduled",
          message: `Your vet scheduled ${consultation.animalName ? `a visit for ${consultation.animalName}` : "an appointment"} on ${consultation.date} at ${consultation.time}.`,
          type: "consultation",
          priority: "normal",
          read: false,
          deletedBy: [],
          userId: new ObjectId(farmerId),
          actionUrl: "/farmer/consultations",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        })
      }
    } catch (notifyError) {
      console.error("Error notifying farmer of new appointment:", notifyError)
    }

    await logActivity(actor._id, "consultation.created", `Scheduled ${consultation.animalName ? `a visit for ${consultation.animalName}` : "an appointment"} on ${consultation.date}`)

    return { success: true }
  } catch (error) {
    console.error("Error creating appointment:", error)
    await logSystemError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: "consultation.created",
    })
    return { success: false, error: "Failed to create appointment" }
  }
}

export async function updateConsultationStatus(
  id: string,
  status: string,
  feedback?: string,
  clinicalNotes?: {
    diagnosis?: string
    symptomsObserved?: string
    treatmentGiven?: string
    medicationDosage?: string
    followUpNeeded?: boolean
    followUpDate?: string
  }
) {
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
      diagnosis?: string;
      symptomsObserved?: string;
      treatmentGiven?: string;
      medicationDosage?: string;
      followUpNeeded?: boolean;
      followUpDate?: string;
    } = {
      status,
      updatedAt: new Date()
    };

    // Only add feedback if it's defined and not empty
    if (feedback !== undefined && feedback !== '') {
      updateData.feedback = feedback;
    }

    // Structured clinical fields — only set what the vet actually filled in.
    if (clinicalNotes) {
      if (clinicalNotes.diagnosis) updateData.diagnosis = clinicalNotes.diagnosis
      if (clinicalNotes.symptomsObserved) updateData.symptomsObserved = clinicalNotes.symptomsObserved
      if (clinicalNotes.treatmentGiven) updateData.treatmentGiven = clinicalNotes.treatmentGiven
      if (clinicalNotes.medicationDosage) updateData.medicationDosage = clinicalNotes.medicationDosage
      if (clinicalNotes.followUpNeeded) {
        updateData.followUpNeeded = true
        if (clinicalNotes.followUpDate) updateData.followUpDate = clinicalNotes.followUpDate
      } else if (clinicalNotes.followUpNeeded === false) {
        updateData.followUpNeeded = false
      }
    }

    const result = await db.collection("consultations").updateOne(
      { _id: objectId },
      { $set: updateData }
    );

    // Notify the farmer in-app that the vet responded. The vet already sees the
    // change live; the farmer otherwise has no signal, so this closes the loop.
    try {
      const consultation = await db.collection("consultations").findOne({ _id: objectId });
      const farmerId = consultation?.farmerId as string | undefined;
      if (farmerId && ObjectId.isValid(farmerId)) {
        const animalSuffix = consultation?.animalName ? ` for ${consultation.animalName}` : "";
        await db.collection("notifications").insertOne({
          title: `Consultation ${status}`,
          message: `Your consultation${animalSuffix} was marked ${status}${feedback ? ": " + feedback.slice(0, 80) : "."}`,
          type: "consultation",
          priority: "normal",
          read: false,
          deletedBy: [],
          userId: new ObjectId(farmerId),
          actionUrl: `/farmer/consultations/${id}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        });
      }
    } catch (notifyError) {
      console.error("Error notifying farmer of consultation update:", notifyError);
    }

    // Revalidate paths
    revalidatePath("/veterinary/consultations");
    revalidatePath("/dashboard/veterinary/consultations");
    revalidatePath("/farmer/consultations");

    const actor = await getCurrentUser()
    if (actor) await logActivity(actor._id, "consultation.status_updated", `Marked a consultation as ${status}`)

    return { success: true, modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error("Error updating consultation status:", error);
    await logSystemError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: "consultation.status_updated",
    })
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function mapAnimalDoc(animal: any) {
  return {
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
    weight: animal.weight ?? null,
    acquisitionType: animal.acquisitionType || null,
    earTagId: animal.earTagId || null,
    insuranceId: animal.insuranceId || null,
    gender: animal.gender || null,
    lactationStatus: animal.type === "cow" && animal.gender === "female" ? (animal.lactationStatus || "dry") : null,
    ownerId: animal.ownerId || null,
    status: animal.status || "Healthy",
    createdAt: animal.createdAt.toISOString()
  }
}

// Overloaded so passing `page` narrows the return type to the paginated shape, while every
// existing caller (which never passes `page`) keeps getting back a plain array.
export async function getAnimals(ownerId?: string): Promise<any[]>
export async function getAnimals(
  ownerId: string | undefined,
  options: { page: number; limit?: number; search?: string; tab?: "all" | "lactating" | "dry" }
): Promise<{
  animals: any[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
  counts: { all: number; lactating: number; dry: number }
}>
export async function getAnimals(
  ownerId?: string,
  options?: { page?: number; limit?: number; search?: string; tab?: "all" | "lactating" | "dry" }
): Promise<any> {
  const paginate = options?.page != null
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Build query to handle both new and old animals (with different ownerId field names)
    let baseQuery = {};

    if (ownerId) {
      // Handle both new and legacy ways animals might be associated with owners
      baseQuery = {
        $or: [
          { ownerId },  // New way with explicit ownerId
          { 'owner._id': ownerId }, // Potential legacy way with embedded owner document
          { 'owner': ownerId }  // Potential legacy way with direct reference
        ]
      };
    }

    console.log("Fetching animals with query:", baseQuery);

    if (!paginate) {
      const animals = await db.collection("animals").find(baseQuery).toArray()
      console.log(`Found ${animals.length} animals`);
      return animals.map(mapAnimalDoc)
    }

    const page = Math.max(1, options!.page!)
    const limit = Math.max(1, options?.limit || 10)

    const lactatingFilter = { type: "cow", gender: "female", lactationStatus: "lactating" }
    const dryFilter = { type: "cow", gender: "female", lactationStatus: { $ne: "lactating" } }
    const tabFilter = options?.tab === "lactating" ? lactatingFilter : options?.tab === "dry" ? dryFilter : null

    const andClauses: any[] = [baseQuery]
    if (tabFilter) andClauses.push(tabFilter)
    if (options?.search?.trim()) {
      const re = new RegExp(escapeRegex(options.search.trim()), "i")
      andClauses.push({ $or: [{ name: re }, { type: re }, { breed: re }, { insuranceId: re }, { earTagId: re }] })
    }
    const finalQuery = andClauses.length > 1 ? { $and: andClauses } : andClauses[0]

    const [total, animals, allCount, lactatingCount, dryCount] = await Promise.all([
      db.collection("animals").countDocuments(finalQuery),
      db.collection("animals").find(finalQuery).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection("animals").countDocuments(baseQuery),
      db.collection("animals").countDocuments({ $and: [baseQuery, lactatingFilter] }),
      db.collection("animals").countDocuments({ $and: [baseQuery, dryFilter] }),
    ])

    console.log(`Found ${animals.length} animals (page ${page} of ${Math.max(1, Math.ceil(total / limit))})`);

    return {
      animals: animals.map(mapAnimalDoc),
      pagination: { page, pageSize: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      counts: { all: allCount, lactating: lactatingCount, dry: dryCount },
    }
  } catch (error) {
    console.error("Error fetching animals:", error)
    if (paginate) {
      return {
        animals: [],
        pagination: { page: options?.page || 1, pageSize: options?.limit || 10, total: 0, totalPages: 1 },
        counts: { all: 0, lactating: 0, dry: 0 },
      }
    }
    return []
  }
}

export async function getAnimalById(id: string) {
  try {
    if (!ObjectId.isValid(id)) return null

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const animal = await db.collection("animals").findOne({ _id: new ObjectId(id) })
    if (!animal) return null

    return {
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
      weight: animal.weight ?? null,
      acquisitionType: animal.acquisitionType || null,
      earTagId: animal.earTagId || null,
      insuranceId: animal.insuranceId || null,
      gender: animal.gender || null,
      lactationStatus: animal.type === "cow" && animal.gender === "female" ? (animal.lactationStatus || "dry") : null,
      ownerId: animal.ownerId || null,
      status: animal.status || "Healthy",
      createdAt: animal.createdAt ? animal.createdAt.toISOString() : null,
    }
  } catch (error) {
    console.error("Error fetching animal by id:", error)
    return null
  }
}

// `withDocuments` is opt-in: only the two consultation screens show attachments, and
// the other callers (dashboards, patient lists, search) shouldn't pay for the extra query.
// Overloaded so passing `page` narrows the return type to the paginated shape, while every
// existing caller (which never passes `page`) keeps getting back a plain array.
export async function getConsultations(
  doctorId?: string,
  farmerId?: string,
  options?: { withDocuments?: boolean }
): Promise<any[]>
export async function getConsultations(
  doctorId: string | undefined,
  farmerId: string | undefined,
  options: {
    withDocuments?: boolean
    page: number
    limit?: number
    status?: string
    animalId?: string
    doctor?: string
    startDate?: string
    endDate?: string
    month?: string
    sortBy?: "date" | "status" | "createdAt"
    sortOrder?: "asc" | "desc"
  }
): Promise<{ consultations: any[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>
export async function getConsultations(
  doctorId?: string,
  farmerId?: string,
  options?: {
    withDocuments?: boolean
    page?: number
    limit?: number
    status?: string
    animalId?: string
    doctor?: string
    startDate?: string
    endDate?: string
    month?: string
    sortBy?: "date" | "status" | "createdAt"
    sortOrder?: "asc" | "desc"
  }
): Promise<any> {
  const paginate = options?.page != null
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Build query based on user role
    let query: any = {}

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

    let total = 0
    let page = 1
    let limit = 10
    let consultations
    if (paginate) {
      page = Math.max(1, options!.page!)
      limit = Math.max(1, options?.limit || 10)

      const andClauses: any[] = [query]
      if (options?.status && options.status !== "all") {
        andClauses.push({ status: { $regex: `^${escapeRegex(options.status)}$`, $options: "i" } })
      }
      if (options?.animalId) {
        andClauses.push({ animalId: options.animalId })
      }
      if (options?.doctor) {
        const doctorOrClauses: any[] = [{ doctor: options.doctor }]
        if (ObjectId.isValid(options.doctor)) doctorOrClauses.push({ doctor: new ObjectId(options.doctor) })
        andClauses.push({ $or: doctorOrClauses })
      }
      if (options?.month) {
        const [year, m] = options.month.split("-")
        const start = new Date(Number(year), Number(m) - 1, 1).toISOString().split("T")[0]
        const end = new Date(Number(year), Number(m), 1).toISOString().split("T")[0]
        andClauses.push({ date: { $gte: start, $lt: end } })
      } else if (options?.startDate || options?.endDate) {
        const dateClause: any = {}
        if (options.startDate) dateClause.$gte = options.startDate
        if (options.endDate) dateClause.$lte = options.endDate
        andClauses.push({ date: dateClause })
      }
      const finalQuery = andClauses.length > 1 ? { $and: andClauses } : andClauses[0]

      const sortField = options?.sortBy === "date" ? "date" : options?.sortBy === "status" ? "status" : "createdAt"
      const sortDir = options?.sortOrder === "asc" ? 1 : -1

      total = await db.collection("consultations").countDocuments(finalQuery)
      consultations = await db.collection("consultations")
        .find(finalQuery)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray()
    } else {
      consultations = await db.collection("consultations").find(query).toArray()
    }

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

    // Vet-facing lists show the farmer's photo; one batched lookup, doctor view only.
    const farmerImageMap = new Map<string, string>()
    if (doctorId) {
      const farmerIds = [...new Set(consultations.map((c) => c.farmerId).filter((id) => id && ObjectId.isValid(id)))]
      if (farmerIds.length > 0) {
        const farmers = await db
          .collection("users")
          .find({ _id: { $in: farmerIds.map((id) => new ObjectId(id)) } }, { projection: { image: 1 } })
          .toArray()
        farmers.forEach((f) => {
          if (f.image) farmerImageMap.set(f._id.toString(), f.image)
        })
      }
    }

    const documentsByConsultation = options?.withDocuments
      ? await getDocumentsByConsultation(db, consultations.map((c) => c._id))
      : null

    const mapped = consultations.map((c) => ({
      _id: c._id.toString(),
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      service: c.service,
      date: c.date,
      time: c.time,
      type: c.type,
      status: c.status.toLowerCase(),
      createdAt: c.createdAt.toISOString(),
      documents: documentsByConsultation?.get(c._id.toString()) ?? [],
      doctor: doctorMap.get(c.doctor) || c.doctor || "Unassigned",
      doctorId: c.doctor ? c.doctor.toString() : null,
      doctorName: doctorMap.get(c.doctor) || null,
      farmerId: c.farmerId || null,
      farmerImage: c.farmerId ? farmerImageMap.get(c.farmerId.toString()) ?? null : null,
      feedback: c.feedback || null,
      animalId: c.animalId || null,
      animalName: c.animalName || null,
      animalType: c.animalType || null,
      animalBreed: c.animalBreed || null,
      diagnosis: c.diagnosis || null,
      symptomsObserved: c.symptomsObserved || null,
      treatmentGiven: c.treatmentGiven || null,
      medicationDosage: c.medicationDosage || null,
      followUpNeeded: c.followUpNeeded || false,
      followUpDate: c.followUpDate || null,
    }))

    if (paginate) {
      return { consultations: mapped, pagination: { page, pageSize: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } }
    }
    return mapped
  } catch (error) {
    console.error("Error fetching consultations:", error)
    if (paginate) {
      return { consultations: [], pagination: { page: options?.page || 1, pageSize: options?.limit || 10, total: 0, totalPages: 1 } }
    }
    return []
  }
}

// Distinct animal/doctor options for the consultations History filters - scoped to
// what actually appears in this farmer's consultations, not every animal or doctor
// that exists (which is what getAnimals()/getDoctorsList() return, used for booking).
export async function getConsultationFilterOptions(farmerId: string): Promise<{
  animals: { _id: string; name: string }[]
  doctors: { _id: string; name: string }[]
}> {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const [animalGroups, doctorIdsRaw] = await Promise.all([
      db.collection("consultations").aggregate([
        { $match: { farmerId, animalId: { $nin: [null, ""] } } },
        { $group: { _id: "$animalId", name: { $first: "$animalName" } } },
      ]).toArray(),
      db.collection("consultations").distinct("doctor", { farmerId, doctor: { $nin: [null, ""] } }),
    ])

    const doctorIds = [...new Set(doctorIdsRaw.map((id: any) => id.toString()))]
    const doctorObjectIds = doctorIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id))
    const doctorDocs = doctorObjectIds.length > 0
      ? await db.collection("users").find({ _id: { $in: doctorObjectIds }, role: "doctor" }).project({ name: 1 }).toArray()
      : []

    return {
      animals: animalGroups
        .map((g: any) => ({ _id: g._id as string, name: (g.name as string) || "Unknown animal" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      doctors: doctorDocs
        .map(d => ({ _id: d._id.toString(), name: d.name as string }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }
  } catch (error) {
    console.error("Error fetching consultation filter options:", error)
    return { animals: [], doctors: [] }
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

    // Normalize the doctor reference: `doctor` is stored as the raw id, but every
    // consumer wants the display name. Resolve it here so this returns the same
    // shape as getConsultations (doctor = name, plus an explicit doctorId).
    const doctorId = consultation.doctor ? consultation.doctor.toString() : null;
    let doctorName: string | null = null;
    if (doctorId && ObjectId.isValid(doctorId)) {
      const doctor = await db.collection("users").findOne(
        { _id: new ObjectId(doctorId), role: "doctor" },
        { projection: { name: 1 } }
      );
      doctorName = doctor?.name ?? null;
    }

    const documents = (await getDocumentsByConsultation(db, [consultation._id])).get(consultation._id.toString()) ?? [];

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
      documents,
      doctor: doctorName || doctorId || "Unassigned",
      doctorId,
      doctorName,
      farmerId: consultation.farmerId || null,
      feedback: consultation.feedback || null,
      animalId: consultation.animalId || null,
      animalName: consultation.animalName || null,
      animalType: consultation.animalType || null,
      animalBreed: consultation.animalBreed || null,
      diagnosis: consultation.diagnosis || null,
      symptomsObserved: consultation.symptomsObserved || null,
      treatmentGiven: consultation.treatmentGiven || null,
      medicationDosage: consultation.medicationDosage || null,
      followUpNeeded: consultation.followUpNeeded || false,
      followUpDate: consultation.followUpDate || null,
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

    const actor = await getCurrentUser()
    if (actor) await logActivity(actor._id, "consultation.updated", `Updated a ${consultation.service || "consultation"}`)

    return { success: true, modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error("Error updating consultation:", error);
    await logSystemError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: "consultation.updated",
    })
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

    // Attached documents would otherwise outlive the case they belong to.
    if (result.deletedCount) {
      try {
        await deleteDocumentsForConsultation(db, new ObjectId(id));
      } catch (cleanupError) {
        console.error("Error removing consultation documents:", cleanupError);
      }
    }

    // Revalidate paths
    revalidatePath("/farmer/consultations");

    const actor = await getCurrentUser()
    if (actor) await logActivity(actor._id, "consultation.deleted", "Deleted a consultation")

    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error("Error deleting consultation:", error);
    await logSystemError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: "consultation.deleted",
    })
    return { success: false, error: "Failed to delete consultation" };
  }
}
// getUserConfig/saveUserConfig lived here and read/wrote a `userConfigs` collection.
// They were superseded by app/api/tracking-config, which stores the same ThingSpeak
// device settings in `trackingConfigs` keyed on userId + role and is what the four
// live tracking routes actually call. Nothing referenced the pair and nothing else
// touched `userConfigs`, so they were removed rather than repaired.

// Logs a client-generated export (PDF/Excel/CSV built in-browser, no server round-trip
// for the file itself) against whoever the session cookie says is currently logged in -
// never trust a client-supplied userId for an audit-log entry.
export async function logPortalExport(exportType: string, format?: string) {
  const actor = await getCurrentUser()
  if (!actor) return
  await logActivity(actor._id, "export.portal", format ? `${exportType} (${format})` : exportType)
}

// Called from the top-level error boundaries (app/error.tsx, app/global-error.tsx) - those
// are client components and can't reach the DB directly, so this is the server-side entry point.
export async function reportClientError(message: string, stack?: string) {
  const actor = await getCurrentUser().catch(() => null)
  await logSystemError({
    message,
    stack,
    userId: actor?._id ? String(actor._id) : undefined,
    action: "client.unhandled_error",
  })
}

export async function forceLogoutUser(userId: string) {
  try {
    const actor = await getCurrentUser()
    if (!actor || actor.role !== "superadmin") {
      return { success: false, error: "Unauthorized" }
    }

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

    // Also flip the presence doc immediately - the "online" badge/count
    // elsewhere reads from here (see lib/presence.ts), not from the users
    // collection above, so without this the user could still show as
    // online for up to ONLINE_THRESHOLD_MS after being force-logged-out.
    await db.collection("presence").updateOne(
      { _id: userObjectId } as any,
      { $set: { isOnline: false } },
      { upsert: true }
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