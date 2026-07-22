"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, Pill, Heart } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import ServicesBanner from "@/components/services/services-banner"
import ProductCard from "@/components/products/product-card"

interface Drug {
  id: string
  name: string
  description: string
  price: number
  duration: string
  image: string
  categoryId: string
  drugType?: string
  district?: string
  sector?: string
  village?: string
  usageDescription?: string
}

interface Category {
  id: string
  name: string
  description: string
  type: string
}

export default function PharmacyPage() {
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [filteredDrugs, setFilteredDrugs] = useState<Drug[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDrugType, setSelectedDrugType] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [wishlist, setWishlist] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('category')
  const { t } = useLanguage()

  useEffect(() => {
    fetchData()
    const savedWishlist = localStorage.getItem('pharmacy-wishlist')
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist))
    }
  }, [])

  const fetchData = async () => {
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch('/api/services?category=drugs'),
        fetch('/api/categories')
      ])
      const servicesData = await servicesRes.json()
      const categoriesData = await categoriesRes.json()
      setDrugs(servicesData)
      setFilteredDrugs(servicesData)
      setCategories(categoriesData.drugs || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...drugs]

    if (searchTerm) {
      filtered = filtered.filter(drug =>
        drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drug.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drug.drugType?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedDrugType) {
      filtered = filtered.filter(drug => drug.drugType === selectedDrugType)
    }

    if (selectedDistrict) {
      filtered = filtered.filter(drug => drug.district === selectedDistrict)
    }

    if (minPrice) {
      filtered = filtered.filter(drug => drug.price >= Number(minPrice))
    }

    if (maxPrice) {
      filtered = filtered.filter(drug => drug.price <= Number(maxPrice))
    }

    if (categoryId) {
      filtered = filtered.filter(drug => drug.categoryId === categoryId)
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    setFilteredDrugs(filtered)
  }

  const toggleWishlist = (drugId: string) => {
    const newWishlist = wishlist.includes(drugId)
      ? wishlist.filter(id => id !== drugId)
      : [...wishlist, drugId]
    setWishlist(newWishlist)
    localStorage.setItem('pharmacy-wishlist', JSON.stringify(newWishlist))
  }

  useEffect(() => {
    applyFilters()
  }, [searchTerm, selectedDrugType, selectedDistrict, minPrice, maxPrice, sortBy, drugs, categoryId])

  const currentCategory = categories.find(cat => cat.id === categoryId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom">
          <div className="text-center">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <ServicesBanner
        backHref="/services"
        title={categoryId && currentCategory ? currentCategory.name : t('pharmacy.title')}
        subtitle={categoryId && currentCategory ? currentCategory.description : t('pharmacy.subtitle')}
        image="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
      />

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom">

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('common.search') + '...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('common.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t('sort.nameAZ')}</SelectItem>
                  <SelectItem value="price-low">{t('sort.priceLow')}</SelectItem>
                  <SelectItem value="price-high">{t('sort.priceHigh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={selectedDrugType || "all"} onValueChange={(value) => setSelectedDrugType(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Drug Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="Antibiotic">Antibiotic</SelectItem>
                  <SelectItem value="Dewormer">Dewormer</SelectItem>
                  <SelectItem value="Vaccine">Vaccine</SelectItem>
                  <SelectItem value="Vitamins">Vitamins</SelectItem>
                  <SelectItem value="Pain Relief">Pain Relief</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedDistrict || "all"} onValueChange={(value) => setSelectedDistrict(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="Kigali">Kigali</SelectItem>
                  <SelectItem value="Northern">Northern</SelectItem>
                  <SelectItem value="Southern">Southern</SelectItem>
                  <SelectItem value="Eastern">Eastern</SelectItem>
                  <SelectItem value="Western">Western</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Min Price (RWF)"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />

              <Input
                placeholder="Max Price (RWF)"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4 flex justify-between items-center">
            <p className="text-gray-600">{filteredDrugs.length} {t('pharmacy.title').toLowerCase()} found</p>
            {wishlist.length > 0 && (
              <p className="text-sm text-gray-500">
                <Heart className="h-4 w-4 inline mr-1" />
                {wishlist.length} in wishlist
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrugs.map((drug) => (
              <ProductCard
                key={drug.id}
                id={drug.id}
                categoryId={drug.categoryId}
                category="drugs"
                name={drug.name}
                description={drug.description}
                image={drug.image}
                price={drug.price}
                unit={drug.duration}
                detailHref={`/pharmacy/${drug.id}`}
                badges={[{ label: t('common.inStock'), className: "bg-blue-600 text-white" }]}
                wishlisted={wishlist.includes(drug.id)}
                onToggleWishlist={() => toggleWishlist(drug.id)}
                details={[
                  ...(drug.drugType ? [{ icon: Pill, text: drug.drugType }] : []),
                  ...(drug.district
                    ? [{ icon: MapPin, text: [drug.district, drug.sector].filter(Boolean).join(', ') }]
                    : []),
                ]}
              />
            ))}
          </div>

          {filteredDrugs.length === 0 && !loading && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {t('pharmacy.notFound')}
              </h3>
              <p className="text-gray-500">
                {t('pharmacy.notFoundDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
