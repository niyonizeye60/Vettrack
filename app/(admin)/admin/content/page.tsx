import AdminContentManagement from "@/components/admin/admin-content-management"
import TranslatedText from "@/components/translated-text"

export const dynamic = 'force-dynamic'

export default function AdminContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900"><TranslatedText k="adminPages.contentTitle" /></h1>
        <p className="text-gray-600 mt-2"><TranslatedText k="adminPages.contentDesc" /></p>
      </div>
      <AdminContentManagement />
    </div>
  )
}