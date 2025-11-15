"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertModal } from "@/components/ui/AlertModal"

export function useUserStatus() {
  const router = useRouter()
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const response = await fetch('/api/user-status')
        const data = await response.json()
        
        if (data.status === 'suspended') {
          setShowAlert(true)
        }
      } catch (error) {
        console.error('Error checking user status:', error)
      }
    }

    const interval = setInterval(checkUserStatus, 30000)
    checkUserStatus()

    return () => clearInterval(interval)
  }, [router])

  const handleAlertClose = async () => {
    setShowAlert(false)
    
    // Clear session cookie and redirect
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    
    // Call logout API to clean up server session
    try {
      await fetch('/api/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    router.push('/login')
  }

  return (
    <AlertModal
      isOpen={showAlert}
      onClose={handleAlertClose}
      title="Account Suspended"
      message="Your account has been suspended. Please contact the administrator for assistance."
      type="error"
    />
  )
}