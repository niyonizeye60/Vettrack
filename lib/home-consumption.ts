import clientPromise from "./db"

const DB = "ntdm_animal_hospital"

export interface HomeConsumptionBalance {
  totalRecorded: number
  totalConsumedByCalves: number
  balance: number
}

/**
 * Single source of truth for the home-consumption milk balance: recomputed from the
 * underlying milk_records/calf_expenses documents rather than cached, so the Milk
 * Production and Calves pages can never drift out of sync with each other.
 */
export async function getHomeConsumptionBalance(farmerId: string): Promise<HomeConsumptionBalance> {
  const client = await clientPromise
  const db = client.db(DB)

  const [milkAgg, calfAgg] = await Promise.all([
    db.collection("milk_records").aggregate([
      { $match: { farmerId } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$homeConsumption", 0] } } } },
    ]).toArray(),
    db.collection("calf_expenses").aggregate([
      { $match: { farmerId, expenseType: "milk" } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$milkLiters", 0] } } } },
    ]).toArray(),
  ])

  const totalRecorded = milkAgg[0]?.total || 0
  const totalConsumedByCalves = calfAgg[0]?.total || 0
  const balance = Math.max(0, totalRecorded - totalConsumedByCalves)

  return { totalRecorded, totalConsumedByCalves, balance }
}
