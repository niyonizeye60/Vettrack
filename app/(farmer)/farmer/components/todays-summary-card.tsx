"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatRwf } from "@/lib/finance-period"
import type { FarmDayStats } from "@/lib/farm-day-summary"
import type { ActivitySummaryGroup } from "@/lib/activity-summary"
import {
  ClipboardList, Droplets, TrendingUp, TrendingDown, HeartPulse, Baby, Stethoscope,
  Mail, ChevronDown, ArrowRight, Wallet, type LucideIcon,
} from "lucide-react"

interface DailySummary {
  date: string
  totalCount: number
  groups: ActivitySummaryGroup[]
  stats: FarmDayStats | null
}

const EMPTY_SUMMARY: DailySummary = { date: "", totalCount: 0, groups: [], stats: null }

const STATUS_KEYS: Record<string, string> = {
  pending: "farmer.pending",
  accepted: "farmer.accepted",
  rejected: "farmer.rejected",
}

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
}

/** Same convention as the dashboard's monthly P&L widget: losses in brackets. */
function formatSigned(amount: number) {
  return amount < 0 ? `(${formatRwf(Math.abs(amount))})` : formatRwf(amount)
}

function formatLiters(liters: number) {
  return `${liters.toLocaleString()} L`
}

function StatTile({ href, icon: Icon, iconClass, label, value, sub, subClass, empty }: {
  href: string
  icon: LucideIcon
  iconClass: string
  label: string
  value: string
  sub: string
  subClass?: string
  empty: boolean
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 bg-white p-3 sm:p-4 hover:border-green-600 hover:shadow-md transition-all min-w-0"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs sm:text-sm text-gray-500 font-medium">{label}</p>
        <div className={`rounded-lg p-1.5 flex-shrink-0 ${iconClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className={`text-lg sm:text-2xl font-bold mt-1 truncate ${empty ? "text-gray-300" : "text-gray-900"}`}>{value}</p>
      <p className={`text-xs mt-0.5 truncate ${subClass ?? "text-gray-400"}`}>{sub}</p>
    </Link>
  )
}

function Section({ icon: Icon, title, href, linkLabel, children }: {
  icon: LucideIcon
  title: string
  href: string
  linkLabel: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Icon className="h-4 w-4 text-green-600" />
          {title}
        </p>
        <Link href={href} className="flex items-center gap-0.5 text-xs text-green-700 hover:underline flex-shrink-0">
          {linkLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-1.5 text-xs">{children}</div>
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-right ${valueClass ?? "text-gray-800"}`}>{value}</span>
    </div>
  )
}

function Event({ tag, tagClass, children }: { tag: string; tagClass: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 ${tagClass}`}>{tag}</span>
      <span className="text-gray-700 pt-px">{children}</span>
    </div>
  )
}

export default function TodaysSummaryCard({ consultations }: { consultations: any[] }) {
  const { t } = useLanguage()
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [showLog, setShowLog] = useState(false)

  useEffect(() => {
    async function fetchDailySummary() {
      try {
        const res = await fetch(`/api/farmer/daily-summary`)
        const data = res.ok ? await res.json() : null
        setSummary(data && Array.isArray(data.groups)
          ? { date: data.date ?? "", totalCount: data.totalCount, groups: data.groups, stats: data.stats ?? null }
          : EMPTY_SUMMARY)
      } catch {
        setSummary(EMPTY_SUMMARY)
      }
    }
    fetchDailySummary()
  }, [])

  const nothingYet = t("farmer.summaryNothingYet")
  const stats = summary?.stats ?? null

  // Visits booked for today, from the consultations the page already loaded.
  const visitsToday = summary?.date
    ? consultations
        .filter((c) => c.date === summary.date && c.status !== "rejected")
        .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")))
    : []

  const milk = stats?.milk
  const finance = stats?.finance
  const health = stats?.health
  const breeding = stats?.breeding

  const hasMilk = !!milk && milk.liters > 0
  const hasMoney = !!finance && (finance.incomeLines.length > 0 || finance.expenseLines.length > 0)
  const healthCount = health
    ? health.newCases.length + health.recovered.length + health.vaccinations.length + health.treatments.length
    : 0
  const hasBreeding = !!breeding && breeding.inseminations.length + breeding.calvesBorn.length > 0
  const hasDetails = hasMilk || hasMoney || healthCount > 0 || hasBreeding || visitsToday.length > 0
  const hasAnything = hasDetails || (summary?.groups.length ?? 0) > 0

  // Milk tile: today's total, compared with the same sessions yesterday.
  let milkSub = nothingYet
  let milkSubClass: string | undefined
  if (milk && hasMilk) {
    const diff = Math.round((milk.liters - milk.yesterdayLiters) * 10) / 10
    if (milk.yesterdayLiters === 0) {
      milkSub = t("farmer.summaryCowsMilkedCount").replace("{count}", String(milk.cowsMilked))
    } else if (diff === 0) {
      milkSub = t("farmer.summarySameAsYesterday")
    } else {
      milkSub = `${diff > 0 ? "▲" : "▼"} ${formatLiters(Math.abs(diff))} ${t("farmer.summaryVsYesterday")}`
      milkSubClass = diff > 0 ? "text-green-600" : "text-red-600"
    }
  }

  const healthParts = health
    ? [
        health.newCases.length && t("farmer.summaryNewCasesCount").replace("{count}", String(health.newCases.length)),
        health.vaccinations.length && t("farmer.summaryVaccinatedCount").replace("{count}", String(health.vaccinations.length)),
        health.treatments.length && t("farmer.summaryTreatedCount").replace("{count}", String(health.treatments.length)),
        health.recovered.length && t("farmer.summaryRecoveredCount").replace("{count}", String(health.recovered.length)),
      ].filter(Boolean)
    : []

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold text-gray-900">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-green-600" />
            {t("farmer.todaysSummary")}
          </div>
          {!!summary?.totalCount && (
            <Badge variant="secondary" className="text-xs">{summary.totalCount} {t("farmer.actionsToday")}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {summary === null ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-[92px] rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
            <div className="h-[100px] rounded-lg bg-gray-100 animate-pulse" />
          </>
        ) : (
          <>
            {/* Headline figures for the day */}
            {stats && milk && finance && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile
                  href="/farmer/milk"
                  icon={Droplets}
                  iconClass="bg-sky-50 text-sky-600"
                  label={t("farmer.summaryMilkToday")}
                  value={formatLiters(milk.liters)}
                  sub={milkSub}
                  subClass={milkSubClass}
                  empty={!hasMilk}
                />
                <StatTile
                  href="/farmer/reports"
                  icon={TrendingUp}
                  iconClass="bg-green-50 text-green-600"
                  label={t("farmer.summaryIncomeToday")}
                  value={formatRwf(finance.income)}
                  sub={hasMoney ? `${t("farmer.summaryNet")}: ${formatSigned(finance.net)}` : nothingYet}
                  subClass={hasMoney ? (finance.net > 0 ? "text-green-600" : finance.net < 0 ? "text-red-600" : undefined) : undefined}
                  empty={finance.income === 0}
                />
                <StatTile
                  href="/farmer/reports"
                  icon={TrendingDown}
                  iconClass="bg-red-50 text-red-600"
                  label={t("farmer.summaryExpensesToday")}
                  value={formatRwf(finance.expense)}
                  sub={finance.expenseLines[0]
                    ? t("farmer.summaryMostly").replace("{item}", t(`farmer.${finance.expenseLines[0].key}`))
                    : nothingYet}
                  empty={finance.expense === 0}
                />
                <StatTile
                  href={health && (health.newCases.length || health.treatments.length) ? "/farmer/diseases" : "/farmer/vaccination"}
                  icon={HeartPulse}
                  iconClass="bg-rose-50 text-rose-600"
                  label={t("farmer.summaryHealthToday")}
                  value={String(healthCount)}
                  sub={healthParts.length ? healthParts.join(" · ") : nothingYet}
                  empty={healthCount === 0}
                />
              </div>
            )}

            {/* What happened, section by section */}
            {hasDetails ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {hasMilk && milk && (
                  <Section icon={Droplets} title={t("farmer.milkProduction")} href="/farmer/milk" linkLabel={t("farmer.viewDetails")}>
                    {milk.bySession.map((s) => (
                      <Row
                        key={s.session}
                        label={s.session === "Morning" ? t("farmer.morning") : s.session === "Evening" ? t("farmer.evening") : s.session}
                        value={formatLiters(s.liters)}
                      />
                    ))}
                    <Row label={t("farmer.summaryCowsMilked")} value={String(milk.cowsMilked)} />
                    {milk.cowsMilked > 0 && (
                      <Row label={t("farmer.summaryAvgPerCow")} value={formatLiters(Math.round((milk.liters / milk.cowsMilked) * 10) / 10)} />
                    )}
                    {milk.soldLiters > 0 && <Row label={t("farmer.summaryMilkSold")} value={formatLiters(milk.soldLiters)} />}
                    {milk.homeLiters > 0 && <Row label={t("farmer.homeUse")} value={formatLiters(milk.homeLiters)} />}
                  </Section>
                )}

                {hasMoney && finance && (
                  <Section icon={Wallet} title={t("farmer.summaryMoneyInOut")} href="/farmer/reports" linkLabel={t("farmer.viewFullReport")}>
                    {finance.incomeLines.map((line) => (
                      <Row key={line.key} label={t(`farmer.${line.key}`)} value={`+${formatRwf(line.amount)}`} valueClass="text-green-700" />
                    ))}
                    {finance.expenseLines.map((line) => (
                      <Row key={line.key} label={t(`farmer.${line.key}`)} value={`−${formatRwf(line.amount)}`} valueClass="text-red-700" />
                    ))}
                    <div className="border-t border-gray-100 pt-1.5">
                      <Row
                        label={t("farmer.summaryNet")}
                        value={formatSigned(finance.net)}
                        valueClass={`font-semibold ${finance.net > 0 ? "text-green-700" : finance.net < 0 ? "text-red-700" : "text-gray-800"}`}
                      />
                    </div>
                  </Section>
                )}

                {healthCount > 0 && health && (
                  <Section
                    icon={HeartPulse}
                    title={t("farmer.summaryHealthSection")}
                    href={health.newCases.length || health.treatments.length ? "/farmer/diseases" : "/farmer/vaccination"}
                    linkLabel={t("farmer.viewDetails")}
                  >
                    {health.newCases.map((c, i) => (
                      <Event key={`case-${i}`} tag={t("farmer.summaryNewCase")} tagClass="bg-red-50 text-red-700">
                        <span className="font-medium text-gray-900">{c.disease}</span>{c.animal && ` — ${c.animal}`}
                      </Event>
                    ))}
                    {health.treatments.map((tr, i) => (
                      <Event key={`treat-${i}`} tag={t("farmer.summaryTreated")} tagClass="bg-amber-50 text-amber-700">
                        <span className="font-medium text-gray-900">{tr.animal || "—"}</span>
                        {tr.disease && ` — ${tr.disease}`}
                        {` · ${t("farmer.summaryDosesCount").replace("{count}", String(tr.doses))}`}
                      </Event>
                    ))}
                    {health.vaccinations.map((v, i) => (
                      <Event key={`vacc-${i}`} tag={t("farmer.summaryVaccinated")} tagClass="bg-sky-50 text-sky-700">
                        <span className="font-medium text-gray-900">{v.vaccine}</span>
                        {v.subject && ` — ${v.subject}`}
                        {v.isCalf && ` (${t("farmer.summaryCalf")})`}
                      </Event>
                    ))}
                    {health.recovered.map((c, i) => (
                      <Event key={`rec-${i}`} tag={t("farmer.summaryRecovered")} tagClass="bg-green-50 text-green-700">
                        <span className="font-medium text-gray-900">{c.animal || "—"}</span>{` — ${c.disease}`}
                      </Event>
                    ))}
                  </Section>
                )}

                {hasBreeding && breeding && (
                  <Section
                    icon={Baby}
                    title={t("farmer.summaryBreedingSection")}
                    href={breeding.calvesBorn.length ? "/farmer/calves" : "/farmer/insemination"}
                    linkLabel={t("farmer.viewDetails")}
                  >
                    {breeding.calvesBorn.map((c, i) => (
                      <Event key={`calf-${i}`} tag={t("farmer.summaryCalfBorn")} tagClass="bg-green-50 text-green-700">
                        <span className="font-medium text-gray-900">{c.name}</span>
                        {c.mother && ` — ${t("farmer.summaryOfMother").replace("{name}", c.mother)}`}
                      </Event>
                    ))}
                    {breeding.inseminations.map((ins, i) => (
                      <Event key={`ins-${i}`} tag={t("farmer.summaryInseminated")} tagClass="bg-violet-50 text-violet-700">
                        <span className="font-medium text-gray-900">{ins.animal || "—"}</span>
                      </Event>
                    ))}
                  </Section>
                )}

                {visitsToday.length > 0 && (
                  <Section icon={Stethoscope} title={t("farmer.summaryVetVisits")} href="/farmer/consultations" linkLabel={t("farmer.viewDetails")}>
                    {visitsToday.map((c) => (
                      <div key={c._id} className="flex items-start justify-between gap-2">
                        <span className="text-gray-700">
                          {c.time && <span className="font-medium text-gray-900">{c.time} · </span>}
                          {c.service}
                          {c.animalName && ` — ${c.animalName}`}
                          {c.doctor && c.doctor !== "Unassigned" && <span className="text-gray-400"> · Dr. {c.doctor}</span>}
                        </span>
                        <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${STATUS_CLASSES[c.status] ?? "bg-sky-50 text-sky-700 border-sky-200"}`}>
                          {STATUS_KEYS[c.status] ? t(STATUS_KEYS[c.status]) : c.status}
                        </Badge>
                      </div>
                    ))}
                  </Section>
                )}
              </div>
            ) : !hasAnything && (
              <div className="py-4 flex flex-col items-center text-center">
                <ClipboardList className="h-9 w-9 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600">{t("farmer.noActivityToday")}</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">{t("farmer.activityTodayWillAppear")}</p>
              </div>
            )}

            {/* Everything the farmer did today, including edits and non-farm actions */}
            {summary.groups.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLog((v) => !v)}
                  aria-expanded={showLog}
                  className="flex w-full items-center justify-between gap-2 text-sm font-medium text-gray-700 hover:text-green-700"
                >
                  <span className="flex items-center gap-2">
                    {showLog ? t("farmer.summaryHideLog") : t("farmer.summaryShowLog")}
                    <Badge variant="outline" className="text-xs">{summary.totalCount}</Badge>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showLog ? "rotate-180" : ""}`} />
                </button>
                {showLog && (
                  <div className="mt-3 space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {summary.groups.map((group) => (
                      <div key={group.key ?? group.category} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            {group.key ? t(`farmer.activityCat.${group.key}`) : group.category}
                          </p>
                          <Badge variant="outline" className="text-xs">{group.count}</Badge>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {group.items.map((item, i) => (
                            <div key={i} className="flex items-start justify-between gap-2 text-xs">
                              <span className="text-gray-600">
                                <span className="font-medium text-gray-800">{item.label}</span>
                                {item.details ? `: ${item.details}` : ""}
                              </span>
                              <span className="text-gray-400 flex-shrink-0">
                                {new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {hasAnything && (
              <p className="flex items-center gap-1.5 text-xs text-gray-400">
                <Mail className="h-3.5 w-3.5" />
                {t("farmer.emailedAt730")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
