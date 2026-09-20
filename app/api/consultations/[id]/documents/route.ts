export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import clientPromise from "@/lib/db"
import { logActivity } from "@/lib/activity-log"
import {
  DOCUMENT_MAX_PER_CONSULTATION,
  DOCUMENT_UPLOAD_STATUSES,
} from "@/lib/consultation-document-rules"
import {
  DOCUMENTS_COLLECTION,
  cleanDocumentName,
  deleteDocumentFile,
  getConsultationAccess,
  storeDocumentFile,
  validateDocumentFile,
} from "@/lib/consultation-documents"

/**
 * A vet attaches a document to one of their cases and the farmer is notified.
 * Downloads live in ./[docId]/route.ts.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const access = await getConsultationAccess(db, params.id, currentUser)
    if (!access?.isDoctor) {
      return NextResponse.json({ success: false, message: "Consultation not found" }, { status: 404 })
    }
    const { consultation } = access

    if (!DOCUMENT_UPLOAD_STATUSES.includes(String(consultation.status).toLowerCase())) {
      return NextResponse.json(
        { success: false, message: "Accept the consultation before adding documents" },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 })
    }

    const validation = await validateDocumentFile(file)
    if (!validation.ok) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 })
    }

    const documents = db.collection(DOCUMENTS_COLLECTION)
    const consultationId = consultation._id as ObjectId
    if ((await documents.countDocuments({ consultationId })) >= DOCUMENT_MAX_PER_CONSULTATION) {
      return NextResponse.json(
        { success: false, message: `A consultation can hold up to ${DOCUMENT_MAX_PER_CONSULTATION} documents` },
        { status: 400 }
      )
    }

    const name = cleanDocumentName(file.name, validation.ext)
    const path = await storeDocumentFile(consultationId.toString(), file, validation.ext, validation.contentType)

    const record = {
      consultationId,
      farmerId: consultation.farmerId ? String(consultation.farmerId) : null,
      uploadedBy: new ObjectId(currentUser._id),
      name,
      size: file.size,
      contentType: validation.contentType,
      path,
      createdAt: new Date(),
    }

    let insertedId: ObjectId
    try {
      insertedId = (await documents.insertOne(record)).insertedId
    } catch (dbError) {
      // Don't leave a file behind that nothing points at.
      await deleteDocumentFile(path)
      throw dbError
    }

    // Tell the farmer in-app, the same way a status change does. A failed
    // notification must never fail the upload it accompanies.
    try {
      const farmerId = record.farmerId
      if (farmerId && ObjectId.isValid(farmerId)) {
        const animalSuffix = consultation.animalName ? ` for ${consultation.animalName}` : ""
        await db.collection("notifications").insertOne({
          title: "New document from your vet",
          message: `Your vet added "${name}" to your consultation${animalSuffix}.`,
          type: "consultation",
          priority: "normal",
          read: false,
          deletedBy: [],
          userId: new ObjectId(farmerId),
          actionUrl: `/farmer/consultations/${consultationId.toString()}`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        })
      }
    } catch (notifyError) {
      console.error("Error notifying farmer of consultation document:", notifyError)
    }

    await logActivity(currentUser._id, "consultation.document_uploaded", `Added a document to a consultation`)

    revalidatePath("/veterinary/consultations")
    revalidatePath("/farmer/consultations")
    revalidatePath(`/farmer/consultations/${consultationId.toString()}`)

    return NextResponse.json({
      success: true,
      document: {
        id: insertedId.toString(),
        name,
        size: record.size,
        contentType: record.contentType,
        createdAt: record.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Consultation document upload error:", error)
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 })
  }
}
