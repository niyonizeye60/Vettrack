"use client"

import RegisterForm from "@/components/auth/register-form"
import Image from "next/image"
import { useLanguage } from "@/contexts/LanguageContext"

export default function RegisterContent() {
  const { t } = useLanguage()
  
  return (
    <div className="min-h-screen flex pt-20">
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="https://images.unsplash.com/photo-1760895071337-4aac90164c56?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDI1fHx8ZW58MHx8fHx8"
          alt="Veterinarian with animals"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
          <div className="p-12 max-w-md">
            <h1 className="text-4xl font-bold text-white mb-6">{t('auth.joinNTDM')}</h1>
            <p className="text-white/90 text-lg">
              {t('auth.registerWelcomeDesc')}
            </p>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}