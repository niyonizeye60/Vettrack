import clientPromise from "./db"

const DB = "ntdm_animal_hospital"

export interface EpidemicAnimalType {
  _id: string
  name: string
}

export async function listEpidemicAnimalTypes(): Promise<EpidemicAnimalType[]> {
  try {
    const client = await clientPromise
    const db = client.db(DB)
    const docs = await db.collection("epidemic_animal_types").find().sort({ name: 1 }).toArray()
    return docs.map((d) => ({ _id: d._id.toString(), name: d.name }))
  } catch (error) {
    console.error("Error listing epidemic animal types:", error)
    return []
  }
}

// Inserts the animal type if it does not exist yet (case-insensitive) and
// returns its _id. Used when a case is submitted with a brand-new type name so
// that first-time writes become selectable options for everyone.
export async function ensureEpidemicAnimalType(name: string): Promise<string | null> {
  const clean = (name || "").trim()
  if (!clean) return null
  const key = clean.toLowerCase()
  try {
    const client = await clientPromise
    const db = client.db(DB)
    const existing = await db.collection("epidemic_animal_types").findOne({ key })
    if (existing) return existing._id.toString()
    try {
      const result = await db.collection("epidemic_animal_types").insertOne({
        name: clean,
        key,
        createdAt: new Date(),
      })
      return result.insertedId.toString()
    } catch (err: any) {
      // Race with a concurrent insert -> treat the existing row as success.
      if (err?.code === 11000) {
        const dup = await db.collection("epidemic_animal_types").findOne({ key })
        return dup ? dup._id.toString() : null
      }
      throw err
    }
  } catch (error) {
    console.error("Error ensuring epidemic animal type:", error)
    return null
  }
}

export async function deleteEpidemicAnimalType(id: string): Promise<boolean> {
  try {
    const { ObjectId } = await import("mongodb")
    const client = await clientPromise
    const db = client.db(DB)
    const result = await db.collection("epidemic_animal_types").deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  } catch (error) {
    console.error("Error deleting epidemic animal type:", error)
    return false
  }
}
