"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface MobileSidebarContextValue {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(null);

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MobileSidebarContext.Provider
      value={{
        mobileOpen,
        setMobileOpen,
        toggleMobileSidebar: () => setMobileOpen((prev) => !prev),
      }}
    >
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) {
    throw new Error("useMobileSidebar must be used within MobileSidebarProvider");
  }
  return ctx;
}
