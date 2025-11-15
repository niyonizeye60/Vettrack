"use client"

import { useState, useEffect } from "react"
import AddAnimalForm from "@/components/dashboard/add-animal-form"
import { getCurrentUser } from "@/lib/actions/auth"
import { redirect } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AddAnimalPage() {
  const { t } = useLanguage()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await getCurrentUser()
        if (!user || user.role !== "farmer") {
          redirect("/login")
          return
        }
        setCurrentUser(user)
      } catch (error) {
        redirect("/login")
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])
  
  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }
  
  if (!currentUser) {
    return null
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('farmer.registerNewAnimal')}</h1>
      <AddAnimalForm userId={currentUser._id.toString()} />
    </div>
  )
}
