import clientPromise from "./db"

const DB = "ntdm_animal_hospital"

export interface EpidemicDiseaseCategory {
  _id: string
  name: string
}

export async function listEpidemicDiseases(): Promise<EpidemicDiseaseCategory[]> {
  try {
    const client = await clientPromise
    const db = client.db(DB)
    const docs = await db.collection("epidemic_diseases").find().sort({ name: 1 }).toArray()
    return docs.map((d) => ({ _id: d._id.toString(), name: d.name }))
  } catch (error) {
    console.error("Error listing epidemic diseases:", error)
    return []
  }
}

// Inserts the category if it does not exist yet (case-insensitive) and returns
// its _id. Used when a case is submitted with a brand-new disease name so that
// admins' first-time writes become selectable categories.
export async function ensureEpidemicDisease(name: string): Promise<string | null> {
  const clean = (name || "").trim()
  if (!clean) return null
  const key = clean.toLowerCase()
  try {
    const client = await clientPromise
    const db = client.db(DB)
    const existing = await db.collection("epidemic_diseases").findOne({ key })
    if (existing) return existing._id.toString()
    try {
      const result = await db.collection("epidemic_diseases").insertOne({
        name: clean,
        key,
        createdAt: new Date(),
      })
      return result.insertedId.toString()
    } catch (err: any) {
      // Race with a concurrent insert -> treat the existing row as success.
      if (err?.code === 11000) {
        const dup = await db.collection("epidemic_diseases").findOne({ key })
        return dup ? dup._id.toString() : null
      }
      throw err
    }
  } catch (error) {
    console.error("Error ensuring epidemic disease:", error)
    return null
  }
}

export async function deleteEpidemicDisease(id: string): Promise<boolean> {
  try {
    const { ObjectId } = await import("mongodb")
    const client = await clientPromise
    const db = client.db(DB)
    const result = await db.collection("epidemic_diseases").deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  } catch (error) {
    console.error("Error deleting epidemic disease:", error)
    return false
  }
}
