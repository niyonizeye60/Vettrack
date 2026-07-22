"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

type ValidationState = "validating" | "valid" | "invalid"

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

export default function ResetPasswordForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [validationState, setValidationState] = useState<ValidationState>("validating")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setValidationState("invalid")
      return
    }

    let cancelled = false

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/reset-password?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (!cancelled) {
          setValidationState(data.valid ? "valid" : "invalid")
        }
      } catch (err) {
        console.error("Error validating reset token:", err)
        if (!cancelled) {
          setValidationState("invalid")
        }
      }
    }

    validateToken()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(() => router.push("/login"), 3000)
    return () => clearTimeout(timer)
  }, [isSuccess, router])

  const validatePasswords = () => {
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return false
    }
    if (password.length < 8) {
      setError(t('auth.passwordMinLength'))
      return false
    }
    if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      setError(t('auth.passwordRequirements'))
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validatePasswords()) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.message || "Failed to reset password")
      }

      setIsSuccess(true)
    } catch (err) {
      console.error("Reset password error:", err)
      setError(err instanceof Error ? err.message : "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  if (validationState === "validating") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-600">{t('auth.validatingResetLink')}</p>
        </CardContent>
      </Card>
    )
  }

  if (validationState === "invalid") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">{t('auth.invalidResetLink')}</CardTitle>
          <CardDescription>
            {token ? t('auth.resetLinkExpiredInfo') : t('auth.missingResetToken')}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button asChild className="w-full">
            <Link href="/forgot-password">{t('auth.requestNewResetLink')}</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">{t('auth.passwordResetSuccess')}</CardTitle>
          <CardDescription>{t('auth.redirectingToLogin')}</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button asChild className="w-full">
            <Link href="/login">{t('auth.goToLogin')}</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('auth.resetPassword')}</CardTitle>
        <CardDescription>{t('auth.enterNewPassword')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.newPassword')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t('auth.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('auth.resettingPassword') : t('auth.resetPassword')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
