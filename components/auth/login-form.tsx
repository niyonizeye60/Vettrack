"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { loginUser } from "@/lib/actions/auth"
import { useLanguage } from "@/contexts/LanguageContext"
import { localizeError } from "@/lib/error-messages"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t, language } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("email", email)
      formData.append("password", password)

      const result = await loginUser(formData)

      if (!result.success) {
        setError(localizeError(result.message, language) || t("auth.signInFailed"))
        return
      }

      // Handle redirect after successful login
      if (result.redirectPath) {
        router.push(result.redirectPath)
      }
    } catch (error) {
      // Reaching here means the action never returned a result at all - the
      // browser is offline, the request was dropped, or the server crashed and
      // Next.js replaced the reason with an opaque digest. None of those read
      // as anything useful to the user, so they never get shown.
      console.error("Login error:", error)
      setError(t("auth.serverUnreachable"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('nav.login')}</CardTitle>
        <CardDescription>{t('auth.loginDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('common.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? t('auth.loggingIn') : t('nav.login')}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          {t('auth.noAccount')}{" "}
          <Link href="/register" className="text-primary hover:underline">
            {t('auth.registerHere')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
