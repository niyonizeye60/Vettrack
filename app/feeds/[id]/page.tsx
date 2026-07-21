"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, Share2, MapPin, Wheat, Tag } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import ServicesBanner from "@/components/services/services-banner"
import ProductDetailRows from "@/components/products/product-detail-rows"
import AddToCartControls from "@/components/products/add-to-cart-controls"

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

export default function FeedDetailPage() {
  const [feed, setFeed] = useState<Feed | null>(null)
  const [loading, setLoading] = useState(true)
  const [wishlist, setWishlist] = useState<string[]>([])
  const params = useParams()
  const feedId = params.id as string
  const { t } = useLanguage()

  useEffect(() => {
    fetchFeed()
    const savedWishlist = localStorage.getItem('feeds-wishlist')
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist))
    }
  }, [feedId])

  const fetchFeed = async () => {
    try {
      const response = await fetch('/api/services?category=feeds')
      const feeds = await response.json()
      const foundFeed = feeds.find((f: Feed) => f.id === feedId)
      setFeed(foundFeed || null)
    } catch (error) {
      console.error('Failed to fetch feed:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleWishlist = () => {
    if (!feed) return
    const newWishlist = wishlist.includes(feed.id)
      ? wishlist.filter(id => id !== feed.id)
      : [...wishlist, feed.id]
    setWishlist(newWishlist)
    localStorage.setItem('feeds-wishlist', JSON.stringify(newWishlist))
  }

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
          <div className="animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-32 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-300 rounded"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-300 rounded"></div>
                <div className="h-6 bg-gray-300 rounded w-24"></div>
                <div className="h-20 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!feed) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom">
          <Link href="/feeds" className="inline-flex items-center text-primary hover:underline mb-8">
            {t('common.backTo')} {t('feeds.title')}
          </Link>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-600 mb-4">{t('feeds.notFound')}</h2>
            <p className="text-gray-500">{t('feeds.notFoundDesc')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <ServicesBanner
        backHref="/feeds"
        backLabel={`${t('common.backTo')} ${t('feeds.title')}`}
        title={feed.name}
        subtitle={t('feeds.subtitle')}
        image="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
      />

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="relative">
              <div className="relative h-96 rounded-lg overflow-hidden">
                <Image src={feed.image} alt={feed.name} fill className="object-cover" />
                <Badge className="absolute top-4 right-4 bg-green-600">{t('common.available')}</Badge>
                {feed.quality && (
                  <Badge className={`absolute top-4 left-4 ${getQualityColor(feed.quality)} text-white`}>
                    {feed.quality} {t('feeds.quality')}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{feed.name}</h1>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-3xl font-bold text-primary">RWF {feed.price.toLocaleString()}</span>
                  <span className="text-gray-500">{feed.duration}</span>
                </div>
                <div className="flex gap-2 mb-4">
                  {feed.feedType && <Badge variant="secondary">{feed.feedType}</Badge>}
                  {feed.targetAnimal && <Badge variant="outline">{feed.targetAnimal}</Badge>}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('common.description')}</h3>
                <p className="text-gray-600">{feed.description}</p>
              </div>

              <ProductDetailRows
                details={[
                  ...(feed.feedType ? [{ icon: Wheat, label: t('feeds.type'), text: feed.feedType }] : []),
                  ...(feed.targetAnimal ? [{ icon: Tag, label: t('feeds.targetAnimal'), text: feed.targetAnimal }] : []),
                  ...(feed.district
                    ? [{ icon: MapPin, label: t('common.location'), text: [feed.district, feed.sector].filter(Boolean).join(', ') }]
                    : []),
                ]}
              />

              <div className="flex gap-3">
                <Button variant="outline" onClick={toggleWishlist} className="flex-shrink-0">
                  <Heart className={`h-4 w-4 mr-2 ${wishlist.includes(feed.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  {wishlist.includes(feed.id) ? t('common.removeFromWishlist') : t('common.addToWishlist')}
                </Button>
                <Button variant="outline" className="flex-shrink-0">
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('common.share')}
                </Button>
              </div>

              <AddToCartControls
                item={{
                  id: feed.id,
                  categoryId: feed.categoryId,
                  category: "feeds",
                  name: feed.name,
                  image: feed.image,
                  price: feed.price,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
