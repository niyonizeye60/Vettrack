import { useState, useEffect } from 'react'

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: string
  image: string
  category: string
  species?: string
}

interface ServicesData {
  sales: Service[]
  drugs: Service[]
  feeds: Service[]
}

export function useServices() {
  const [services, setServices] = useState<ServicesData>({
    sales: [],
    drugs: [],
    feeds: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchServices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/services')
      if (!response.ok) throw new Error('Failed to fetch services')
      const data = await response.json()
      setServices(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  return {
    services,
    loading,
    error,
    refetch: fetchServices
  }
}