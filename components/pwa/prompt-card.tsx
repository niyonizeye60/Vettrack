"use client"

import Image from "next/image"
import { X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface PromptCardProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

/** The card the install and alerts prompts show at the bottom of the screen. */
export default function PromptCard({ title, onClose, children }: PromptCardProps) {
  const { t } = useLanguage()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1100] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] print:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-md items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {children}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="-mr-1 -mt-1 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
