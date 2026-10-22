"use client"

import TransactionsTable from "@/components/admin/transactions-table"
import { useLanguage } from "@/contexts/LanguageContext"

export default function SuperAdminTransactionsPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('superadmin.paymentTransactions')}</h1>
        <p className="text-gray-600 mt-2">{t('superadmin.paymentTransactionsDesc')}</p>
      </div>
      <TransactionsTable />
    </div>
  )
}
