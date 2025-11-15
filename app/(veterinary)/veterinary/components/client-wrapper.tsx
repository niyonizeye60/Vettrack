"use client";

// This is a client wrapper component to help with component boundary issues
export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 