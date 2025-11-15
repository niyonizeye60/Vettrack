export const dynamic = "force-dynamic";

import React from "react";

export default function VeterinaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
} 