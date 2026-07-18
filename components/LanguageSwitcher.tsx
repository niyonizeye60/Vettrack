'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === 'en' ? 'rw' : 'en')}
      className={cn("flex items-center gap-2", className)}
    >
      <Globe className="h-4 w-4" />
      {language === 'en' ? 'RW' : 'EN'}
    </Button>
  )
}