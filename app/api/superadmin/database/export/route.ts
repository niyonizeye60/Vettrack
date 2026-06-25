export const dynamic = "force-dynamic"
export const maxDuration = 300

import { NextResponse } from "next/server"
import { Readable } from "stream"
import { createGzip } from "zlib"
import { EJSON } from "bson"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

const DATABASE_NAME = "ntdm_animal_hospital"

async function* generateBackupLines() {
  const client = await clientPromise
  const db = client.db(DATABASE_NAME)

  const collections = (await db.listCollections(undefined, { nameOnly: true }).toArray())
    .filter((c) => c.type === "collection")
    .map((c) => c.name)
    .sort()

  yield EJSON.stringify({ t: "meta", exportedAt: new Date(), database: DATABASE_NAME, collections }) + "\n"

  for (const name of collections) {
    const coll = db.collection(name)

    const indexes = await coll.indexes()
    for (const index of indexes) {
      if (index.name === "_id_") continue
      yield EJSON.stringify({ t: "index", collection: name, index }) + "\n"
    }

    const cursor = coll.find({}, { batchSize: 500 })
    for await (const doc of cursor) {
      yield EJSON.stringify({ t: "doc", collection: name, data: doc }) + "\n"
    }
  }
}

export async function GET() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const nodeStream = Readable.from(generateBackupLines())
  const gzip = createGzip()
  const gzippedStream = nodeStream.pipe(gzip)

  nodeStream.on("error", (err) => console.error("Database export read error:", err))
  gzippedStream.on("error", (err) => console.error("Database export gzip error:", err))

  const dateStr = new Date().toISOString().slice(0, 10)

  return new Response(Readable.toWeb(gzippedStream) as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="ntdm-backup-${dateStr}.ndjson.gz"`,
      "Cache-Control": "no-store",
    },
  })
}
