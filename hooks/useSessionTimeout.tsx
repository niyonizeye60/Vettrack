"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertModal } from "@/components/ui/AlertModal"

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_TIME = 5 * 60 * 1000 // 5 minutes before timeout

export function useSessionTimeout() {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  const handleExtendSession = () => {
    setShowWarning(false)
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let warningId: NodeJS.Timeout
    let countdownId: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(timeoutId)
      clearTimeout(warningId)
      clearInterval(countdownId)
      setShowWarning(false)

      // Set warning timer
      warningId = setTimeout(() => {
        setShowWarning(true)
        setTimeLeft(WARNING_TIME / 1000)

        // Start countdown
        countdownId = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              handleTimeout()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }, SESSION_TIMEOUT - WARNING_TIME)

      // Set logout timer
      timeoutId = setTimeout(handleTimeout, SESSION_TIMEOUT)
    }

    const handleTimeout = async () => {
      try {
        await fetch('/api/logout', { method: 'POST' })
      } catch (error) {
        console.error('Logout error:', error)
      }
      
      document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
      router.push('/login')
    }

    const handleActivity = () => {
      if (!showWarning) {
        resetTimer()
      }
    }

    // Activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    resetTimer()

    return () => {
      clearTimeout(timeoutId)
      clearTimeout(warningId)
      clearInterval(countdownId)
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [router, showWarning])

  // Reset timer when extending session
  useEffect(() => {
    if (!showWarning) {
      // Timer will be reset by the activity handler
    }
  }, [showWarning])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <AlertModal
      isOpen={showWarning}
      onClose={handleExtendSession}
      title="Session Expiring"
      message={`Your session will expire in ${formatTime(timeLeft)}. Click OK to extend your session.`}
      type="warning"
    />
  )
}