"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ShoppingCart, Truck, MapPin, Star, Heart, Share2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
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
        <div className="container mx-auto px-4">
          <Link href="/feeds" className="inline-flex items-center text-primary hover:underline mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.backTo')} {t('nav.feeds')}
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
            <Link href="/feeds" className="inline-flex items-center text-white/80 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.backTo')} {t('nav.feeds')}
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-blue-400">
              {feed.name}
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              {t('feeds.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="relative">
            <div className="relative h-96 rounded-lg overflow-hidden">
              <Image
                src={feed.image}
                alt={feed.name}
                fill
                className="object-cover"
              />
              <Badge className="absolute top-4 right-4 bg-green-500">
                {t('common.available')}
              </Badge>
              {feed.quality && (
                <Badge className={`absolute top-4 left-4 ${getQualityColor(feed.quality)} text-white`}>
                  {feed.quality} Quality
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{feed.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl font-bold text-primary">
                  RWF {feed.price.toLocaleString()}
                </span>
                <span className="text-gray-500"> || {feed.duration}</span>
              </div>
              <div className="flex gap-2 mb-4">
                {feed.feedType && (
                  <Badge variant="secondary">{feed.feedType}</Badge>
                )}
                {feed.targetAnimal && (
                  <Badge variant="outline">For {feed.targetAnimal}</Badge>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('common.description')}</h3>
              <p className="text-gray-600">{feed.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {feed.feedType && (
                <div>
                  <h4 className="font-medium text-gray-900">{t('feeds.type')}</h4>
                  <p className="text-gray-600">{feed.feedType}</p>
                </div>
              )}
              {feed.quality && (
                <div>
                  <h4 className="font-medium text-gray-900">{t('feeds.quality')}</h4>
                  <p className="text-gray-600">{feed.quality}</p>
                </div>
              )}
            </div>

            {feed.district && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('common.location')}</h3>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{feed.district}, {feed.sector}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={toggleWishlist}
                className="flex-shrink-0"
              >
                <Heart 
                  className={`h-4 w-4 mr-2 ${wishlist.includes(feed.id) ? 'fill-red-500 text-red-500' : ''}`}
                />
                {wishlist.includes(feed.id) ? t('common.removeFromWishlist') : t('common.addToWishlist')}
              </Button>
              <Button variant="outline" className="flex-shrink-0">
                <Share2 className="h-4 w-4 mr-2" />
                {t('common.share')}
              </Button>
            </div>

            <div className="space-y-3">
              <Button className="w-full" size="lg">
                <ShoppingCart className="h-5 w-5 mr-2" />
                {t('common.orderNow')}
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                <Truck className="h-5 w-5 mr-2" />
                {t('common.requestDelivery')}
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('common.productInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">{t('feeds.feedDetails')}</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li><strong>{t('feeds.type')}:</strong> {feed.feedType || 'Not specified'}</li>
                  <li><strong>{t('feeds.quality')}:</strong> {feed.quality || 'Not specified'}</li>
                  <li><strong>{t('feeds.targetAnimal')}:</strong> {feed.targetAnimal || 'Not specified'}</li>
                  <li><strong>{t('feeds.package')}:</strong> {feed.duration}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">{t('feeds.availability')}</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li><strong>{t('feeds.status')}:</strong> {t('common.inStock')}</li>
                  <li><strong>{t('common.location')}:</strong> {feed.district || 'Multiple locations'}</li>
                  <li><strong>{t('common.delivery')}:</strong> {t('common.available')}</li>
                  <li><strong>{t('feeds.qualityRating')}:</strong> <Star className="h-4 w-4 inline text-yellow-400" /> {t('common.premium')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  )
}