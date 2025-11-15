// @ts-ignore
import FarmerSidebar from "./components/farmer-sidebar";
import React from "react";
import FarmerHeader from "./components/farmer-header";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import UserStatusChecker from "./components/user-status-checker";

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <UserStatusChecker />
      <FarmerSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <FarmerHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export const metadata = {
  metadataBase: new URL('https://vettrack.rw'),
  // ...other metadata
} 