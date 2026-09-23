export const dynamicParams = true;
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import clientPromise from "@/lib/db"
import { logActivity } from "@/lib/activity-log"
import {
  DOCUMENTS_COLLECTION,
  attachmentDisposition,
  deleteDocumentFile,
  getConsultationAccess,
  openDocumentFile,
} from "@/lib/consultation-documents"

type RouteContext = { params: { id: string; docId: string } }

const notFound = () => NextResponse.json({ success: false, message: "Document not found" }, { status: 404 })

/** Streams the file to the assigned vet or the farmer who owns the case. */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const access = await getConsultationAccess(db, params.id, currentUser)
    if (!access || !ObjectId.isValid(params.docId)) return notFound()

    const doc = await db.collection(DOCUMENTS_COLLECTION).findOne({
      _id: new ObjectId(params.docId),
      consultationId: access.consultation._id,
    })
    if (!doc) return notFound()

    const file = await openDocumentFile(doc.path)
    if (!file) return notFound()

    // The type comes from our own allow-list, never from the upload, and the
    // response is always an attachment - an uploaded file can't render in our origin.
    return new Response(file.body as BodyInit, {
      headers: {
        "Content-Type": doc.contentType,
        "Content-Length": String(file.size),
        "Content-Disposition": attachmentDisposition(doc.name),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("Consultation document download error:", error)
    return NextResponse.json({ success: false, message: "Download failed" }, { status: 500 })
  }
}

/** The assigned vet can take a document back down, e.g. after attaching the wrong file. */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const access = await getConsultationAccess(db, params.id, currentUser)
    if (!access?.isDoctor || !ObjectId.isValid(params.docId)) return notFound()

    const collection = db.collection(DOCUMENTS_COLLECTION)
    const doc = await collection.findOneAndDelete({
      _id: new ObjectId(params.docId),
      consultationId: access.consultation._id,
    })
    if (!doc) return notFound()

    await deleteDocumentFile(doc.path)
    await logActivity(currentUser._id, "consultation.document_removed", "Removed a document from a consultation")

    revalidatePath("/veterinary/consultations")
    revalidatePath("/farmer/consultations")
    revalidatePath(`/farmer/consultations/${params.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Consultation document delete error:", error)
    return NextResponse.json({ success: false, message: "Could not remove the document" }, { status: 500 })
  }
}
