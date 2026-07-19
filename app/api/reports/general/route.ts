export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

const DB = "ntdm_animal_hospital"

interface LedgerEntry {
  date: string
  label: string
  description: string
  amount: number
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(startDate + "T00:00:00")
  const end = new Date(endDate + "T00:00:00")
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
}

function buildWeeklyCashFlow(startDate: string, endDate: string, income: LedgerEntry[], expense: LedgerEntry[]) {
  const buckets: { weekStart: string; weekEnd: string; income: number; expense: number; net: number }[] = []
  const cursor = new Date(startDate + "T00:00:00")
  const end = new Date(endDate + "T00:00:00")

  while (cursor <= end) {
    const weekStart = cursor.toISOString().split("T")[0]
    const weekEndDate = new Date(cursor)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    const weekEnd = (weekEndDate > end ? end : weekEndDate).toISOString().split("T")[0]
    buckets.push({ weekStart, weekEnd, income: 0, expense: 0, net: 0 })
    cursor.setDate(cursor.getDate() + 7)
  }

  const addToBucket = (entries: LedgerEntry[], key: "income" | "expense") => {
    for (const entry of entries) {
      const bucket = buckets.find(b => entry.date >= b.weekStart && entry.date <= b.weekEnd)
      if (bucket) bucket[key] += entry.amount
    }
  }
  addToBucket(income, "income")
  addToBucket(expense, "expense")
  buckets.forEach(b => { b.net = b.income - b.expense })

  return buckets
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })
    if (!startDate || !endDate) return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const dateRange = { $gte: startDate, $lte: endDate }

    const [milkRecords, animalTransactions, wasteRecords, inseminationRecords, treatmentDoses, employeePayments] = await Promise.all([
      db.collection("milk_records").find({ farmerId, date: dateRange }).toArray(),
      db.collection("animal_transactions").find({ farmerId, date: dateRange }).toArray(),
      db.collection("waste_records").find({ farmerId, date: dateRange }).toArray(),
      db.collection("insemination_records").find({ farmerId, date: dateRange }).toArray(),
      db.collection("treatment_doses").find({ farmerId, date: dateRange }).toArray(),
      db.collection("employee_payments").find({ farmerId, paymentDate: dateRange }).toArray(),
    ])

    // ---- Income ----
    const milkSales = milkRecords.reduce((s, r) => s + (r.totalAmount || 0), 0)
    const livestockSales = animalTransactions.filter(t => t.transactionType === "sale").reduce((s, t) => s + (t.amount || 0), 0)
    const byProductSales = wasteRecords.reduce((s, r) => s + (r.totalAmount || 0), 0)
    const totalIncome = milkSales + livestockSales + byProductSales

    // ---- Expenses ----
    const inseminationCosts = inseminationRecords.reduce((s, r) => s + (r.semenPrice || 0) + (r.vetPrice || 0), 0)
    const veterinaryHealth = treatmentDoses.reduce((s, d) => s + (d.totalCost || 0), 0)
    const labourWages = employeePayments.reduce((s, p) => s + (p.amount || 0), 0)
    const livestockPurchases = animalTransactions.filter(t => t.transactionType === "purchase").reduce((s, t) => s + (t.amount || 0), 0)
    const feedWaterCosts = milkRecords.reduce((s, r) => s + (r.foodCost || 0) + (r.saltCost || 0), 0)
    const totalExpenses = inseminationCosts + veterinaryHealth + labourWages + livestockPurchases + feedWaterCosts

    const netResult = totalIncome - totalExpenses

    // ---- Ledgers ----
    const incomeLedger: LedgerEntry[] = []
    milkRecords.filter(r => (r.totalAmount || 0) > 0).forEach(r => incomeLedger.push({
      date: r.date, label: "Milk Sales", description: `${r.cowName || "Animal"} - ${r.session || ""}`.trim(), amount: r.totalAmount || 0
    }))
    animalTransactions.filter(t => t.transactionType === "sale").forEach(t => incomeLedger.push({
      date: t.date, label: "Livestock Sale", description: `${t.animalName}${t.quantity > 1 ? ` x${t.quantity}` : ""}`, amount: t.amount || 0
    }))
    wasteRecords.filter(r => (r.totalAmount || 0) > 0).forEach(r => incomeLedger.push({
      date: r.date, label: "By-product Sale", description: r.wasteType || "Waste", amount: r.totalAmount || 0
    }))
    incomeLedger.sort((a, b) => b.date.localeCompare(a.date))

    const expenseLedger: LedgerEntry[] = []
    inseminationRecords.filter(r => (r.semenPrice || 0) + (r.vetPrice || 0) > 0).forEach(r => expenseLedger.push({
      date: r.date, label: "Insemination Costs", description: r.animalName || "Insemination", amount: (r.semenPrice || 0) + (r.vetPrice || 0)
    }))
    treatmentDoses.filter(d => (d.totalCost || 0) > 0).forEach(d => expenseLedger.push({
      date: d.date, label: "Veterinary & Health", description: `${d.animalName || "Animal"}${d.diseaseName ? ` - ${d.diseaseName}` : ""}`, amount: d.totalCost || 0
    }))
    employeePayments.forEach(p => expenseLedger.push({
      date: p.paymentDate, label: "Labour / Wages", description: p.employeeName || "Employee", amount: p.amount || 0
    }))
    animalTransactions.filter(t => t.transactionType === "purchase").forEach(t => expenseLedger.push({
      date: t.date, label: "Livestock Purchases", description: `${t.animalName}${t.quantity > 1 ? ` x${t.quantity}` : ""}`, amount: t.amount || 0
    }))
    milkRecords.filter(r => (r.foodCost || 0) + (r.saltCost || 0) > 0).forEach(r => expenseLedger.push({
      date: r.date, label: "Feed & Water Costs", description: r.cowName || "Animal", amount: (r.foodCost || 0) + (r.saltCost || 0)
    }))
    expenseLedger.sort((a, b) => b.date.localeCompare(a.date))

    // ---- Cash flow (weekly) ----
    const cashFlow = buildWeeklyCashFlow(startDate, endDate, incomeLedger, expenseLedger)

    // ---- Feed & water sub-report ----
    const totalFeedKg = milkRecords.reduce((s, r) => s + (r.foodKg || 0), 0)
    const totalFeedCost = milkRecords.reduce((s, r) => s + (r.foodCost || 0), 0)
    const totalWaterLiters = milkRecords.reduce((s, r) => s + (r.waterLiters || 0), 0)
    const totalSaltKg = milkRecords.reduce((s, r) => s + (r.saltKg || 0), 0)
    const totalSaltCost = milkRecords.reduce((s, r) => s + (r.saltCost || 0), 0)
    const totalMilkLiters = milkRecords.reduce((s, r) => s + (r.liters || 0), 0)
    const distinctAnimals = new Set(milkRecords.map(r => r.cowId).filter(Boolean)).size
    const rangeDays = daysBetween(startDate, endDate)
    const foodTypesUsed = Array.from(new Set(
      milkRecords.flatMap(r => (r.foodType ? String(r.foodType).split(",").map((f: string) => f.trim()).filter(Boolean) : []))
    ))

    const feedWater = {
      totalFeedKg, totalFeedCost, totalWaterLiters, totalSaltKg, totalSaltCost,
      totalCost: feedWaterCosts,
      costPerAnimalPerDay: distinctAnimals > 0 ? feedWaterCosts / (distinctAnimals * rangeDays) : 0,
      costPerLitreMilk: totalMilkLiters > 0 ? feedWaterCosts / totalMilkLiters : 0,
      foodTypesUsed,
    }

    return NextResponse.json({
      range: { startDate, endDate },
      income: { milkSales, livestockSales, byProductSales, total: totalIncome },
      expenses: { inseminationCosts, veterinaryHealth, labourWages, livestockPurchases, feedWaterCosts, total: totalExpenses },
      netResult,
      incomeLedger,
      expenseLedger,
      cashFlow,
      feedWater,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
