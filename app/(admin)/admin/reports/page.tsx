import AdminReports from "@/components/admin/admin-reports"

export const dynamic = 'force-dynamic'

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-2">View regional performance and usage statistics</p>
      </div>
      <AdminReports />
    </div>
  )
}