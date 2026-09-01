"use client"

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatRwf } from "@/lib/finance-period"
import {
  INCOME_SOURCE_COLORS,
  INCOME_SOURCE_LABEL_KEYS,
  isBrokered,
  type IncomeSource,
} from "@/lib/income-sources"

export interface SourceTotal {
  sourceType: IncomeSource
  grossAmount: number
  platformRevenue: number
  count: number
}

/**
 * Income split across the six sources, as a chart and as numbers.
 *
 * Both are always shown. Beyond being what the spec asks for, the numbers are what
 * make the lighter bars readable - the palette's lighter slots sit under 3:1 against
 * white, and the rule for that is that values must be legible as text too.
 */
export default function SourceBreakdown({
  sources,
  total,
  showChart = true,
}: {
  sources: SourceTotal[]
  total: number
  showChart?: boolean
}) {
  const { t } = useLanguage()

  const data = sources.map((row) => ({
    ...row,
    label: t(INCOME_SOURCE_LABEL_KEYS[row.sourceType]),
  }))

  const hasAny = total > 0

  return (
    <div className="space-y-5">
      {showChart && (
        <div className="w-full" style={{ height: Math.max(200, data.length * 44) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 4 }}>
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis
                type="category"
                dataKey="label"
                width={132}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                formatter={(value: number) => [formatRwf(value), t("finance.revenue")]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="platformRevenue"
                radius={[0, 4, 4, 0]}
                barSize={16}
                isAnimationActive={false}
                label={{
                  position: "right",
                  formatter: (value: number) => (value > 0 ? formatRwf(value) : ""),
                  fill: "#374151",
                  fontSize: 11,
                }}
              >
                {data.map((row) => (
                  <Cell key={row.sourceType} fill={INCOME_SOURCE_COLORS[row.sourceType]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[30rem]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-4 font-medium">{t("finance.source")}</th>
              <th className="py-2 pr-4 font-medium text-right">{t("finance.transactions")}</th>
              <th className="py-2 pr-4 font-medium text-right">{t("finance.grossValue")}</th>
              <th className="py-2 font-medium text-right">{t("finance.revenue")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.sourceType} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-4">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                      style={{ background: INCOME_SOURCE_COLORS[row.sourceType] }}
                    />
                    <span className="text-gray-900">{row.label}</span>
                  </span>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-gray-600">{row.count}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-gray-600">
                  {/* For a brokered animal the gross is what buyer and seller settled
                      between themselves - it never reached Vettrack. */}
                  {row.grossAmount > 0 ? formatRwf(row.grossAmount) : "—"}
                  {isBrokered(row.sourceType) && row.grossAmount > 0 && (
                    <span className="block text-[11px] text-gray-400">{t("finance.offPlatform")}</span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums font-medium text-gray-900">
                  {formatRwf(row.platformRevenue)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td className="py-2 pr-4 font-medium text-gray-900">{t("finance.total")}</td>
              <td className="py-2 pr-4" />
              <td className="py-2 pr-4" />
              <td className="py-2 text-right tabular-nums font-bold text-gray-900">{formatRwf(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!hasAny && <p className="text-sm text-gray-500">{t("finance.noIncomeYet")}</p>}
    </div>
  )
}
