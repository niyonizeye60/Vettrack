"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/LanguageContext"
import { PERIOD_PRESETS, PERIOD_LABEL_KEYS, type DateRange, type PeriodPreset } from "@/lib/finance-period"

/**
 * The period control every finance page shares. Filters sit in one row above the
 * content rather than beside each figure.
 */
export default function PeriodSelector({
  preset,
  custom,
  onPresetChange,
  onCustomChange,
}: {
  preset: PeriodPreset
  custom: DateRange
  onPresetChange: (preset: PeriodPreset) => void
  onCustomChange: (range: DateRange) => void
}) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-56">
        <Select value={preset} onValueChange={(v) => onPresetChange(v as PeriodPreset)}>
          <SelectTrigger aria-label={t("finance.period")}><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_PRESETS.map((value) => (
              <SelectItem key={value} value={value}>{t(PERIOD_LABEL_KEYS[value])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === "custom" && (
        <>
          <Input
            type="date"
            className="w-auto"
            aria-label={t("finance.from")}
            value={custom.from}
            onChange={(e) => onCustomChange({ ...custom, from: e.target.value })}
          />
          <Input
            type="date"
            className="w-auto"
            aria-label={t("finance.to")}
            value={custom.to}
            onChange={(e) => onCustomChange({ ...custom, to: e.target.value })}
          />
        </>
      )}
    </div>
  )
}
