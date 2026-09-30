export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { PRESCRIPTION_MAX_BYTES, PRESCRIPTION_TYPES, savePrescription } from "@/lib/db-prescriptions"

/** The first bytes of each allowed file type, so a renamed file can't pass as a photo. */
function looksLike(contentType: string, bytes: Buffer): boolean {
  switch (contentType) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    case "image/png":
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case "image/webp":
      return bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP"
    case "application/pdf":
      return bytes.subarray(0, 5).toString("latin1") === "%PDF-"
    default:
      return false
  }
}

/**
 * POST - a buyer uploading their vet's prescription at checkout.
 *
 * Open to guests, because checkout is. Rate-limited in middleware, capped in size and
 * type, and the upload can't be read back from here: only the pharmacy that sells the
 * drug and finance staff can view it, once it is attached to an order.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!PRESCRIPTION_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Upload a photo (JPG, PNG or WebP) or a PDF of the prescription" }, { status: 400 })
    }
    if (file.size > PRESCRIPTION_MAX_BYTES) {
      return NextResponse.json({ error: "The prescription file must be under 4 MB" }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    if (!looksLike(file.type, bytes)) {
      return NextResponse.json({ error: "That file doesn't look like a photo or PDF" }, { status: 400 })
    }

    const prescriptionId = await savePrescription(bytes, file.type, file.name || "prescription")
    return NextResponse.json({ prescriptionId })
  } catch (error) {
    console.error("Prescription upload failed:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
