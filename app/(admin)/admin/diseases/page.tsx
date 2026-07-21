"use client"

import AdminDiseases from "@/components/admin/admin-diseases"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AdminDiseasesPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('admin.diseaseOversight')}</h1>
        <p className="text-gray-600 mt-2">{t('admin.diseaseOversightDesc')}</p>
      </div>
      <AdminDiseases />
    </div>
  )
}
