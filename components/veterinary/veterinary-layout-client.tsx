"use client"

import { useSessionTimeout } from "@/hooks/useSessionTimeout"

export default function VeterinaryLayoutClient({ children }: { children: React.ReactNode }) {
  const sessionModal = useSessionTimeout()
  
  return (
    <>
      {sessionModal}
      {children}
    </>
  )
}