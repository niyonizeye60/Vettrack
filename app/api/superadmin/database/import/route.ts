export const dynamic = "force-dynamic"
export const maxDuration = 300

import { NextRequest, NextResponse } from "next/server"
import { MongoClient, MongoBulkWriteError } from "mongodb"
import { gunzipSync } from "zlib"
import { EJSON } from "bson"
import { getCurrentUser } from "@/lib/auth"

const BATCH_SIZE = 500

interface BackupMeta {
  t: "meta"
  database: string
  collections: string[]
}

interface BackupIndexLine {
  t: "index"
  collection: string
  index: Record<string, any>
}

interface BackupDocLine {
  t: "doc"
  collection: string
  data: Record<string, any>
}

interface CollectionSummary {
  documentsInserted: number
  documentsSkipped: number
  indexesCreated: number
}

function getSummary(summary: Record<string, CollectionSummary>, collection: string) {
  if (!summary[collection]) {
    summary[collection] = { documentsInserted: 0, documentsSkipped: 0, indexesCreated: 0 }
  }
  return summary[collection]
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  const connectionStringRaw = formData.get("connectionString")
  const targetDatabaseOverride = formData.get("targetDatabase")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing backup file" }, { status: 400 })
  }

  const connectionString = typeof connectionStringRaw === "string" ? connectionStringRaw.trim() : ""
  if (!/^mongodb(\+srv)?:\/\//.test(connectionString)) {
    return NextResponse.json({ error: "A valid MongoDB connection string is required" }, { status: 400 })
  }

  let buffer: Buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    buffer = gunzipSync(buffer)
  }

  const lines = buffer
    .toString("utf-8")
    .split("\n")
    .filter((line) => line.trim().length > 0)

  let meta: BackupMeta | null = null
  const indexLines: BackupIndexLine[] = []
  const docsByCollection = new Map<string, Record<string, any>[]>()

  for (const line of lines) {
    let parsed: BackupMeta | BackupIndexLine | BackupDocLine
    try {
      parsed = EJSON.parse(line) as typeof parsed
    } catch {
      return NextResponse.json({ error: "Backup file is corrupted — could not parse a line of it" }, { status: 400 })
    }

    if (parsed.t === "meta") {
      meta = parsed
    } else if (parsed.t === "index") {
      indexLines.push(parsed)
    } else if (parsed.t === "doc") {
      const existing = docsByCollection.get(parsed.collection)
      if (existing) {
        existing.push(parsed.data)
      } else {
        docsByCollection.set(parsed.collection, [parsed.data])
      }
    }
  }

  if (!meta) {
    return NextResponse.json(
      { error: "Backup file is missing its metadata header — is this an NTDM database backup?" },
      { status: 400 },
    )
  }

  const targetDatabaseName =
    typeof targetDatabaseOverride === "string" && targetDatabaseOverride.trim().length > 0
      ? targetDatabaseOverride.trim()
      : meta.database

  const targetClient = new MongoClient(connectionString, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })

  const summary: Record<string, CollectionSummary> = {}

  try {
    await targetClient.connect()
    const targetDb = targetClient.db(targetDatabaseName)

    for (const [collectionName, docs] of docsByCollection) {
      const coll = targetDb.collection(collectionName)
      const collSummary = getSummary(summary, collectionName)

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE)
        try {
          const result = await coll.insertMany(batch, { ordered: false })
          collSummary.documentsInserted += result.insertedCount
        } catch (error) {
          if (error instanceof MongoBulkWriteError) {
            collSummary.documentsInserted += error.insertedCount
            const writeErrors = Array.isArray(error.writeErrors) ? error.writeErrors : [error.writeErrors]
            const duplicates = writeErrors.filter((writeError) => writeError.code === 11000)
            const otherErrors = writeErrors.filter((writeError) => writeError.code !== 11000)
            collSummary.documentsSkipped += duplicates.length
            if (otherErrors.length > 0) {
              throw new Error(`Failed inserting into "${collectionName}": ${otherErrors[0].errmsg}`)
            }
          } else {
            throw error
          }
        }
      }
    }

    for (const { collection, index } of indexLines) {
      const { key, name, ...options } = index
      try {
        await targetDb.collection(collection).createIndex(key, { name, ...options })
        getSummary(summary, collection).indexesCreated += 1
      } catch (error) {
        console.error(`Failed to recreate index "${name}" on "${collection}":`, error)
      }
    }

    return NextResponse.json({ success: true, database: targetDatabaseName, summary })
  } catch (error) {
    console.error("Database import failed:", error)
    const message = error instanceof Error ? error.message : "Import failed"
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    await targetClient.close().catch(() => {})
  }
}
