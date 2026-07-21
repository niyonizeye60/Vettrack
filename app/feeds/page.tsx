"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, Heart, Wheat, Tag } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import ServicesBanner from "@/components/services/services-banner"
import ProductCard from "@/components/products/product-card"

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
      case 'High': return 'bg-green-600'
      case 'Medium': return 'bg-yellow-500'
      case 'Low': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

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
        title={categoryId && currentCategory ? currentCategory.name : t('feeds.title')}
        subtitle={categoryId && currentCategory ? currentCategory.description : t('feeds.subtitle')}
        image="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
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
              <ProductCard
                key={feed.id}
                id={feed.id}
                categoryId={feed.categoryId}
                category="feeds"
                name={feed.name}
                description={feed.description}
                image={feed.image}
                price={feed.price}
                unit={feed.duration}
                detailHref={`/feeds/${feed.id}`}
                badges={[
                  { label: t('common.available'), className: "bg-green-600 text-white" },
                  ...(feed.quality
                    ? [{ label: `${feed.quality} ${t('feeds.quality')}`, className: `${getQualityColor(feed.quality)} text-white` }]
                    : []),
                ]}
                wishlisted={wishlist.includes(feed.id)}
                onToggleWishlist={() => toggleWishlist(feed.id)}
                details={[
                  ...(feed.feedType ? [{ icon: Wheat, text: feed.feedType }] : []),
                  ...(feed.targetAnimal ? [{ icon: Tag, text: feed.targetAnimal }] : []),
                  ...(feed.district
                    ? [{ icon: MapPin, text: [feed.district, feed.sector].filter(Boolean).join(', ') }]
                    : []),
                ]}
              />
            ))}
          </div>

          {filteredFeeds.length === 0 && !loading && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {t('feeds.notFound')}
              </h3>
              <p className="text-gray-500">
                {t('feeds.notFoundDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
