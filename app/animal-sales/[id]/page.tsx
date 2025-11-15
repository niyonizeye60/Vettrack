"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Phone, Mail, MapPin, Calendar, User, Heart, Share2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"

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

export default function AnimalDetailPage() {
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [loading, setLoading] = useState(true)
  const [wishlist, setWishlist] = useState<string[]>([])
  const params = useParams()
  const animalId = params.id as string

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

  if (!animal) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <Link href="/animal-sales" className="inline-flex items-center text-primary hover:underline mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Animal Sales
          </Link>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-600 mb-4">Animal Not Found</h2>
            <p className="text-gray-500">The animal you're looking for doesn't exist.</p>
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
            <Link href="/animal-sales" className="inline-flex items-center text-white/80 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Animal Sales
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-blue-400">
              {animal.name}
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Healthy, certified animals ready for your farm
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
                src={animal.image}
                alt={animal.name}
                fill
                className="object-cover"
              />
              <Badge className="absolute top-4 right-4 bg-green-500">
                Available
              </Badge>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{animal.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl font-bold text-primary">
                  RWF {animal.price.toLocaleString()}
                </span>
                <span className="text-gray-500">{animal.duration}</span>
              </div>
              <div className="flex gap-2 mb-4">
                {animal.animalType && (
                  <Badge variant="secondary">{animal.animalType}</Badge>
                )}
                {animal.sex && (
                  <Badge variant="outline">{animal.sex}</Badge>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{animal.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {animal.breed && (
                <div>
                  <h4 className="font-medium text-gray-900">Breed</h4>
                  <p className="text-gray-600">{animal.breed}</p>
                </div>
              )}
              {animal.age && (
                <div>
                  <h4 className="font-medium text-gray-900">Age</h4>
                  <p className="text-gray-600">{animal.age}</p>
                </div>
              )}
            </div>

            {animal.district && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{animal.district}, {animal.sector}</span>
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
                  className={`h-4 w-4 mr-2 ${wishlist.includes(animal.id) ? 'fill-red-500 text-red-500' : ''}`}
                />
                {wishlist.includes(animal.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </Button>
              <Button variant="outline" className="flex-shrink-0">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="space-y-3">
              {animal.sellerPhone && (
                <Button className="w-full" size="lg" asChild>
                  <a href={`tel:${animal.sellerPhone}`}>
                    <Phone className="h-5 w-5 mr-2" />
                    Call Seller: {animal.sellerPhone}
                  </a>
                </Button>
              )}
              {animal.sellerEmail && (
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <a href={`mailto:${animal.sellerEmail}`}>
                    <Mail className="h-5 w-5 mr-2" />
                    Email Seller
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Animal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Animal Details</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li><strong>Type:</strong> {animal.animalType || 'Not specified'}</li>
                  <li><strong>Breed:</strong> {animal.breed || 'Not specified'}</li>
                  <li><strong>Age:</strong> {animal.age || 'Not specified'}</li>
                  <li><strong>Sex:</strong> {animal.sex || 'Not specified'}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Seller Information</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li><strong>Location:</strong> {animal.district || 'Not specified'}</li>
                  <li><strong>Sector:</strong> {animal.sector || 'Not specified'}</li>
                  <li><strong>Phone:</strong> {animal.sellerPhone || 'Not provided'}</li>
                  <li><strong>Email:</strong> {animal.sellerEmail || 'Not provided'}</li>
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