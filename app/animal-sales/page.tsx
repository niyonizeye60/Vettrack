"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, Calendar, Tag, Heart } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import ServicesBanner from "@/components/services/services-banner"
import ProductCard from "@/components/products/product-card"

interface Animal {
  id: string
  name: string
  description: string
  price: number
  duration: string
  image: string
  categoryId: string
  animalType?: string
  breed?: string
  age?: string
  sex?: string
  district?: string
  sector?: string
  village?: string
  sellerPhone?: string
  sellerEmail?: string
}

interface Category {
  id: string
  name: string
  description: string
  type: string
}

export default function AnimalSalesPage() {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [filteredAnimals, setFilteredAnimals] = useState<Animal[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAnimalType, setSelectedAnimalType] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [wishlist, setWishlist] = useState<string[]>([])
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('category')
  const { t } = useLanguage()

  useEffect(() => {
    fetchData()
    const savedWishlist = localStorage.getItem('animals-wishlist')
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist))
    }
  }, [])

  const fetchData = async () => {
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch('/api/services?category=sales'),
        fetch('/api/categories')
      ])
      const servicesData = await servicesRes.json()
      const categoriesData = await categoriesRes.json()
      setAnimals(servicesData)
      setFilteredAnimals(servicesData)
      setCategories(categoriesData.sales || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...animals]

    if (searchTerm) {
      filtered = filtered.filter(animal =>
        animal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        animal.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        animal.animalType?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedAnimalType) {
      filtered = filtered.filter(animal => animal.animalType === selectedAnimalType)
    }

    if (selectedDistrict) {
      filtered = filtered.filter(animal => animal.district === selectedDistrict)
    }

    if (minPrice) {
      filtered = filtered.filter(animal => animal.price >= Number(minPrice))
    }

    if (maxPrice) {
      filtered = filtered.filter(animal => animal.price <= Number(maxPrice))
    }

    if (categoryId) {
      filtered = filtered.filter(animal => animal.categoryId === categoryId)
    }

    // Apply sorting
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

    setFilteredAnimals(filtered)
  }

  const toggleWishlist = (animalId: string) => {
    const newWishlist = wishlist.includes(animalId)
      ? wishlist.filter(id => id !== animalId)
      : [...wishlist, animalId]
    setWishlist(newWishlist)
    localStorage.setItem('animals-wishlist', JSON.stringify(newWishlist))
  }

  useEffect(() => {
    applyFilters()
  }, [searchTerm, selectedAnimalType, selectedDistrict, minPrice, maxPrice, sortBy, animals, categoryId])

  const currentCategory = categories.find(cat => cat.id === categoryId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom">
          <div className="text-center">Loading animals...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <ServicesBanner
        backHref="/services"
        title={categoryId && currentCategory ? currentCategory.name : t('animals.title')}
        subtitle={categoryId && currentCategory ? currentCategory.description : t('animals.subtitle')}
        image="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
      />

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom">

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('common.search') + '...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48">
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
              <Select value={selectedAnimalType || "all"} onValueChange={(value) => setSelectedAnimalType(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Animal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="Cow">Cow</SelectItem>
                  <SelectItem value="Goat">Goat</SelectItem>
                  <SelectItem value="Sheep">Sheep</SelectItem>
                  <SelectItem value="Dog">Dog</SelectItem>
                  <SelectItem value="Cat">Cat</SelectItem>
                  <SelectItem value="Chicken">Chicken</SelectItem>
                  <SelectItem value="Pig">Pig</SelectItem>
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
            <p className="text-gray-600">{filteredAnimals.length} {t('animals.title').toLowerCase()} found</p>
            {wishlist.length > 0 && (
              <p className="text-sm text-gray-500">
                <Heart className="h-4 w-4 inline mr-1" />
                {wishlist.length} in wishlist
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnimals.map((animal) => (
              <ProductCard
                key={animal.id}
                id={animal.id}
                categoryId={animal.categoryId}
                category="sales"
                name={animal.name}
                description={animal.description}
                image={animal.image}
                price={animal.price}
                unit={animal.duration}
                detailHref={`/animal-sales/${animal.id}`}
                badges={[{ label: t('common.available') }]}
                wishlisted={wishlist.includes(animal.id)}
                onToggleWishlist={() => toggleWishlist(animal.id)}
                details={[
                  ...(animal.animalType || animal.breed
                    ? [{ icon: Tag, text: [animal.animalType, animal.breed].filter(Boolean).join(' · ') }]
                    : []),
                  ...(animal.age ? [{ icon: Calendar, text: animal.age }] : []),
                  ...(animal.district
                    ? [{ icon: MapPin, text: [animal.district, animal.sector].filter(Boolean).join(', ') }]
                    : []),
                ]}
              />
            ))}
          </div>

          {filteredAnimals.length === 0 && !loading && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {t('animals.notFound')}
              </h3>
              <p className="text-gray-500">
                {t('animals.notFoundDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
