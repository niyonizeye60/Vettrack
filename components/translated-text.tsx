"use client"

import { useLanguage } from "@/contexts/LanguageContext"

/**
 * Translated text for server components. The reader's language lives in the browser
 * (LanguageContext), so a server component can't call t() itself - it renders this.
 */
export default function TranslatedText({ k }: { k: string }) {
  const { t } = useLanguage()
  return <>{t(k)}</>
}
