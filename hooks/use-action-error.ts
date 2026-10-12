import { useCallback } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { localizeError } from "@/lib/error-messages"

// The location gate (components/livestock/location-gate.tsx) already explains these in
// its own dialog - a toast on top would say the same thing twice.
const LOCATION_GATE_CODES = new Set(["SECTOR_MISMATCH", "LOCATION_REQUIRED"])

/**
 * Error toast for a failed save or delete. Pass the response, or null when the request
 * never got one (connection dropped) - the server's message is shown when it sent one,
 * the generic "try again" otherwise.
 */
export function useActionError() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  return useCallback(
    async (res: Response | null) => {
      const body = res ? await res.clone().json().catch(() => null) : null
      if (LOCATION_GATE_CODES.has(body?.code)) return
      toast({
        title: t("common.error"),
        description: localizeError(body?.error, language) || t("farmer.actionFailed"),
        variant: "destructive",
      })
    },
    [t, language, toast]
  )
}
