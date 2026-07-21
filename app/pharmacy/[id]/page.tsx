"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, Share2, MapPin, Pill } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import ServicesBanner from "@/components/services/services-banner"
import ProductDetailRows from "@/components/products/product-detail-rows"
import AddToCartControls from "@/components/products/add-to-cart-controls"

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

export default function DrugDetailPage() {
  const [drug, setDrug] = useState<Drug | null>(null)
  const [loading, setLoading] = useState(true)
  const [wishlist, setWishlist] = useState<string[]>([])
  const params = useParams()
  const drugId = params.id as string
  const { t } = useLanguage()

  useEffect(() => {
    fetchDrug()
    const savedWishlist = localStorage.getItem('pharmacy-wishlist')
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist))
    }
  }, [drugId])

  const fetchDrug = async () => {
    try {
      const response = await fetch('/api/services?category=drugs')
      const drugs = await response.json()
      const foundDrug = drugs.find((d: Drug) => d.id === drugId)
      setDrug(foundDrug || null)
    } catch (error) {
      console.error('Failed to fetch drug:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleWishlist = () => {
    if (!drug) return
    const newWishlist = wishlist.includes(drug.id)
      ? wishlist.filter(id => id !== drug.id)
      : [...wishlist, drug.id]
    setWishlist(newWishlist)
    localStorage.setItem('pharmacy-wishlist', JSON.stringify(newWishlist))
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

  if (!drug) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom">
          <Link href="/pharmacy" className="inline-flex items-center text-primary hover:underline mb-8">
            {t('common.backTo')} {t('pharmacy.title')}
          </Link>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-600 mb-4">{t('pharmacy.notFound')}</h2>
            <p className="text-gray-500">{t('pharmacy.notFoundDesc')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <ServicesBanner
        backHref="/pharmacy"
        backLabel={`${t('common.backTo')} ${t('pharmacy.title')}`}
        title={drug.name}
        subtitle={t('pharmacy.subtitle')}
        image="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
      />

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="relative">
              <div className="relative h-96 rounded-lg overflow-hidden">
                <Image src={drug.image} alt={drug.name} fill className="object-cover" />
                <Badge className="absolute top-4 right-4 bg-blue-600">{t('common.inStock')}</Badge>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{drug.name}</h1>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-3xl font-bold text-primary">RWF {drug.price.toLocaleString()}</span>
                  <span className="text-gray-500">{drug.duration}</span>
                </div>
                {drug.drugType && <Badge variant="secondary">{drug.drugType}</Badge>}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('common.description')}</h3>
                <p className="text-gray-600">{drug.description}</p>
              </div>

              {drug.usageDescription && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('pharmacy.instructions')}</h3>
                  <p className="text-gray-600">{drug.usageDescription}</p>
                </div>
              )}

              <ProductDetailRows
                details={[
                  ...(drug.drugType ? [{ icon: Pill, label: t('common.description'), text: drug.drugType }] : []),
                  ...(drug.district
                    ? [{ icon: MapPin, label: t('common.location'), text: [drug.district, drug.sector].filter(Boolean).join(', ') }]
                    : []),
                ]}
              />

              <div className="flex gap-3">
                <Button variant="outline" onClick={toggleWishlist} className="flex-shrink-0">
                  <Heart className={`h-4 w-4 mr-2 ${wishlist.includes(drug.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  {wishlist.includes(drug.id) ? t('common.removeFromWishlist') : t('common.addToWishlist')}
                </Button>
                <Button variant="outline" className="flex-shrink-0">
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('common.share')}
                </Button>
              </div>

              <AddToCartControls
                item={{
                  id: drug.id,
                  categoryId: drug.categoryId,
                  category: "drugs",
                  name: drug.name,
                  image: drug.image,
                  price: drug.price,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
