export const dynamic = "force-dynamic"

import { getCurrentUser } from "@/lib/actions/auth"
import { getConsultations } from "@/lib/actions"
import { redirect } from "next/navigation"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import PatientsPageClient from "./patients-page-client"

interface AnimalDetail {
  animalId: string
  name: string
  type: string
  breed: string
  status: string
}

interface Patient {
  id: string
  name: string
  phone: string
  district: string
  sector: string
  totalConsultations: number
  lastConsultation: string
  status: 'active' | 'inactive'
  animals: string[]          // unique animal types for badges
  animalDetails: AnimalDetail[]
  recentConsultations: any[]
}

export default async function VeterinaryPatientsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "doctor") {
    redirect("/login")
  }

  const consultations = await getConsultations(currentUser._id.toString())

  // Group consultations by farmer to create patient records
  const patientMap = new Map<string, Patient>()

  consultations.forEach(consultation => {
    const farmerId = consultation.farmerId
    if (!farmerId) return

    if (!patientMap.has(farmerId)) {
      patientMap.set(farmerId, {
        id: farmerId,
        name: consultation.fullName,
        phone: consultation.phoneNumber,
        district: '',
        sector: '',
        totalConsultations: 0,
        lastConsultation: consultation.createdAt,
        status: 'inactive',
        animals: [],
        animalDetails: [],
        recentConsultations: []
      })
    }

    const patient = patientMap.get(farmerId)!
    patient.totalConsultations++
    patient.recentConsultations.push(consultation)

    // Update last consultation date
    if (new Date(consultation.createdAt) > new Date(patient.lastConsultation)) {
      patient.lastConsultation = consultation.createdAt
    }

    // Collect unique animals that were actually consulted about
    const c = consultation as any
    if (c.animalId && !patient.animalDetails.some(a => a.animalId === c.animalId)) {
      patient.animalDetails.push({
        animalId: c.animalId,
        name:     c.animalName  || '',
        type:     c.animalType  || '',
        breed:    c.animalBreed || '',
        status:   'Sick',
      })
    }

    // Track unique animal types for badge display
    if (c.animalType && !patient.animals.includes(c.animalType)) {
      patient.animals.push(c.animalType)
    }
  })

  // Enrich with farmer location from users collection
  const patients: Patient[] = []
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    for (const [farmerId, patient] of patientMap) {
      const farmer = await db.collection("users").findOne({ _id: new ObjectId(farmerId) })
      if (farmer) {
        patient.district = farmer.district || ''
        patient.sector   = farmer.sector   || ''
      }

      // Active = consulted in last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      patient.status = new Date(patient.lastConsultation) > thirtyDaysAgo ? 'active' : 'inactive'

      // Sort recent consultations, keep latest 3
      patient.recentConsultations.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      patient.recentConsultations = patient.recentConsultations.slice(0, 3)

      patients.push(patient)
    }
  } catch (error) {
    console.error('Error fetching patient details:', error)
  }

  patients.sort((a, b) => new Date(b.lastConsultation).getTime() - new Date(a.lastConsultation).getTime())

  const activePatients  = patients.filter(p => p.status === 'active')
  const totalAnimals    = patients.reduce((sum, p) => sum + p.animalDetails.length, 0)

  return (
    <PatientsPageClient
      patients={patients}
      activePatients={activePatients}
      totalAnimals={totalAnimals}
      totalConsultations={consultations.length}
    />
  )
}
