/**
 * Backfill: stamps district/sector-derived coordinates onto any services docs
 * missing them. Uses the same GADM data as the app resolver.
 *
 * Run: npx tsx scripts/seed-backfill-coordinates.mjs
 */
import { MongoClient } from "mongodb"
import { resolveLocation } from "../lib/rwanda-geo.ts"

process.loadEnvFile?.(".env")
if (!process.env.MONGODB_URI) throw new Error("Missing required environment variable: MONGODB_URI")

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db = client.db("ntdm_animal_hospital")
const services = db.collection("services")

const missing = await services.find({
  $or: [
    { latitude: { $exists: false } },
    { latitude: null },
    { longitude: { $exists: false } },
    { longitude: null },
  ],
}).toArray()
console.log(`docs missing coordinates: ${missing.length}`)
let fixed = 0
for (const s of missing) {
  const coords = resolveLocation(s.district, s.sector)
  await services.updateOne({ _id: s._id }, { $set: { latitude: coords.lat, longitude: coords.lng } })
  console.log(`  fixed: ${s.name} (${s.district ?? "?"}/${s.sector ?? "?"}) -> ${coords.lat}, ${coords.lng}`)
  fixed++
}
console.log(`updated ${fixed}`)
await client.close()
