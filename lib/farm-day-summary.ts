import type { Db } from "mongodb"
import { loadFarmPnl } from "./farm-pnl"
import { shiftDateString } from "./activity-summary"

/**
 * What actually happened on the farm on one day, read from the records themselves
 * rather than the activity log - so it includes records a delegated vet entered on
 * the farmer's behalf, and an edited record counts once at its final value.
 */
export interface FarmDayStats {
  milk: {
    liters: number
    /**
     * Yesterday's milk for only the sessions already logged today, so a morning-only
     * day isn't compared against yesterday's morning + evening.
     */
    yesterdayLiters: number
    soldLiters: number
    homeLiters: number
    cowsMilked: number
    bySession: { session: string; liters: number }[]
  }
  finance: {
    income: number
    expense: number
    net: number
    /** Keys match the report's income/expenses fields, so `farmer.<key>` translates them. */
    incomeLines: { key: string; amount: number }[]
    expenseLines: { key: string; amount: number }[]
  }
  health: {
    newCases: { animal: string | null; disease: string }[]
    recovered: { animal: string | null; disease: string }[]
    vaccinations: { subject: string | null; vaccine: string; isCalf: boolean }[]
    treatments: { animal: string | null; disease: string | null; doses: number }[]
  }
  breeding: {
    inseminations: { animal: string | null }[]
    calvesBorn: { name: string; mother: string | null; gender: string | null }[]
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10

function nonZeroLines(entries: [string, number][]) {
  return entries
    .filter(([key, amount]) => key !== "total" && amount > 0)
    .map(([key, amount]) => ({ key, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export async function buildFarmDayStats(db: Db, farmerId: string, date: string): Promise<FarmDayStats> {
  const yesterday = shiftDateString(date, -1)

  const [pnl, yesterdayMilk, newCases, recovered, calvesBorn] = await Promise.all([
    loadFarmPnl(db, farmerId, date, date),
    db.collection("milk_records").find({ farmerId, date: yesterday }, { projection: { liters: 1, session: 1 } }).toArray(),
    db.collection("disease_records").find({ farmerId, diagnosedDate: date }, { projection: { animalName: 1, diseaseName: 1 } }).toArray(),
    db.collection("disease_records").find({ farmerId, resolvedDate: date }, { projection: { animalName: 1, diseaseName: 1 } }).toArray(),
    db.collection("calves").find({ farmerId, birthDate: date }, { projection: { name: 1, motherName: 1, gender: 1 } }).toArray(),
  ])
  const { milkRecords, vaccinationRecords, treatmentDoses, inseminationRecords } = pnl.records

  const sessionTotals = new Map<string, number>()
  for (const r of milkRecords) {
    const session = r.session || "Other"
    sessionTotals.set(session, (sessionTotals.get(session) || 0) + (r.liters || 0))
  }

  // A treatment course is logged one dose per session, so collapse doses into one
  // line per animal and case.
  const treatmentsByCase = new Map<string, FarmDayStats["health"]["treatments"][number]>()
  for (const d of treatmentDoses) {
    const caseKey = `${d.animalId}:${d.diseaseRecordId}`
    const existing = treatmentsByCase.get(caseKey)
    if (existing) existing.doses++
    else treatmentsByCase.set(caseKey, { animal: d.animalName || null, disease: d.diseaseName || null, doses: 1 })
  }

  return {
    milk: {
      liters: round1(milkRecords.reduce((s, r) => s + (r.liters || 0), 0)),
      yesterdayLiters: round1(
        yesterdayMilk.filter((r) => sessionTotals.has(r.session || "Other")).reduce((s, r) => s + (r.liters || 0), 0)
      ),
      soldLiters: round1(milkRecords.reduce((s, r) => s + (r.soldLiters || 0), 0)),
      homeLiters: round1(milkRecords.reduce((s, r) => s + (r.homeConsumption || 0), 0)),
      cowsMilked: new Set(milkRecords.map((r) => r.cowId).filter(Boolean)).size,
      // Morning before Evening, whatever order they were logged in.
      bySession: Array.from(sessionTotals.entries())
        .map(([session, liters]) => ({ session, liters: round1(liters) }))
        .sort((a, b) => (a.session === "Morning" ? -1 : b.session === "Morning" ? 1 : a.session.localeCompare(b.session))),
    },
    finance: {
      income: pnl.income.total,
      // Same as the dashboard's monthly P&L widget: expected loss is still money out.
      expense: pnl.expenses.total + pnl.expectedLoss.total,
      net: pnl.netResult,
      incomeLines: nonZeroLines(Object.entries(pnl.income)),
      expenseLines: nonZeroLines([...Object.entries(pnl.expenses), ["milkingSuppliesCosts", pnl.expectedLoss.milkingSuppliesCosts]]),
    },
    health: {
      newCases: newCases.map((r) => ({ animal: r.animalName || null, disease: r.diseaseName })),
      recovered: recovered.map((r) => ({ animal: r.animalName || null, disease: r.diseaseName })),
      vaccinations: vaccinationRecords.map((r) => ({ subject: r.subjectName || null, vaccine: r.vaccineName, isCalf: r.subjectType === "calf" })),
      treatments: Array.from(treatmentsByCase.values()),
    },
    breeding: {
      inseminations: inseminationRecords.map((r) => ({ animal: r.animalName || null })),
      calvesBorn: calvesBorn.map((c) => ({ name: c.name, mother: c.motherName || null, gender: c.gender || null })),
    },
  }
}
