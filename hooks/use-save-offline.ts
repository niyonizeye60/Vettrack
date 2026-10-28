import { useCallback } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { saveOffline, type OutboxKind } from "@/components/pwa/offline-outbox"

/**
 * For a farmer's new record that couldn't be saved because the connection dropped:
 * keeps it on the phone to be sent later (components/pwa/offline-outbox.ts) and says
 * so. Resolves to false when it can't be kept - a vet, or no copy of the farmer's
 * records on this phone yet - so the form shows its usual connection error instead.
 */
export function useSaveOffline() {
  const { t } = useLanguage()
  const { toast } = useToast()
  return useCallback(
    async (kind: OutboxKind, body: Record<string, any>) => {
      const kept = await saveOffline(kind, body)
      if (kept) toast({ title: t("offline.savedOnPhone"), description: t("offline.savedOnPhoneDesc") })
      return kept
    },
    [t, toast]
  )
}
