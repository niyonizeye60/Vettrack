import AdminReports from "@/components/admin/admin-reports"
import TranslatedText from "@/components/translated-text"

export const dynamic = 'force-dynamic'

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900"><TranslatedText k="adminPages.reportsTitle" /></h1>
        <p className="text-gray-600 mt-2"><TranslatedText k="adminPages.reportsDesc" /></p>
      </div>
      <AdminReports />
    </div>
  )
}