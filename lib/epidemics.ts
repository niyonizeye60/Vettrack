// Shared constants & types for the epidemic outbreak tracking feature.
// Kept dependency-free so both client components and API routes can import it.

export const EPIDEMIC_STATUSES = ["pending", "confirmed", "rejected", "resolved"] as const
export type EpidemicStatus = (typeof EPIDEMIC_STATUSES)[number]

export const EPIDEMIC_SEVERITIES = ["low", "medium", "high", "critical"] as const
export type EpidemicSeverity = (typeof EPIDEMIC_SEVERITIES)[number]

export const EPIDEMIC_DISEASES = [
  "Foot and Mouth Disease",
  "East Coast Fever",
  "Anthrax",
  "Blackleg",
  "Brucellosis",
  "Tuberculosis",
  "Lumpy Skin Disease",
  "Newcastle Disease",
  "Avian Influenza",
  "African Swine Fever",
  "Trypanosomiasis",
  "Rift Valley Fever",
  "Rabies",
  "Mastitis",
  "Other",
] as const

export type EpidemicCase = {
  _id: string
  farmerId: string
  farmerName: string | null
  animalId: string | null
  animalName: string | null
  animalType: string | null
  diseaseName: string
  symptoms: string | null
  affectedCount: number
  severity: EpidemicSeverity
  latitude: number
  longitude: number
  locationLabel: string | null
  district: string | null
  sector: string | null
  status: EpidemicStatus
  notes: string | null
  confirmedBy: string | null
  confirmedAt: string | null
  reportedAt: string
  createdAt: string
  updatedAt: string
}

export const EPIDEMIC_STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-gray-100 text-gray-600 border-gray-200",
}

export const EPIDEMIC_SEVERITY_STYLES: Record<string, string> = {
  low: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
}
