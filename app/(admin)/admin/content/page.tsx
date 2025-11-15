import AdminContentManagement from "@/components/admin/admin-content-management"

export const dynamic = 'force-dynamic'

export default function AdminContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600 mt-2">Manage blog posts, announcements, and services</p>
      </div>
      <AdminContentManagement />
    </div>
  )
}