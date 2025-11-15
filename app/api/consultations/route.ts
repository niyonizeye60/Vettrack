export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { getConsultations } from "@/lib/actions"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const farmerId = searchParams.get('farmerId')

    console.log('Consultations API called with:', { doctorId, farmerId })

    const consultations = await getConsultations(doctorId || undefined, farmerId || undefined)
    
    console.log('Consultations API returning:', consultations.length, 'consultations')
    
    return NextResponse.json(consultations)
  } catch (error) {
    console.error("Consultations API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}