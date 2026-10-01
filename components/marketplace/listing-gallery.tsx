"use client"

import { useState, type ReactNode } from "react"
import Image from "next/image"
import { Expand } from "lucide-react"
import PhotoLightbox from "@/components/marketplace/photo-lightbox"

/**
 * Every photo of a published listing, cover first. A seller's listing carries all
 * the photos from their request in `images`, with `image` as the cover the grid cards
 * show; a listing staff created has only `image`. Staff can also swap the cover of a
 * seller's listing, so it is put first rather than assumed to be one of `images`.
 */
export function listingPhotos(listing: { image?: string | null; images?: string[] | null }): string[] {
  const all = [listing.image, ...(listing.images ?? [])].filter((url): url is string => !!url)
  return Array.from(new Set(all))
}

interface ListingGalleryProps {
  photos: string[]
  alt: string
  /** Badges laid over the main photo, such as stock or quality. */
  children?: ReactNode
}

/**
 * The photo block of a public listing page: the main photo, a strip of thumbnails to
 * switch it, and a full-screen viewer to page through them all.
 */
export default function ListingGallery({ photos, alt, children }: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const index = activeIndex < photos.length ? activeIndex : 0

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        disabled={photos.length === 0}
        className="group relative block h-96 w-full rounded-lg overflow-hidden"
      >
        <Image
          src={photos[index] ?? "/placeholder.svg"}
          alt={alt}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
        {children}
        {photos.length > 0 && (
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Expand className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
        )}
        {photos.length > 1 && (
          <span className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {index + 1} / {photos.length}
          </span>
        )}
      </button>

      {photos.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                i === index ? "border-primary" : "border-transparent hover:border-gray-300"
              }`}
            >
              <Image src={url} alt={`${alt} ${i + 1}`} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}

      <PhotoLightbox
        photos={photos}
        alt={alt}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        initialIndex={index}
      />
    </div>
  )
}
