import { unlink } from "fs/promises"
import { join } from "path"

export async function deleteStorageFile(filePath: string | null | undefined): Promise<void> {
  if (!filePath) return
  if (!filePath.startsWith("/avatars/")) return
  const absPath = join(process.cwd(), "public", filePath)
  try {
    await unlink(absPath)
  } catch {
    // File may not exist on disk (e.g. external URL or already deleted) — ignore
  }
}
