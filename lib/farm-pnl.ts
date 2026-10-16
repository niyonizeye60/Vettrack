import type { Db } from "mongodb"

/**
 * The farm profit & loss rules, shared by the Reports page (app/api/reports/general)
 * and the dashboard's Today's Summary (app/api/farmer/daily-summary) so "today's
 * income" on the dashboard can never drift from what the report says for the same day.
 *
 * Dates are the yyyy-mm-dd strings the records were entered with, inclusive.
 */
export async function loadFarmPnl(db: Db, farmerId: string, startDate: string, endDate: string) {
  const dateRange = { $gte: startDate, $lte: endDate }

  const [milkRecords, animalTransactions, wasteRecords, inseminationRecords, vaccinationRecords, treatmentDoses, employeePayments, calfExpenses, milkingExpenses, animalExpenses] = await Promise.all([
    db.collection("milk_records").find({ farmerId, date: dateRange }).toArray(),
    db.collection("animal_transactions").find({ farmerId, date: dateRange }).toArray(),
    db.collection("waste_records").find({ farmerId, date: dateRange }).toArray(),
    db.collection("insemination_records").find({ farmerId, date: dateRange }).toArray(),
    db.collection("vaccination_records").find({ farmerId, date: dateRange }).toArray(),
    db.collection("treatment_doses").find({ farmerId, date: dateRange }).toArray(),
    db.collection("employee_payments").find({ farmerId, paymentDate: dateRange }).toArray(),
    db.collection("calf_expenses").find({ farmerId, date: dateRange }).toArray(),
    db.collection("milking_expenses").find({ farmerId, date: dateRange }).toArray(),
    db.collection("animal_expenses").find({ farmerId, date: dateRange }).toArray(),
  ])

  // ---- Income ----
  const milkSales = milkRecords.reduce((s, r) => s + (r.totalAmount || 0), 0)
  const livestockSales = animalTransactions.filter(t => t.transactionType === "sale").reduce((s, t) => s + (t.amount || 0), 0)
  const byProductSales = wasteRecords.reduce((s, r) => s + (r.totalAmount || 0), 0)
  const totalIncome = milkSales + livestockSales + byProductSales

  // ---- Expenses ----
  const inseminationCosts = inseminationRecords.reduce((s, r) => s + (r.semenPrice || 0) + (r.vetPrice || 0), 0)
  // Kept separate from veterinaryHealth: that line is treatment of animals that fell
  // ill, whereas vaccination is preventive spend the farmer chooses to budget.
  const vaccinationCosts = vaccinationRecords.reduce((s, r) => s + (r.vaccinePrice || 0) + (r.vetPrice || 0), 0)
  const veterinaryHealth = treatmentDoses.reduce((s, d) => s + (d.totalCost || 0), 0)
  const labourWages = employeePayments.reduce((s, p) => s + (p.amount || 0), 0)
  const livestockPurchases = animalTransactions.filter(t => t.transactionType === "purchase").reduce((s, t) => s + (t.amount || 0), 0)
  const feedWaterCosts = milkRecords.reduce((s, r) => s + (r.foodCost || 0) + (r.saltCost || 0), 0)
  const calfRearingCosts = calfExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  // Feed/water/health/misc costs for animals outside the milking flow (dry cows,
  // males, etc.) - milking animals already get feed/water cost via feedWaterCosts.
  const animalExpenseCosts = animalExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalExpenses = inseminationCosts + vaccinationCosts + veterinaryHealth + labourWages + livestockPurchases + feedWaterCosts + calfRearingCosts + animalExpenseCosts

  // ---- Expected Loss ----
  // Milking supplies (washing drugs, milking oil) are consumable overhead spent
  // regardless of output - tracked separately from operating "Expenses" so the
  // P&L can show them as an anticipated, budgeted loss rather than a variable cost.
  const washingDrugsCost = milkingExpenses.filter(e => e.expenseType === "washing_drugs").reduce((s, e) => s + (e.amount || 0), 0)
  const milkingOilCost = milkingExpenses.filter(e => e.expenseType === "milking_oil").reduce((s, e) => s + (e.amount || 0), 0)
  const milkingSuppliesCosts = washingDrugsCost + milkingOilCost
  const totalExpectedLoss = milkingSuppliesCosts

  const netResult = totalIncome - totalExpenses - totalExpectedLoss

  return {
    records: { milkRecords, animalTransactions, wasteRecords, inseminationRecords, vaccinationRecords, treatmentDoses, employeePayments, calfExpenses, milkingExpenses, animalExpenses },
    income: { milkSales, livestockSales, byProductSales, total: totalIncome },
    expectedLoss: { milkingSuppliesCosts, washingDrugsCost, milkingOilCost, total: totalExpectedLoss },
    expenses: { inseminationCosts, vaccinationCosts, veterinaryHealth, labourWages, livestockPurchases, feedWaterCosts, calfRearingCosts, animalExpenseCosts, total: totalExpenses },
    netResult,
  }
}
