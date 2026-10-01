"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, Share2, MapPin, Calendar, Tag, Mail, Phone, SearchX } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import ServicesBanner from "@/components/services/services-banner"
import ProductDetailRows from "@/components/products/product-detail-rows"
import ConnectCta from "@/components/marketplace/connect-cta"
import ListingGallery, { listingPhotos } from "@/components/marketplace/listing-gallery"
import NoIndex from "@/components/seo/no-index"

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"

interface Animal {
  id: string
  name: string
  description: string
  price: number
  duration: string
  image: string
  images?: string[]
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

export default function AnimalDetailPage() {
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [loading, setLoading] = useState(true)
  const [wishlist, setWishlist] = useState<string[]>([])
  const params = useParams()
  const animalId = params.id as string
  const { t } = useLanguage()

  useEffect(() => {
    fetchAnimal()
    const savedWishlist = localStorage.getItem('animals-wishlist')
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist))
    }
  }, [animalId])

  const fetchAnimal = async () => {
    try {
      const response = await fetch('/api/services?category=sales')
      const animals = await response.json()
      const foundAnimal = animals.find((a: Animal) => a.id === animalId)
      setAnimal(foundAnimal || null)
    } catch (error) {
      console.error('Failed to fetch animal:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleWishlist = () => {
    if (!animal) return
    const newWishlist = wishlist.includes(animal.id)
      ? wishlist.filter(id => id !== animal.id)
      : [...wishlist, animal.id]
    setWishlist(newWishlist)
    localStorage.setItem('animals-wishlist', JSON.stringify(newWishlist))
  }

  // The site header is transparent with white text until the page scrolls, so every
  // state of this page needs the hero banner under it - without one the nav links
  // are white on the page's light background and the header looks broken.
  if (loading) {
    return (
      <>
        <ServicesBanner
          backHref="/services?tab=sales"
          title={t('animals.title')}
          subtitle={t('animals.subtitle')}
          image={HERO_IMAGE}
        />

        <div className="min-h-screen bg-gray-50 py-12">
          <div className="container-custom">
            <div className="animate-pulse">
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
      </>
    )
  }

  if (!animal) {
    return (
      <>
        <NoIndex />
        <ServicesBanner
          backHref="/services?tab=sales"
          title={t('animals.title')}
          subtitle={t('animals.subtitle')}
          image={HERO_IMAGE}
        />

        <div className="min-h-[50vh] bg-gray-50 py-12">
          <div className="container-custom">
            <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <SearchX className="h-7 w-7 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('animals.notFound')}</h2>
              <p className="text-sm text-gray-500">{t('animals.notFoundDesc')}</p>
              <Button asChild className="mt-6">
                <Link href="/animal-sales">{t('connect.backToAnimals')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <ServicesBanner
        backHref={animal.categoryId ? `/animal-sales?category=${animal.categoryId}` : "/animal-sales"}
        backLabel={`${t('common.backTo')} ${t('animals.title')}`}
        title={animal.name}
        subtitle={t('animals.subtitle')}
        image={HERO_IMAGE}
      />

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <ListingGallery photos={listingPhotos(animal)} alt={animal.name}>
              <Badge className="absolute top-4 right-4 bg-green-600">{t('common.available')}</Badge>
            </ListingGallery>

            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{animal.name}</h1>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-3xl font-bold text-primary">RWF {animal.price.toLocaleString()}</span>
                  <span className="text-gray-500">{animal.duration}</span>
                </div>
                <div className="flex gap-2 mb-4">
                  {animal.animalType && <Badge variant="secondary">{animal.animalType}</Badge>}
                  {animal.sex && <Badge variant="outline">{animal.sex}</Badge>}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('common.description')}</h3>
                <p className="text-gray-600">{animal.description}</p>
              </div>

              <ProductDetailRows
                details={[
                  ...(animal.breed ? [{ icon: Tag, label: t('animals.breed'), text: animal.breed }] : []),
                  ...(animal.age ? [{ icon: Calendar, label: t('animals.age'), text: animal.age }] : []),
                  ...(animal.district
                    ? [{ icon: MapPin, label: t('common.location'), text: [animal.district, animal.sector].filter(Boolean).join(', ') }]
                    : []),
                ]}
              />

              <div className="flex gap-3">
                <Button variant="outline" onClick={toggleWishlist} className="flex-shrink-0">
                  <Heart className={`h-4 w-4 mr-2 ${wishlist.includes(animal.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  {wishlist.includes(animal.id) ? t('common.removeFromWishlist') : t('common.addToWishlist')}
                </Button>
                <Button variant="outline" className="flex-shrink-0">
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('common.share')}
                </Button>
              </div>

              <ConnectCta listingId={animal.id} />

              {/*
                Only staff, the seller, and a buyer who has paid the connection fee
                ever receive sellerPhone/sellerEmail - the API strips them for
                everyone else (canViewSellerContact in lib/roles.ts). For the public
                this block simply doesn't render; ConnectCta above is their route in.
              */}
              {(animal.sellerPhone || animal.sellerEmail) && (
                <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {t('animals.contactSeller')}
                  </p>
                  {animal.sellerPhone && (
                    <div className="flex items-center text-sm text-gray-700">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {animal.sellerPhone}
                    </div>
                  )}
                  {animal.sellerEmail && (
                    <div className="flex items-center text-sm text-gray-700">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {animal.sellerEmail}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
