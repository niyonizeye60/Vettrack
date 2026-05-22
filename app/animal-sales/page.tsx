"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Phone, Mail, Search, Filter, MapPin, Calendar, User, Heart, Info } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"

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
        <div className="container mx-auto px-4">
          <div className="text-center">Loading animals...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Banner Section */}
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
            alt="Animals for sale"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl text-white">
            <Link href="/services" className="inline-flex items-center text-white/80 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.backTo')} {t('nav.services')}
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-blue-400">
              {categoryId && currentCategory ? currentCategory.name : t('animals.title')}
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              {categoryId && currentCategory ? currentCategory.description : t('animals.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">

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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAnimals.map((animal) => (
              <Card
                key={animal.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col"
              >
                {/* Image Section */}
                <div className="relative h-56 overflow-hidden">
                  <Link href={`/animal-sales/${animal.id}`}>
                    <Image
                      src={animal.image || "/placeholder.jpg"}
                      alt={animal.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500 cursor-pointer"
                    />
                  </Link>

                  {/* Availability Badge */}
                  <Badge className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1">
                    {t("common.available")}
                  </Badge>

                  {/* Wishlist */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 left-3 bg-white/90 hover:bg-white rounded-full shadow"
                    onClick={() => toggleWishlist(animal.id)}
                  >
                    <Heart
                      className={`h-4 w-4 transition-colors ${wishlist.includes(animal.id)
                          ? "fill-red-500 text-red-500"
                          : "text-gray-600"
                        }`}
                    />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 p-5">
                  {/* Title & Price */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {animal.name}
                    </h3>

                    <span className="text-primary font-bold text-lg whitespace-nowrap">
                      RWF {(animal.price || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-4">
                    {animal.description}
                  </p>

                  {/* Animal Details */}
                  <div className="space-y-3 mb-5">
                    {animal.breed && (
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2 text-primary" />
                        <span>
                          {t("animals.breed")}: {animal.breed}
                        </span>
                      </div>
                    )}

                    {animal.age && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-primary" />
                        <span>
                          {t("animals.age")}: {animal.age}
                        </span>
                      </div>
                    )}

                    {animal.district && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-primary" />
                        <span>
                          {animal.district}, {animal.sector}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {animal.sex && (
                        <Badge variant="secondary" className="capitalize">
                          {animal.sex}
                        </Badge>
                      )}

                      <Badge variant="outline">
                        {animal.animalType}
                      </Badge>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-auto space-y-3">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{animal.duration}</span>
                    </div>

                    <Link href={`/animal-sales/${animal.id}`}>
                      <Button
                        variant="outline"
                        className="w-full rounded-xl"
                      >
                        <Info className="h-4 w-4 mr-2" />
                        {t("common.learnMore")}
                      </Button>
                    </Link>

                    <div className="flex gap-3">
                      {animal.sellerPhone ? (
                        <Button className="flex-1 rounded-xl" asChild>
                          <a href={`tel:${animal.sellerPhone}`}>
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </a>
                        </Button>
                      ) : (
                        <Link
                          href={`/animal-sales/${animal.id}`}
                          className="flex-1"
                        >
                          <Button className="w-full rounded-xl">
                            <Phone className="h-4 w-4 mr-2" />
                            {t("common.orderNow")}
                          </Button>
                        </Link>
                      )}

                      {animal.sellerEmail && (
                        <Button
                          variant="outline"
                          className="flex-1 rounded-xl"
                          asChild
                        >
                          <a href={`mailto:${animal.sellerEmail}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredAnimals.length === 0 && !loading && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {searchTerm || selectedAnimalType || selectedDistrict ? t('animals.notFound') : t('animals.notFound')}
              </h3>
              <p className="text-gray-500">
                {searchTerm || selectedAnimalType || selectedDistrict ? t('animals.notFoundDesc') : t('animals.notFoundDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

