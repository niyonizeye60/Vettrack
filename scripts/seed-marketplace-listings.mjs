/**
 * Seed script: inserts realistic marketplace listings (animals, drugs, feeds)
 * with district/sector + coordinates derived from the app's own geo resolver,
 * so search-by-location has data to work with.
 *
 * Run: npx tsx scripts/seed-marketplace-listings.mjs
 * (Safe to re-run: skips districts that already have listings.)
 */
import { MongoClient } from "mongodb"
import { resolveLocation } from "../lib/rwanda-geo.ts"

process.loadEnvFile?.(".env")
if (!process.env.MONGODB_URI) throw new Error("Missing required environment variable: MONGODB_URI")

// --- seed data ---------------------------------------------------------------
const animals = [
  { name: "Friesian Dairy Cow - 12L/day", animalType: "Cow", breed: "Friesian", age: "3 years", sex: "Female", price: 850000, district: "Musanze", sector: "Muhoza", desc: "Healthy Friesian cow in milk, 12 liters per day. De-wormed and vaccinated. Selling due to herd reduction." },
  { name: "Jersey Bull Calf", animalType: "Cow", breed: "Jersey", age: "6 months", sex: "Male", price: 250000, district: "Nyagatare", sector: "Nyagatare", desc: "Strong Jersey bull calf, bottle-fed and weaned. Ready to grow into a breeding bull." },
  { name: "Boer Goat - Breeding Male", animalType: "Goat", breed: "Boer", age: "1.5 years", sex: "Male", price: 120000, district: "Kamonyi", sector: "Musambira", desc: "Pure Boer buck, excellent for crossbreeding. Very healthy and docile." },
  { name: "Local Sheep Flock (5 head)", animalType: "Sheep", breed: "Local", age: "2 years", sex: "Female", price: 320000, district: "Bugesera", sector: "Nyamata", desc: "Five healthy ewes sold together. Grazed on open pasture, regular deworming." },
  { name: "Kienyeji Chicken - Laying Hens (10)", animalType: "Chicken", breed: "Kienyeji", age: "8 months", sex: "Female", price: 55000, district: "Huye", sector: "Tumba", desc: "Ten improved kienyeji hens already laying. Feed with layers mash." },
  { name: "Large White Pig - Pregnant Sow", animalType: "Pig", breed: "Large White", age: "1 year", sex: "Female", price: 280000, district: "Rwamagana", sector: "Musha", desc: "Pregnant sow, due in 6 weeks. Had 11 piglets in last farrow." },
  { name: "German Shepherd Puppy", animalType: "Dog", breed: "German Shepherd", age: "3 months", sex: "Male", price: 180000, district: "Gasabo", sector: "Kimironko", desc: "Vaccinated GSD puppy with first shots done. Both parents on site." },
  { name: "Inkembe Cow - In Calf", animalType: "Cow", breed: "Ankole", age: "4 years", sex: "Female", price: 700000, district: "Nyanza", sector: "Busasamana", desc: "Ankole cow confirmed in-calf. Traditional breed, very hardy." },
  { name: "Dorper Ram", animalType: "Sheep", breed: "Dorper", age: "1 year", sex: "Male", price: 150000, district: "Kayonza", sector: "Mukarange", desc: "Dorper ram for flock improvement. Fast growth, good meat conformation." },
  { name: "Hybrid Goat Does (3)", animalType: "Goat", breed: "Boer x Local", age: "10 months", sex: "Female", price: 210000, district: "Ruhango", sector: "Mwendo", desc: "Three crossbred does ready for breeding. Twin-bearing bloodline." },
  { name: "Broiler Chickens - Ready (50)", animalType: "Chicken", breed: "Cobb 500", age: "6 weeks", sex: "Female", price: 350000, district: "Rubavu", sector: "Gisenyi", desc: "Fifty broilers at dressing weight. Selling as a batch to restaurants." },
  { name: "Holstein Heifer - Pregnant", animalType: "Cow", breed: "Holstein", age: "2 years", sex: "Female", price: 1100000, district: "Gatsibo", sector: "Nyagihanga", desc: "AI-served Holstein heifer, 5 months pregnant. From a high-yield dam." },
]

const drugs = [
  { name: "Oxytetracycline 20% LA - 100ml", drugType: "Antibiotic", price: 12000, usage: "Broad-spectrum antibiotic for cattle, goats and sheep. Long-acting injection.", district: "Kigali", sector: null, useDistrictOfListing: "Gasabo", useSector: "Kacyiru" },
  { name: "Newcastle Vaccine - 500 doses", drugType: "Vaccine", price: 22000, usage: "For immunization of poultry against Newcastle disease. Administer via drinking water.", district: "Musanze", sector: null, useDistrictOfListing: "Musanze", useSector: "Cyuve" },
  { name: "Albendazole Dewormer - 1L", drugType: "Dewormer", price: 8000, usage: "Broad-spectrum dewormer for roundworms, tapeworms and flukes in livestock.", district: "Huye", sector: null, useDistrictOfListing: "Huye", useSector: "Mbazi" },
  { name: "Meloxicam Pain Relief - 50ml", drugType: "Pain Relief", price: 9500, usage: "Non-steroidal anti-inflammatory for fever and pain in cattle and pigs.", district: "Rubavu", sector: null, useDistrictOfListing: "Rubavu", useSector: "Kanzenze" },
  { name: "Multivitamin Stress Pack", drugType: "Vitamins", price: 6000, usage: "Vitamin supplement for animals under stress: transport, weaning, heat.", district: "Nyagatare", sector: null, useDistrictOfListing: "Nyagatare", useSector: "Mimuri" },
  { name: "Ivermectin Injection - 50ml", drugType: "Dewormer", price: 14000, usage: "Controls mange, lice and internal parasites in cattle, goats and pigs.", district: "Rusizi", sector: null, useDistrictOfListing: "Rusizi", useSector: "Kamembe" },
]

const feeds = [
  { name: "Dairy Meal 25kg Bag", feedType: "Concentrates", quality: "High", target: "Cattle", price: 21000, district: "Nyagatare", sector: "Mimuri", desc: "High-energy dairy concentrate for milking cows. Feeding rate 2kg per 10L of milk." },
  { name: "Layers Mash 25kg", feedType: "Concentrates", quality: "High", target: "Poultry", price: 19500, district: "Gasabo", sector: "Kinyinya", desc: "Complete layers feed with calcium for strong eggshells. Feeds 25 hens for ~2 weeks." },
  { name: "Broiler Finisher 25kg", feedType: "Concentrates", quality: "High", target: "Poultry", price: 20000, district: "Rubavu", sector: "Nyakiriba", desc: "Finisher feed for broilers week 4 to market. Fast weight gain." },
  { name: "Chloris Hay Bale", feedType: "Hay", quality: "Medium", target: "Cattle", price: 4500, district: "Bugesera", sector: "Mayange", desc: "Sun-dried chloris gayana hay, baled at flowering. Good roughage for dry season." },
  { name: "Goat Mineral Lick 2kg", feedType: "Minerals", quality: "High", target: "Goats", price: 5500, district: "Muhanga", sector: "Kabacuzi", desc: "Mineral block with zinc and selenium formulated for goats." },
  { name: "Pig Grower Mash 25kg", feedType: "Concentrates", quality: "Medium", target: "Pigs", price: 18500, district: "Rwamagana", sector: "Munyiginya", desc: "Balanced grower feed for pigs 30-60kg. Improves daily gain." },
]

const categories = { sales: "695c1a72c6ea79190d15e5f9", drugs: null, feeds: null }

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db = client.db("ntdm_animal_hospital")
  const services = db.collection("services")

  // Look up real category ids per type
  const catDocs = await db.collection("categories").find({}).toArray()
  const catByType = {}
  for (const c of catDocs) catByType[c.type] = c._id.toString()

  const docs = []
  for (const a of animals) {
    const coords = resolveLocation(a.district, a.sector)
    docs.push({
      name: a.name, description: a.desc, price: a.price, duration: "per animal",
      category: "sales", categoryId: catByType.sales ?? null, image: null,
      animalType: a.animalType, breed: a.breed, age: a.age, sex: a.sex,
      district: a.district, sector: a.sector, village: null,
      latitude: coords.lat, longitude: coords.lng,
      listingStatus: "active", seeded: true, createdAt: new Date(),
    })
  }
  for (const d of drugs) {
    const coords = resolveLocation(d.useDistrictOfListing, d.useSector)
    docs.push({
      name: d.name, description: d.usage, price: d.price, duration: "per unit",
      category: "drugs", categoryId: catByType.drugs ?? null, image: null,
      drugType: d.drugType, usageDescription: d.usage,
      district: d.useDistrictOfListing, sector: d.useSector, village: null,
      latitude: coords.lat, longitude: coords.lng,
      listingStatus: "active", seeded: true, createdAt: new Date(),
    })
  }
  for (const f of feeds) {
    const coords = resolveLocation(f.district, f.sector)
    docs.push({
      name: f.name, description: f.desc, price: f.price, duration: "per bag",
      category: "feeds", categoryId: catByType.feeds ?? null, image: null,
      feedType: f.feedType, quality: f.quality, targetAnimal: f.target,
      district: f.district, sector: f.sector, village: null,
      latitude: coords.lat, longitude: coords.lng,
      listingStatus: "active", seeded: true, createdAt: new Date(),
    })
  }

  // Keep existing seeded listings in sync with this catalog, including prices.
  let inserted = 0, skipped = 0
  for (const doc of docs) {
    const exists = await services.findOne({ name: doc.name, seeded: true })
    if (exists) {
      await services.updateOne(
        { _id: exists._id },
        { $set: { price: doc.price, updatedAt: new Date() } },
      )
      skipped++
    } else {
      await services.insertOne(doc)
      inserted++
    }
  }

  console.log(`Inserted ${inserted} listings, updated ${skipped} existing seeded listings`)
  const counts = await services.aggregate([{ $group: { _id: "$category", n: { $sum: 1 } } }]).toArray()
  console.log("services by category:", JSON.stringify(counts))
  const withCoords = await services.countDocuments({ latitude: { $exists: true } })
  const total = await services.countDocuments({})
  console.log(`listings with coordinates: ${withCoords}/${total}`)

  await client.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
