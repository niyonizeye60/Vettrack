"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { registerUser } from "@/lib/actions/auth"
import { CheckCircle, Mail, ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

type UserRole = "farmer" | "doctor" | "admin" | "superadmin"

const TOTAL_STEPS = 3

export default function RegisterForm() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<UserRole>("farmer")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [district, setDistrict] = useState("")
  const [sector, setSector] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [stepError, setStepError] = useState("")
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const router = useRouter()
  const { t } = useLanguage()

  const validatePasswords = () => {
    if (password !== confirmPassword) {
      setPasswordError(t('auth.passwordMismatch'))
      return false
    }
    if (password.length < 6) {
      setPasswordError(t('auth.passwordTooShort'))
      return false
    }
    return true
  }

  const isStepOneValid = () => name.trim() !== "" && email.trim() !== "" && phone.trim() !== ""

  const isStepTwoValid = () => {
    if (role === "doctor" && (licenseNumber.trim() === "" || specialization.trim() === "")) {
      return false
    }
    if ((role === "farmer" || role === "doctor") && (district.trim() === "" || sector.trim() === "")) {
      return false
    }
    return true
  }

  const goToNextStep = () => {
    setStepError("")

    if (step === 1 && !isStepOneValid()) {
      setStepError(t('auth.fillRequiredFields'))
      return
    }
    if (step === 2 && !isStepTwoValid()) {
      setStepError(t('auth.fillRequiredFields'))
      return
    }

    setStep((current) => Math.min(current + 1, TOTAL_STEPS))
  }

  const goToPreviousStep = () => {
    setStepError("")
    setStep((current) => Math.max(current - 1, 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    if (!agreedToTerms) {
      setPasswordError(t('auth.mustAgreeToTerms'))
      return
    }

    setIsLoading(true)

    // Validate passwords first
    if (!validatePasswords()) {
      setIsLoading(false)
      return
    }

    try {
      // Create form data for registration
      const formData = new FormData()
      formData.append("name", name)
      formData.append("email", email)
      formData.append("password", password)
      formData.append("phone", phone)
      formData.append("role", role)
      formData.append("district", district)
      formData.append("sector", sector)
      if (role === "doctor") {
        formData.append("licenseNumber", licenseNumber)
        formData.append("specialization", specialization)
      }

      // Register the user
      const registerResult = await registerUser(formData)

      if (!registerResult.success) {
        throw new Error(registerResult.message)
      }

      // Show success message
      setRegistrationSuccess(true)
      setSuccessMessage(registerResult.message)

    } catch (error) {
      console.error("Registration error:", error)
      setPasswordError(error instanceof Error ? error.message : t('auth.registrationFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">{t('auth.accountCreated')}</CardTitle>
          <CardDescription>{t('auth.welcome')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <Mail className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>

          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              <span>{t('auth.checkEmail')}</span>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium mb-2">
                📧 {t('auth.checkEmailTitle')}
              </p>
              <p className="text-xs text-blue-700">
                {t('auth.welcomeEmailSentPrefix')} <strong>{email}</strong> {t('auth.welcomeEmailSentSuffix')}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                {t('auth.checkSpamFolder')}
              </p>
            </div>

          </div>

          <div className="flex justify-center pt-4">
            <Button onClick={() => router.push("/login")}>
              {t('auth.continueLogin')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const stepTitle = step === 1
    ? t('auth.stepPersonalInfo')
    : step === 2
      ? t('auth.stepAccountDetails')
      : t('auth.stepSecurity')

  const stepDescription = step === 1
    ? t('auth.stepPersonalInfoDesc')
    : step === 2
      ? t('auth.stepAccountDetailsDesc')
      : t('auth.stepSecurityDesc')

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{t('auth.step')} {step} {t('auth.of')} {TOTAL_STEPS}</span>
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold">{stepTitle}</CardTitle>
          <CardDescription>{stepDescription}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">{t('common.name')}</Label>
                <Input id="name" placeholder="Nkusi Jean" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('common.phone')}</Label>
                <Input
                  id="phone"
                  placeholder="+250 78 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>{t('auth.accountType')}</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as UserRole)}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="farmer" id="farmer" />
                    <Label htmlFor="farmer" className="cursor-pointer">
                      {t('auth.farmerPetOwner')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="doctor" id="doctor" />
                    <Label htmlFor="doctor" className="cursor-pointer">
                      {t('auth.veterinarian')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {role === "doctor" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">{t('auth.licenseNumber')}</Label>
                    <Input
                      id="licenseNumber"
                      placeholder="VET-12345"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialization">{t('auth.specialization')}</Label>
                    <Input
                      id="specialization"
                      placeholder="e.g., Large Animal Medicine"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {(role === "farmer" || role === "doctor") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="district">{t('auth.district')}</Label>
                    <Input
                      id="district"
                      placeholder="e.g., Kigali"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sector">{t('auth.sector')}</Label>
                    <Input
                      id="sector"
                      placeholder="e.g., Nyarugenge"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
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
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  required
                />
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('auth.agreeToTermsPrefix')}{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    {t('auth.termsOfService')}
                  </Link>{" "}
                  {t('common.and')}{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    {t('auth.privacyPolicy')}
                  </Link>
                </label>
              </div>
            </>
          )}

          {stepError && <p className="text-sm text-destructive">{stepError}</p>}

          <div className="flex items-center gap-3 pt-2">
            {step > 1 && (
              <Button type="button" variant="outline" className="flex-1" onClick={goToPreviousStep} disabled={isLoading}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('auth.back')}
              </Button>
            )}

            {step < TOTAL_STEPS ? (
              <Button type="button" className="flex-1" onClick={goToNextStep}>
                {t('auth.next')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="flex-1" disabled={isLoading || !agreedToTerms}>
                {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
              </Button>
            )}
          </div>
        </form>

        <div className="mt-4 text-center text-sm">
          <p>
            {t('auth.haveAccount')}{" "}
            <Link href="/login" className="text-primary hover:underline">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
