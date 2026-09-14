/**
 * Seed script for the epidemic outbreak tracking feature.
 *
 * Creates:
 *  - demo accounts (farmer, veterinarian, admin) that can log into the app
 *  - a set of epidemic cases pinned across Rwanda for the outbreak map
 *
 * Usage (inside Docker):
 *   docker compose run --rm seed
 *
 * Usage (local, against any MongoDB):
 *   MONGODB_URI=mongodb://localhost:27017/ntdm_animal_hospital node scripts/seed-epidemics.mjs
 *
 * The script is idempotent: re-running it replaces only data it previously
 * seeded (marked with seeded: true) and upserts the demo users.
 */
import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ntdm_animal_hospital"
const DB = "ntdm_animal_hospital"
const SEED_PASSWORD = process.env.SEED_PASSWORD || "Password123!"

const USERS = [
  {
    email: "seedfarmer@vettrack.rw",
    name: "Seed Farmer",
    phone: "+250780000001",
    role: "farmer",
    status: "active",
    district: "Gasabo",
    sector: "Kimironko",
  },
  {
    email: "seedvet@vettrack.rw",
    name: "Seed Veterinarian",
    phone: "+250780000002",
    role: "doctor",
    status: "active",
    district: "Gasabo",
    sector: "Kacyiru",
    licenseNumber: "SEED-VET-001",
    specialization: "Livestock Medicine",
  },
  {
    email: "seedadmin@vettrack.rw",
    name: "Seed Admin",
    phone: "+250780000003",
    role: "admin",
    status: "active",
    district: "Gasabo",
    sector: "Nyarugenge",
  },
]

// Default animal types that any user can extend from the UI.
const DEFAULT_ANIMAL_TYPES = ["Cow", "Goat", "Sheep", "Pig", "Chicken", "Duck", "Rabbit", "Dog", "Cat", "Horse", "Donkey"]

// Default disease categories that admins can later extend from the UI.
const DEFAULT_DISEASES = [
  "Foot and Mouth Disease",
  "East Coast Fever",
  "Anthrax",
  "Blackleg",
  "Brucellosis",
  "Tuberculosis",
  "Lumpy Skin Disease",
  "Newcastle Disease",
  "Avian Influenza",
  "African Swine Fever",
  "Trypanosomiasis",
  "Rift Valley Fever",
  "Rabies",
  "Mastitis",
]

// [name, disease, animalType, lat, lng, severity, status, affectedCount, district]
// indexes:  0     1        2           3    4    5        6      7             8
const CASES = [
  ["FMD outbreak in dairy herd", "Foot and Mouth Disease", "Cow", -1.9441, 30.0619, "high", "confirmed", 6, "Gasabo"],
  ["Anthrax found in carcass", "Anthrax", "Cow", -1.4991, 29.6379, "critical", "confirmed", 2, "Musanze"],
  ["ECF cases on grazing land", "East Coast Fever", "Cow", -1.2985, 30.3301, "high", "confirmed", 4, "Nyagatare"],
  ["Newcastle in free-range flock", "Newcastle Disease", "Chicken", -2.5967, 29.7407, "medium", "confirmed", 25, "Huye"],
  ["Lumpy skin on heifers", "Lumpy Skin Disease", "Cow", -1.7038, 29.2564, "medium", "confirmed", 3, "Rubavu"],
  ["Swine fever cluster", "African Swine Fever", "Pig", -2.2478, 30.135, "critical", "confirmed", 8, "Bugesera"],
  ["Blackleg in young stock", "Blackleg", "Cow", -1.9544, 30.4352, "high", "confirmed", 2, "Rwamagana"],
  ["FMD resolved after treatment", "Foot and Mouth Disease", "Cow", -1.7, 30.05, "medium", "resolved", 5, "Gicumbi"],
  ["Brucellosis screening positive", "Brucellosis", "Goat", -2.05, 29.35, "medium", "resolved", 3, "Karongi"],
  ["Rabies in village dog", "Rabies", "Dog", -2.4833, 28.9, "high", "resolved", 1, "Rusizi"],
  ["Suspected FMD - unverified", "Foot and Mouth Disease", "Cow", -1.6, 30.45, "low", "rejected", 1, "Gatsibo"],
  ["Under investigation", "Trypanosomiasis", "Cow", -2.15, 30.55, "medium", "pending", 2, "Ngoma"],
]

async function main() {
  console.log(`Connecting to ${MONGODB_URI}...`)
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db(DB)
  const users = db.collection("users")
  const epidemicCases = db.collection("epidemic_cases")
  const epidemicDiseases = db.collection("epidemic_diseases")
  const epidemicAnimalTypes = db.collection("epidemic_animal_types")

  // ── Demo users ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  let createdUsers = 0
  for (const u of USERS) {
    const existing = await users.findOne({ email: u.email })
    const doc = { ...u, password: passwordHash, createdAt: new Date(), updatedAt: new Date(), isTestAccount: true }
    if (existing) {
      await users.updateOne({ _id: existing._id }, { $set: { ...doc, _id: existing._id } })
      console.log(`  updated user  ${u.email} (${u.role})`)
    } else {
      await users.insertOne(doc)
      createdUsers++
      console.log(`  created user ${u.email} (${u.role})`)
    }
  }

  // ── Epidemic cases ────────────────────────────────────────────────────────
  await epidemicCases.deleteMany({ seeded: true })
  console.log(`  cleared ${await epidemicCases.countDocuments({ seeded: true })} previous seeded cases`)

  const now = new Date()
  const farmer = await users.findOne({ email: "seedfarmer@vettrack.rw" })
  const vet = await users.findOne({ email: "seedvet@vettrack.rw" })
  const farmerId = farmer ? farmer._id.toString() : "seed-farmer"
  const farmerName = farmer?.name || "Seed Farmer"

  const docs = CASES.map((c, i) => ({
    farmerId,
    farmerName,
    animalId: null,
    animalName: `${c[2]} at ${c[8]}`,
    animalType: c[2],
    diseaseName: c[1],
    symptoms: c[5] === "critical" ? "Sudden death, fever, swelling" : "Fever, loss of appetite, lesions",
    affectedCount: c[7],
    severity: c[5],
    latitude: c[3],
    longitude: c[4],
    locationLabel: c[8],
    district: c[8],
    sector: null,
    status: c[6],
    notes: "Seeded demo case",
    confirmedBy: c[5] === "confirmed" || c[5] === "resolved" ? (vet?.name || "Seed Veterinarian") : null,
    confirmedAt: new Date(now.getTime() - i * 3600_000),
    reportedAt: new Date(now.getTime() - (i + 1) * 3600_000 * 24),
    createdAt: new Date(now.getTime() - (i + 1) * 3600_000 * 24),
    updatedAt: new Date(now.getTime() - i * 3600_000),
    seeded: true,
  }))

  const inserted = await epidemicCases.insertMany(docs)
  await epidemicCases.createIndex({ status: 1, reportedAt: -1 })
  await epidemicCases.createIndex({ farmerId: 1, reportedAt: -1 })
  console.log(`  inserted ${inserted.insertedCount} epidemic cases`)

  // ── Animal types ─────────────────────────────────────────────────────────
  await epidemicAnimalTypes.createIndex({ key: 1 }, { unique: true })
  let typesCreated = 0
  let typesKept = 0
  for (const name of DEFAULT_ANIMAL_TYPES) {
    const existing = await epidemicAnimalTypes.findOne({ key: name.toLowerCase() })
    if (existing) {
      typesKept++
    } else {
      await epidemicAnimalTypes.insertOne({ name, key: name.toLowerCase(), createdAt: new Date() })
      typesCreated++
    }
  }
  console.log(`  animal types: ${typesCreated} created, ${typesKept} already present`)

  // ── Disease categories ────────────────────────────────────────────────────
  await epidemicDiseases.createIndex({ key: 1 }, { unique: true })
  let categoriesCreated = 0
  let categoriesKept = 0
  for (const name of DEFAULT_DISEASES) {
    const existing = await epidemicDiseases.findOne({ key: name.toLowerCase() })
    if (existing) {
      categoriesKept++
    } else {
      await epidemicDiseases.insertOne({ name, key: name.toLowerCase(), createdAt: new Date() })
      categoriesCreated++
    }
  }
  console.log(`  disease categories: ${categoriesCreated} created, ${categoriesKept} already present`)

  console.log("\nSeeding complete ✔")
  console.log("─".repeat(50))
  console.log("Demo accounts (password: " + SEED_PASSWORD + "):")
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(10)} ${u.email}`)
  }
  console.log("─".repeat(50))

  await client.close()
}

main().catch((err) => {
  console.error("Seeding failed:", err)
  process.exit(1)
})
