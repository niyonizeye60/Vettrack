// @ts-ignore
import FarmerSidebar from "./components/farmer-sidebar";
import React from "react";
import FarmerHeader from "./components/farmer-header";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import UserStatusChecker from "./components/user-status-checker";
import { MobileSidebarProvider } from "./components/mobile-sidebar-context";

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
        <UserStatusChecker />
        <FarmerSidebar />
        <div className="flex-1 flex flex-col min-w-0 print:block">
          <FarmerHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:p-0 print:overflow-visible">{children}</main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}

export const dynamic = "force-dynamic";

export const metadata = {
  metadataBase: new URL('https://vettrack.rw'),
  // ...other metadata
} 