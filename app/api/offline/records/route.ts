export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import type { Db, Document } from "mongodb"
import clientPromise, { withDbRetry } from "@/lib/db"
import { getOfflineFarmer } from "@/lib/offline-farmer"
import { isFarmLocationRestrictionEnabled } from "@/lib/farm-location-restriction"
import { sectorCoordinates } from "@/lib/rwanda-coordinates"
import { gadmSectorName } from "@/lib/rwanda-geo"

const DB = "ntdm_animal_hospital"
// Enough for day-to-day work on the farm, without filling up the phone.
const MILK_DAYS = 90
const MAX_RECORDS = 1000

/**
 * The farmer's records for the copy kept on their phone, which public/offline.html
 * shows when there's no connection. components/pwa/offline-records-sync.tsx saves it.
 *
 * 401 and 403 tell the phone to delete its copy, so they only ever mean "signed out"
 * or "not allowed". A database error is a 500, and the copy stays. The ETag lets the
 * phone check often: when nothing has changed, the reply is an empty 304.
 */
export async function GET(request: NextRequest) {
  try {
    const db = (await clientPromise).db(DB)
    const farmer = await getOfflineFarmer(db, ["name", "isTestAccount", "district", "sector"])
    if (farmer.status !== 200) return refuse(farmer.status)
    const { user, session } = farmer

    const [records, location] = await Promise.all([loadRecords(db, user._id.toString()), locationRule(user)])
    const body = JSON.stringify({
      userId: user._id.toString(),
      name: user.name || "",
      // The copy is shown no longer than the sign-in it came from would last.
      expiresAt: session.expiresAt,
      location,
      ...records,
    })

    const etag = `"${createHash("sha1").update(body).digest("base64url")}"`
    const headers = { ETag: etag, "Cache-Control": "private, no-store" }
    // A proxy that compresses the reply may have turned it into a weak W/"..." tag.
    if (request.headers.get("if-none-match")?.replace(/^W\//, "") === etag) {
      return new NextResponse(null, { status: 304, headers })
    }
    return new NextResponse(body, { headers: { ...headers, "Content-Type": "application/json" } })
  } catch (error) {
    console.error("Error loading offline records:", error)
    return NextResponse.json({ error: "Failed to load records" }, { status: 500 })
  }
}

function refuse(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "Unauthorized" : "Forbidden" },
    { status, headers: { "Cache-Control": "private, no-store" } }
  )
}

/**
 * What the phone needs to apply the on-farm location rule (verifyOnFarmLocation in
 * lib/farm-access.ts) to a health record made with no connection: every sector centre,
 * in the order lib/geofence.ts compares them, and which one is the farm's. The nearest
 * centre has to be the farm's, as on the server. The server checks again when the
 * record arrives, so this only spares the farmer a record that would be refused.
 */
async function locationRule(user: Document) {
  const district = typeof user.district === "string" ? user.district.trim() : ""
  const sector = typeof user.sector === "string" ? user.sector.trim() : ""
  // The same accounts and farms the server lets through without a location.
  if (user.isTestAccount || !district || !sector || !(await isFarmLocationRestrictionEnabled())) {
    return { required: false }
  }

  const farmSector = gadmSectorName(district, sector) ?? sector
  const centres: [number, number][] = []
  let farm = -1
  for (const [d, sectors] of Object.entries(sectorCoordinates)) {
    for (const [s, point] of Object.entries(sectors)) {
      if (d === district && s === farmSector) farm = centres.length
      centres.push([point.lat, point.lng])
    }
  }
  return { required: true, sector, farm, centres }
}

async function loadRecords(db: Db, farmerId: string) {
  const since = new Date(Date.now() - MILK_DAYS * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const find = (collection: string, query: Document, sort: Document, fields: string[]) =>
    withDbRetry(() =>
      db.collection(collection)
        .find(query, { projection: Object.fromEntries(fields.map((field) => [field, 1])) })
        .sort(sort)
        .limit(MAX_RECORDS)
        .toArray()
    ).then((docs) => docs.map(({ _id, ...doc }) => ({ id: _id.toString(), ...doc })))

  const [animals, milk, diseases, doses, vaccinations, inseminations, calves, calfWeights] = await Promise.all([
    // Same owner match as getAnimals in lib/actions.ts, legacy shapes included.
    find(
      "animals",
      { $or: [{ ownerId: farmerId }, { "owner._id": farmerId }, { owner: farmerId }] },
      { name: 1 },
      ["name", "type", "breed", "class", "gender", "earTagId", "insuranceId", "status", "lactationStatus", "weight"]
    ),
    find(
      "milk_records",
      { farmerId, date: { $gte: since } },
      { date: -1, createdAt: -1 },
      ["date", "session", "cowId", "cowName", "liters", "soldLiters", "homeConsumption"]
    ),
    find(
      "disease_records",
      { farmerId },
      { diagnosedDate: -1, createdAt: -1 },
      ["animalId", "animalName", "diseaseName", "symptoms", "treatment", "diagnosedDate", "resolvedDate", "status", "veterinarianName"]
    ),
    find(
      "treatment_doses",
      { farmerId },
      { date: -1, session: 1 },
      ["diseaseRecordId", "animalId", "date", "session", "medicines.medicineName", "medicines.doseCount", "medicines.volumeMl", "medicines.injectionSite"]
    ),
    find(
      "vaccination_records",
      { farmerId },
      { date: -1, createdAt: -1 },
      // subject*: an animal or a calf. Older records name an animal with animalId.
      ["subjectType", "subjectId", "subjectName", "animalId", "animalName", "vaccineName", "diseasePrevented", "date", "dose", "doseUnit", "route", "vaccinator", "nextVaccinationDate"]
    ),
    find(
      "insemination_records",
      { farmerId },
      { date: -1, createdAt: -1 },
      ["animalId", "animalName", "date", "semenTypes", "vetName", "expectedBirthDate", "deliveredBabies", "pregnancyFailed"]
    ),
    find(
      "calves",
      { farmerId },
      { createdAt: -1 },
      ["name", "motherAnimalId", "motherName", "gender", "breed", "birthDate", "birthWeight", "status"]
    ),
    find("calf_weights", { farmerId }, { date: -1, createdAt: -1 }, ["calfId", "weight", "date"]),
  ])

  return { animals, milk, diseases, doses, vaccinations, inseminations, calves, calfWeights }
}
