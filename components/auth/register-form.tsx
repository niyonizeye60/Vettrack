"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { registerUser, loginUser } from "@/lib/actions/auth"
import { Home, CheckCircle, Mail } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

type UserRole = "farmer" | "doctor" | "admin" | "superadmin"

export default function RegisterForm() {
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
  const [passwordError, setPasswordError] = useState("")
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const router = useRouter()
  const { t } = useLanguage()

  const validatePasswords = () => {
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return false
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setPasswordError("")

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
      if (role === "doctor") {
        formData.append("licenseNumber", licenseNumber)
        formData.append("specialization", specialization)
      } else if (role === "farmer") {
        formData.append("district", district)
        formData.append("sector", sector)
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
      setPasswordError(error instanceof Error ? error.message : "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <Card className="w-full">
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
                We've sent a welcome email to <strong>{email}</strong> with important information about your account and next steps.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Don't forget to check your spam/junk folder if you don't see the email in your inbox.
              </p>
            </div>

          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={() => router.push("/login")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {t('auth.continueLogin')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{t('auth.createAccount')}</CardTitle>
        <CardDescription>{t('auth.createAccountDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              {/* <div className="flex items-center space-x-2">
                <RadioGroupItem value="doctor" id="doctor" />
                <Label htmlFor="doctor" className="cursor-pointer">
                  Veterinarian
                </Label>
              </div> */}
              {/* <div className="flex items-center space-x-2">
                <RadioGroupItem value="superadmin" id="superadmin" />
                <Label htmlFor="superadmin" className="cursor-pointer">
                  Super Administrator
                </Label>
              </div> */}
            </RadioGroup>
          </div>

          {/* Conditional fields based on role */}
          {role === "doctor" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  placeholder="VET-12345"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  placeholder="e.g., Large Animal Medicine"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {role === "farmer" && (
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

          <div className="flex items-center space-x-2">
            <Checkbox id="terms" required />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
          </Button>
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
      <CardFooter className="flex flex-col">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">{t('auth.orContinueWith')}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Button variant="outline" type="button">
            Google
          </Button>
          <Button variant="outline" type="button">
            {t('auth.phoneNumber')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}