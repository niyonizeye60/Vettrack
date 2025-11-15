"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, ShoppingCart, Phone, MapPin, Info, Heart, ArrowUpDown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"

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
    // Load wishlist from localStorage
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
      <>
        <section className="relative pt-32 pb-20">
          <div className="absolute inset-0 z-0">
            <div className="w-full h-full bg-gray-300 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl text-white">
              <div className="h-6 bg-white/20 rounded mb-4 w-32 animate-pulse"></div>
              <div className="h-12 bg-white/20 rounded mb-4 w-96 animate-pulse"></div>
              <div className="h-6 bg-white/20 rounded w-80 animate-pulse"></div>
            </div>
          </div>
        </section>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-48 bg-gray-300 animate-pulse"></div>
                  <CardHeader>
                    <div className="h-6 bg-gray-300 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded animate-pulse w-20"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-300 rounded animate-pulse w-3/4"></div>
                      <div className="h-8 bg-gray-300 rounded animate-pulse mt-4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Banner Section */}
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
            alt="Veterinary pharmacy"
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
              {categoryId && currentCategory ? currentCategory.name : t('pharmacy.title')}
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              {categoryId && currentCategory ? currentCategory.description : t('pharmacy.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">

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
            <Card key={drug.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-48">
                <Link href={`/pharmacy/${drug.id}`}>
                  <Image
                    src={drug.image}
                    alt={drug.name}
                    fill
                    className="object-cover cursor-pointer hover:scale-105 transition-transform"
                  />
                </Link>
                <Badge className="absolute top-2 right-2 bg-blue-500">
                  {t('common.inStock')}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 left-2 p-2 bg-white/80 hover:bg-white"
                  onClick={() => toggleWishlist(drug.id)}
                >
                  <Heart 
                    className={`h-4 w-4 ${wishlist.includes(drug.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                  />
                </Button>
              </div>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{drug.name}</span>
                  <span className="text-primary font-bold">
                    RWF {drug.price.toLocaleString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{drug.description}</p>
                
                <div className="space-y-2 mb-4">
                  {drug.drugType && (
                    <Badge variant="secondary">{drug.drugType}</Badge>
                  )}
                  {drug.district && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{drug.district}, {drug.sector}</span>
                    </div>
                  )}
                  {drug.usageDescription && (
                    <div className="flex items-start text-sm text-gray-600">
                      <Info className="h-4 w-4 mr-2 mt-0.5" />
                      <span>{drug.usageDescription}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-500">{drug.duration}</span>
                  <Badge variant="outline">{t('pharmacy.prescription')}</Badge>
                </div>
                
                <div className="space-y-2">
                  <Link href={`/pharmacy/${drug.id}`}>
                    <Button variant="outline" className="w-full">
                      <Info className="h-4 w-4 mr-2" />
                      {t('common.learnMore')}
                    </Button>
                  </Link>
                  <div className="flex gap-2">
                    <Button className="flex-1">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {t('common.orderNow')}
                    </Button>
                    <Button variant="outline">
                      <Phone className="h-4 w-4 mr-2" />
                      Consult
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDrugs.length === 0 && !loading && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {searchTerm || selectedDrugType || selectedDistrict ? t('pharmacy.notFound') : t('pharmacy.notFound')}
            </h3>
            <p className="text-gray-500">
              {searchTerm || selectedDrugType || selectedDistrict ? t('pharmacy.notFoundDesc') : t('pharmacy.notFoundDesc')}
            </p>
          </div>
        )}
        </div>
      </div>
    </>
  )
}