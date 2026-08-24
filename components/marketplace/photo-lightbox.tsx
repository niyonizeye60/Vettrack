"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

interface PhotoLightboxProps {
  photos: string[]
  alt: string
  open: boolean
  onOpenChange: (open: boolean) => void
  initialIndex?: number
}

/**
 * Full-screen photo viewer shared by the marketplace review queue and the
 * public listing page - both need to page through all six listing photos,
 * not just the one or two a card can show inline.
 */
export default function PhotoLightbox({
  photos,
  alt,
  open,
  onOpenChange,
  initialIndex = 0,
}: PhotoLightboxProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(initialIndex)

  useEffect(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  if (photos.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-0 bg-black p-0 text-white overflow-hidden">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <Carousel setApi={setApi} opts={{ startIndex: initialIndex }} className="w-full">
          <CarouselContent className="ml-0">
            {photos.map((url, i) => (
              <CarouselItem key={url + i} className="pl-0">
                <div className="relative h-[70vh] w-full bg-black">
                  <Image src={url} alt={`${alt} ${i + 1}`} fill className="object-contain" sizes="100vw" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {photos.length > 1 && (
            <>
              <CarouselPrevious className="left-3 border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white" />
              <CarouselNext className="right-3 border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white" />
            </>
          )}
        </Carousel>

        {photos.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === current ? "w-6 bg-white" : "w-1.5 bg-white/40"
                )}
                aria-label={`${i + 1} / ${photos.length}`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
