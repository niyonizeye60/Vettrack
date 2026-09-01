"use client"

import LoginForm from "@/components/auth/login-form"
import Image from "next/image"
import { useLanguage } from "@/contexts/LanguageContext"

export default function LoginContent() {
  const { t } = useLanguage()
  
  return (
    <div className="min-h-screen flex pt-20">
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y293c3xlbnwwfHwwfHx8MA%3D%3D"
          alt="Veterinarian with animals"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
          <div className="p-12 max-w-md">
            <h1 className="text-4xl font-bold text-white mb-6">{t('auth.welcomeBack')}</h1>
            <p className="text-white/90 text-lg">
              {t('auth.loginWelcomeDesc')}
            </p>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}