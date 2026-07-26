"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { reportClientError } from "@/lib/actions"

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientError(error.message, error.stack).catch(() => {})
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-sm text-gray-500">
          An unexpected error occurred. It's been logged and we'll take a look.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" onClick={() => { window.location.href = "/" }}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}
