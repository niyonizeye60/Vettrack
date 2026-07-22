'use client';

// This is a client wrapper component to help with component boundary issues
export default function ClientWrapper({ children }) {
  return <>{children}</>;
} 