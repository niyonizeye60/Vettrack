export const dynamic = "force-dynamic";

import React from "react";
import VetSidebar from "./components/vet-sidebar";
import VetHeader from "./components/vet-header";
import { MobileSidebarProvider } from "./components/mobile-sidebar-context";

export default function VeterinaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <VetSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <VetHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}
