export const dynamic = "force-dynamic"

import TransactionsTable from "@/components/admin/transactions-table"

export default function AdminTransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payment Transactions</h1>
        <p className="text-gray-600 mt-2">
          Track and monitor all payment transactions — including IntouchPay (Mobile Money) and Pesapal (Card) payments.
        </p>
      </div>
      <TransactionsTable />
    </div>
  )
}
