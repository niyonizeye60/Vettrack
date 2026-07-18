"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ShoppingCart, Phone, MapPin, Info, Heart, Share2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"

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

  if (!drug) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <Link href="/pharmacy" className="inline-flex items-center text-primary hover:underline mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pharmacy
          </Link>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-600 mb-4">Product Not Found</h2>
            <p className="text-gray-500">The medication you're looking for doesn't exist.</p>
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
            <Link href="/pharmacy" className="inline-flex items-center text-white/80 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pharmacy
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-blue-400">
              {drug.name}
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Quality veterinary medication for your animals
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
                src={drug.image}
                alt={drug.name}
                fill
                className="object-cover"
              />
              <Badge className="absolute top-4 right-4 bg-blue-500">
                In Stock
              </Badge>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{drug.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl font-bold text-primary">
                  RWF {drug.price.toLocaleString()}
                </span>
                <span className="text-gray-500"> || {drug.duration}</span>
              </div>
              {drug.drugType && (
                <Badge variant="secondary" className="mb-4">{drug.drugType}</Badge>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{drug.description}</p>
            </div>

            {drug.usageDescription && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Usage Instructions</h3>
                <p className="text-gray-600">{drug.usageDescription}</p>
              </div>
            )}

            {drug.district && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{drug.district}, {drug.sector}</span>
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
                  className={`h-4 w-4 mr-2 ${wishlist.includes(drug.id) ? 'fill-red-500 text-red-500' : ''}`}
                />
                {wishlist.includes(drug.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </Button>
              <Button variant="outline" className="flex-shrink-0">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="space-y-3">
              <Button className="w-full" size="lg" asChild>
                <a href="tel:+250780721800">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Order Now
                </a>
              </Button>
              <Button variant="outline" className="w-full" size="lg" asChild>
                <Link href="/booking">
                  <Phone className="h-5 w-5 mr-2" />
                  Consult Veterinarian
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Product Details</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li><strong>Type:</strong> {drug.drugType || 'Not specified'}</li>
                  <li><strong>Package:</strong> {drug.duration}</li>
                  <li><strong>Category:</strong> Prescription Medicine</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Availability</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li><strong>Status:</strong> In Stock</li>
                  <li><strong>Location:</strong> {drug.district || 'Multiple locations'}</li>
                  <li><strong>Delivery:</strong> Available</li>
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