/**
 * Rules for documents a vet attaches to a consultation.
 *
 * Shared by the upload route (which enforces them) and the upload UI (which uses them
 * for instant feedback), so it stays dependency-free: a client component can import
 * this without pulling in the storage code's fs / Blob imports.
 */

// Vercel serverless functions reject request bodies over 4.5 MB, so a larger limit
// would fail in production with an opaque 413 instead of our own message.
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024

export const DOCUMENT_MAX_PER_CONSULTATION = 10

/** A vet can only attach documents to cases they have taken on. */
export const DOCUMENT_UPLOAD_STATUSES: readonly string[] = ["accepted", "completed"]

export const DOCUMENT_TYPES = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const

export type DocumentExtension = keyof typeof DOCUMENT_TYPES

export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_TYPES)
  .map((ext) => `.${ext}`)
  .join(",")

/** The lower-cased extension if it is an allowed document type, otherwise null. */
export function documentExtension(fileName: string): DocumentExtension | null {
  const dot = fileName.lastIndexOf(".")
  if (dot < 0) return null
  const ext = fileName.slice(dot + 1).toLowerCase()
  return Object.prototype.hasOwnProperty.call(DOCUMENT_TYPES, ext) ? (ext as DocumentExtension) : null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const mb = bytes / (1024 * 1024)
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`
}

/** What the browser is allowed to know about a document - never where it is stored. */
export interface ConsultationDocument {
  id: string
  name: string
  size: number
  contentType: string
  createdAt: string
}
