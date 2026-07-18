"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, ShoppingCart, Truck, MapPin, Star, Heart, Info } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"

interface Feed {
  id: string
  name: string
  description: string
  price: number
  duration: string
  image: string
  categoryId: string
  feedType?: string
  quality?: string
  targetAnimal?: string
  district?: string
  sector?: string
  village?: string
}

interface Category {
  id: string
  name: string
  description: string
  type: string
}

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [filteredFeeds, setFilteredFeeds] = useState<Feed[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFeedType, setSelectedFeedType] = useState("")
  const [selectedQuality, setSelectedQuality] = useState("")
  const [selectedTargetAnimal, setSelectedTargetAnimal] = useState("")
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
    const savedWishlist = localStorage.getItem('feeds-wishlist')
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist))
    }
  }, [])

  const fetchData = async () => {
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch('/api/services?category=feeds'),
        fetch('/api/categories')
      ])
      const servicesData = await servicesRes.json()
      const categoriesData = await categoriesRes.json()
      setFeeds(servicesData)
      setFilteredFeeds(servicesData)
      setCategories(categoriesData.feeds || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...feeds]
    
    if (searchTerm) {
      filtered = filtered.filter(feed =>
        feed.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feed.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feed.feedType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feed.targetAnimal?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (selectedFeedType) {
      filtered = filtered.filter(feed => feed.feedType === selectedFeedType)
    }
    
    if (selectedQuality) {
      filtered = filtered.filter(feed => feed.quality === selectedQuality)
    }
    
    if (selectedTargetAnimal) {
      filtered = filtered.filter(feed => feed.targetAnimal === selectedTargetAnimal)
    }
    
    if (selectedDistrict) {
      filtered = filtered.filter(feed => feed.district === selectedDistrict)
    }
    
    if (minPrice) {
      filtered = filtered.filter(feed => feed.price >= Number(minPrice))
    }
    
    if (maxPrice) {
      filtered = filtered.filter(feed => feed.price <= Number(maxPrice))
    }
    
    if (categoryId) {
      filtered = filtered.filter(feed => feed.categoryId === categoryId)
    }

    // Sort feeds
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
    
    setFilteredFeeds(filtered)
  }

  const toggleWishlist = (feedId: string) => {
    const newWishlist = wishlist.includes(feedId)
      ? wishlist.filter(id => id !== feedId)
      : [...wishlist, feedId]
    setWishlist(newWishlist)
    localStorage.setItem('feeds-wishlist', JSON.stringify(newWishlist))
  }

  useEffect(() => {
    applyFilters()
  }, [searchTerm, selectedFeedType, selectedQuality, selectedTargetAnimal, selectedDistrict, minPrice, maxPrice, sortBy, feeds, categoryId])

  const currentCategory = categories.find(cat => cat.id === categoryId)

  const getQualityColor = (quality?: string) => {
    switch (quality) {
      case 'High': return 'bg-green-500'
      case 'Medium': return 'bg-yellow-500'
      case 'Low': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">Loading feed products...</div>
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
            src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
            alt="Animal feeds"
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
              {categoryId && currentCategory ? currentCategory.name : t('feeds.title')}
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              {categoryId && currentCategory ? currentCategory.description : t('feeds.subtitle')}
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
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={selectedFeedType || "all"} onValueChange={(value) => setSelectedFeedType(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Feed Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="Hay">Hay</SelectItem>
                <SelectItem value="Concentrates">Concentrates</SelectItem>
                <SelectItem value="Minerals">Minerals</SelectItem>
                <SelectItem value="Supplements">Supplements</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedQuality || "all"} onValueChange={(value) => setSelectedQuality(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedTargetAnimal || "all"} onValueChange={(value) => setSelectedTargetAnimal(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Target Animal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="Cattle">Cattle</SelectItem>
                <SelectItem value="Goats">Goats</SelectItem>
                <SelectItem value="Poultry">Poultry</SelectItem>
                <SelectItem value="Sheep">Sheep</SelectItem>
                <SelectItem value="Pigs">Pigs</SelectItem>
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
            
            <div className="flex gap-2">
              <Input
                placeholder="Min Price"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                placeholder="Max Price"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <p className="text-gray-600">{filteredFeeds.length} {t('feeds.title').toLowerCase()} found</p>
          {wishlist.length > 0 && (
            <p className="text-sm text-gray-500">
              <Heart className="h-4 w-4 inline mr-1" />
              {wishlist.length} in wishlist
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeeds.map((feed) => (
            <Card key={feed.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-48">
                <Link href={`/feeds/${feed.id}`}>
                  <Image
                    src={feed.image}
                    alt={feed.name}
                    fill
                    className="object-cover cursor-pointer hover:scale-105 transition-transform"
                  />
                </Link>
                <Badge className="absolute top-2 right-2 bg-green-500">
                  {t('common.available')}
                </Badge>
                {feed.quality && (
                  <Badge className={`absolute top-2 left-2 ${getQualityColor(feed.quality)} text-white`}>
                    {feed.quality} {t('feeds.quality')}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-2 left-2 p-2 bg-white/80 hover:bg-white"
                  onClick={() => toggleWishlist(feed.id)}
                >
                  <Heart 
                    className={`h-4 w-4 ${wishlist.includes(feed.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                  />
                </Button>
              </div>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{feed.name}</span>
                  <span className="text-primary font-bold">
                    RWF {feed.price.toLocaleString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{feed.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2 flex-wrap">
                    {feed.feedType && (
                      <Badge variant="secondary">{feed.feedType}</Badge>
                    )}
                    {feed.targetAnimal && (
                      <Badge variant="outline">{t('feeds.targetAnimal')}: {feed.targetAnimal}</Badge>
                    )}
                  </div>
                  {feed.district && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{feed.district}, {feed.sector}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-500">{feed.duration}</span>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-sm text-gray-600">{t('common.premium')}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Link href={`/feeds/${feed.id}`}>
                    <Button variant="outline" className="w-full">
                      <Info className="h-4 w-4 mr-2" />
                      {t('common.learnMore')}
                    </Button>
                  </Link>
                  <div className="flex gap-2">
                    <Button className="flex-1" asChild>
                      <a href="tel:+250780721800">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {t('common.orderNow')}
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={`mailto:info@vettrack.rw?subject=${encodeURIComponent(`Delivery request: ${feed.name}`)}`}>
                        <Truck className="h-4 w-4 mr-2" />
                        {t('common.delivery')}
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredFeeds.length === 0 && !loading && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {searchTerm || selectedFeedType || selectedTargetAnimal || selectedDistrict ? t('feeds.notFound') : t('feeds.notFound')}
            </h3>
            <p className="text-gray-500">
              {searchTerm || selectedFeedType || selectedTargetAnimal || selectedDistrict ? t('feeds.notFoundDesc') : t('feeds.notFoundDesc')}
            </p>
          </div>
        )}
        </div>
      </div>
    </>
  )
}