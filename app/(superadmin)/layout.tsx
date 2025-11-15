import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import SuperAdminSidebar from "@/components/superadmin/super-admin-sidebar"
import SuperAdminHeader from "@/components/superadmin/super-admin-header"
import SuperAdminLayoutClient from "@/components/superadmin/superadmin-layout-client"

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== "superadmin") {
    redirect("/login")
  }

  return (
    <SuperAdminLayoutClient>
      <div className="min-h-screen bg-gray-50">
        {/* Header - Responsive height and padding */}
        <header className="sticky top-0 left-0 right-0 h-14 sm:h-16 bg-white border-b border-gray-200 z-50 shadow-sm">
          <SuperAdminHeader user={user} />
        </header>

        <div className="flex">
          {/* Desktop Sidebar - Hidden on mobile/tablet */}
          <aside className="hidden lg:flex fixed left-0 top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] w-64 xl:w-72 bg-white border-r border-gray-200 z-40 overflow-y-auto">
            <SuperAdminSidebar />
          </aside>

          {/* Main Content - Responsive margins and padding */}
          <main className="flex-1 w-full lg:ml-64 xl:ml-72">
            {/* Content wrapper with responsive padding */}
            <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-full overflow-x-hidden">
              {/* Content container with max width for very large screens */}
              <div className="mx-auto max-w-7xl">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SuperAdminLayoutClient>
  )
}