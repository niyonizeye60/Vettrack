import { del } from "@vercel/blob"

export async function deleteStorageFile(filePath: string | null | undefined): Promise<void> {
  if (!filePath) return

  // Vercel Blob URL — delete via the Blob API
  if (filePath.startsWith("https://") && filePath.includes("blob.vercel-storage.com")) {
    try {
      await del(filePath)
    } catch {
      // Blob may already be gone — ignore
    }
    return
  }

  // Legacy local path still stored in the DB (e.g. "/avatars/avatar-xxx.jpg")
  // Try to unlink from disk so old records don't leave orphaned files locally.
  if (filePath.startsWith("/avatars/")) {
    try {
      const { unlink } = await import("fs/promises")
      const { join } = await import("path")
      await unlink(join(process.cwd(), "public", filePath))
    } catch {
      // File may not exist — ignore
    }
  }
}
