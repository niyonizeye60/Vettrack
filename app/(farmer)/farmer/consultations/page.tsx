export const dynamic = "force-dynamic";

import type { Metadata } from "next"
import { getConsultations, getDoctorsList, getAnimals } from "@/lib/actions"
import { getCurrentUser } from "@/lib/actions/auth"
import { redirect } from "next/navigation"
import ConsultationsContent from "./components/consultations-content"

export const metadata: Metadata = {
  title: "My Consultations - Farmer Dashboard",
  description: "Manage your veterinary consultations.",
}

const CONSULTATIONS_PAGE_SIZE = 10

interface ConsultationsSearchParams {
  action?: string
  page?: string
  status?: string
  animalId?: string
  doctor?: string
  month?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: string
}

export default async function FarmerConsultationsPage({
  searchParams,
}: {
  searchParams: ConsultationsSearchParams
}) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "farmer") {
    redirect("/login")
  }

  const farmerId = currentUser._id.toString()
  const requestedPage = Math.max(1, parseInt(searchParams.page || "1", 10) || 1)

  const validSortBy = ["date", "status", "createdAt"] as const
  const validSortOrder = ["asc", "desc"] as const

  const filters = {
    status: searchParams.status || "",
    animalId: searchParams.animalId || "",
    doctor: searchParams.doctor || "",
    month: searchParams.month || "",
    startDate: searchParams.month ? "" : (searchParams.startDate || ""),
    endDate: searchParams.month ? "" : (searchParams.endDate || ""),
    sortBy: (validSortBy as readonly string[]).includes(searchParams.sortBy || "") ? searchParams.sortBy! : "createdAt",
    sortOrder: (validSortOrder as readonly string[]).includes(searchParams.sortOrder || "") ? searchParams.sortOrder! : "desc",
  }

  const [consultationsResult, doctors, allAnimals] = await Promise.all([
    getConsultations(undefined, farmerId, {
      withDocuments: true,
      page: requestedPage,
      limit: CONSULTATIONS_PAGE_SIZE,
      status: filters.status || undefined,
      animalId: filters.animalId || undefined,
      doctor: filters.doctor || undefined,
      month: filters.month || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      sortBy: filters.sortBy as "date" | "status" | "createdAt",
      sortOrder: filters.sortOrder as "asc" | "desc",
    }),
    getDoctorsList(),
    getAnimals(farmerId),
  ])

  const { consultations, pagination } = consultationsResult as {
    consultations: any[]
    pagination: { page: number; pageSize: number; total: number; totalPages: number }
  }

  if (pagination.total > 0 && requestedPage > pagination.totalPages) {
    const params = new URLSearchParams()
    if (filters.status) params.set("status", filters.status)
    if (filters.animalId) params.set("animalId", filters.animalId)
    if (filters.doctor) params.set("doctor", filters.doctor)
    if (filters.month) params.set("month", filters.month)
    if (filters.startDate) params.set("startDate", filters.startDate)
    if (filters.endDate) params.set("endDate", filters.endDate)
    if (filters.sortBy !== "createdAt") params.set("sortBy", filters.sortBy)
    if (filters.sortOrder !== "desc") params.set("sortOrder", filters.sortOrder)
    params.set("page", String(pagination.totalPages))
    redirect(`/farmer/consultations?${params.toString()}`)
  }

  const sickAnimals = allAnimals.filter(a => a.status === 'Sick')

  return (
    <ConsultationsContent
      consultations={consultations}
      pagination={pagination}
      filters={filters}
      animals={allAnimals}
      doctors={doctors}
      farmerId={farmerId}
      sickAnimals={sickAnimals}
      openAdd={searchParams.action === "add"}
      farmerName={currentUser.name || ""}
      farmerPhone={currentUser.phone || ""}
    />
  )
}
