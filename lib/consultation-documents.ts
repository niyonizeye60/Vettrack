import { randomUUID } from "crypto"
import { mkdir, readFile, unlink, writeFile } from "fs/promises"
import { dirname, resolve, sep } from "path"
import { del, get, put } from "@vercel/blob"
import { ObjectId, type Db } from "mongodb"
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_TYPES,
  documentExtension,
  type ConsultationDocument,
  type DocumentExtension,
} from "./consultation-document-rules"

export const DOCUMENTS_COLLECTION = "consultation_documents"

// Metadata lives in its own collection, not on the consultation. Several admin
// endpoints return raw consultation documents, and the stored path is the one thing
// that must never travel with them.
interface StoredDocument {
  _id: ObjectId
  consultationId: ObjectId
  farmerId: string | null
  uploadedBy: ObjectId
  name: string
  size: number
  contentType: string
  path: string
  createdAt: Date
}

// The same store the avatars use, which is public. That is acceptable only because the
// URL is never handed to a browser: every download goes through
// app/api/consultations/[id]/documents/[docId], which checks who is asking and streams
// the bytes. Moving to a private Blob store is a one-line change here (existing
// documents would need copying across).
const BLOB_ACCESS = "public" as const

// Development fallback. Deliberately not under public/ - that is served without any
// access check, and this repo is public.
const LOCAL_ROOT = resolve(process.cwd(), ".local-uploads")

const isBlobPath = (storedPath: string) => storedPath.startsWith("https://")

function localPath(key: string): string {
  const full = resolve(LOCAL_ROOT, key)
  if (!full.startsWith(LOCAL_ROOT + sep)) throw new Error("Invalid document path")
  return full
}

// The extension is user-controlled, so also check the file really is what it says.
const has = (bytes: Uint8Array, at: number, signature: number[]) =>
  signature.every((value, i) => bytes[at + i] === value)

const SIGNATURES: Record<DocumentExtension, (b: Uint8Array) => boolean> = {
  pdf: (b) => has(b, 0, [0x25, 0x50, 0x44, 0x46]), // %PDF
  jpg: (b) => has(b, 0, [0xff, 0xd8, 0xff]),
  jpeg: (b) => has(b, 0, [0xff, 0xd8, 0xff]),
  png: (b) => has(b, 0, [0x89, 0x50, 0x4e, 0x47]),
  webp: (b) => has(b, 0, [0x52, 0x49, 0x46, 0x46]) && has(b, 8, [0x57, 0x45, 0x42, 0x50]), // RIFF....WEBP
  doc: (b) => has(b, 0, [0xd0, 0xcf, 0x11, 0xe0]), // legacy OLE container
  docx: (b) => has(b, 0, [0x50, 0x4b, 0x03, 0x04]), // zip container
}

export type DocumentValidation =
  | { ok: true; ext: DocumentExtension; contentType: string }
  | { ok: false; message: string }

export async function validateDocumentFile(file: File): Promise<DocumentValidation> {
  if (file.size === 0) return { ok: false, message: "That file is empty" }
  if (file.size > DOCUMENT_MAX_BYTES) {
    return { ok: false, message: `File must be under ${DOCUMENT_MAX_BYTES / (1024 * 1024)} MB` }
  }
  const ext = documentExtension(file.name)
  if (!ext) return { ok: false, message: "Only PDF, JPG, PNG, WebP, DOC or DOCX files are allowed" }

  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!SIGNATURES[ext](head)) return { ok: false, message: "The file's contents don't match its file type" }

  return { ok: true, ext, contentType: DOCUMENT_TYPES[ext] }
}

/** The name shown to the farmer: no path, no control or reserved characters, bounded length. */
export function cleanDocumentName(raw: string, ext: string): string {
  const base = (raw.split(/[\\/]/).pop() ?? "").replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim()
  if (!base) return `document.${ext}`
  if (base.length <= 120) return base
  const dot = base.lastIndexOf(".")
  const suffix = dot >= 0 ? base.slice(dot) : ""
  return base.slice(0, 120 - suffix.length) + suffix
}

/** Content-Disposition value that survives quotes and non-ASCII names (Kinyarwanda accents, etc.). */
export function attachmentDisposition(name: string): string {
  const fallback = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_")
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  )
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

/** Writes the file and returns the opaque path to keep in the database. */
export async function storeDocumentFile(
  consultationId: string,
  file: File,
  ext: string,
  contentType: string
): Promise<string> {
  const key = `consultation-docs/${consultationId}/${randomUUID()}.${ext}`

  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    const blob = await put(key, file, { access: BLOB_ACCESS, addRandomSuffix: true, contentType })
    return blob.url
  }

  const target = localPath(key)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, Buffer.from(await file.arrayBuffer()))
  return key
}

export async function openDocumentFile(
  storedPath: string
): Promise<{ body: ReadableStream<Uint8Array> | Uint8Array; size: number } | null> {
  if (isBlobPath(storedPath)) {
    const result = await get(storedPath, { access: BLOB_ACCESS })
    if (!result || result.statusCode !== 200) return null
    return { body: result.stream, size: result.blob.size }
  }

  try {
    const bytes = await readFile(localPath(storedPath))
    return { body: new Uint8Array(bytes), size: bytes.length }
  } catch {
    return null
  }
}

export async function deleteDocumentFile(storedPath: string): Promise<void> {
  try {
    if (isBlobPath(storedPath)) await del(storedPath)
    else await unlink(localPath(storedPath))
  } catch {
    // Already gone - nothing left to clean up.
  }
}

function toClientDocument(d: Omit<StoredDocument, "path">): ConsultationDocument {
  return {
    id: d._id.toString(),
    name: d.name,
    size: d.size,
    contentType: d.contentType,
    createdAt: d.createdAt.toISOString(),
  }
}

/** Batched lookup keyed by consultation id. The stored path is projected out. */
export async function getDocumentsByConsultation(
  db: Db,
  consultationIds: ObjectId[]
): Promise<Map<string, ConsultationDocument[]>> {
  const byConsultation = new Map<string, ConsultationDocument[]>()
  if (consultationIds.length === 0) return byConsultation

  const docs = await db
    .collection<StoredDocument>(DOCUMENTS_COLLECTION)
    .find({ consultationId: { $in: consultationIds } }, { projection: { path: 0 } })
    .sort({ createdAt: 1 })
    .toArray()

  for (const doc of docs) {
    const key = doc.consultationId.toString()
    const list = byConsultation.get(key) ?? []
    list.push(toClientDocument(doc))
    byConsultation.set(key, list)
  }
  return byConsultation
}

/** Removes every document of a consultation - files first, then their records. */
export async function deleteDocumentsForConsultation(db: Db, consultationId: ObjectId): Promise<void> {
  const collection = db.collection<StoredDocument>(DOCUMENTS_COLLECTION)
  const docs = await collection.find({ consultationId }, { projection: { path: 1 } }).toArray()
  await Promise.all(docs.map((doc) => deleteDocumentFile(doc.path)))
  await collection.deleteMany({ consultationId })
}

/**
 * The single access rule for consultation documents: the assigned vet and the
 * farmer who owns the case, nobody else. Returns null for "not found" and "not yours"
 * alike so a probing caller learns nothing about which ids exist.
 */
export async function getConsultationAccess(db: Db, consultationId: string, user: { _id: string; role: string }) {
  if (!ObjectId.isValid(consultationId)) return null

  const consultation = await db.collection("consultations").findOne({ _id: new ObjectId(consultationId) })
  if (!consultation) return null

  // `doctor` is a raw id string from the booking form, an ObjectId in legacy rows.
  const isDoctor = user.role === "doctor" && consultation.doctor != null && String(consultation.doctor) === user._id
  const isFarmer = user.role === "farmer" && consultation.farmerId != null && String(consultation.farmerId) === user._id
  if (!isDoctor && !isFarmer) return null

  return { consultation, isDoctor, isFarmer }
}
