"use client"

import AdminAppointments from "@/components/admin/admin-appointments"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AdminAppointmentsPage() {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('admin.appointmentManagement')}</h1>
        <p className="text-gray-600 mt-2">{t('admin.manageAppointmentsDoctorAvailability')}</p>
      </div>
      <AdminAppointments />
    </div>
  )
}