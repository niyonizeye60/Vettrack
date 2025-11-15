import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Clock} from "lucide-react"

interface ServiceProps {
  service: {
    id: string
    name: string
    description: string
    price: number | string
    duration: string
    image: string
    category?: string
    link?: string
  }
}

function getServiceLink(service: ServiceProps['service']) {
  // Check for external link (RVSMS)
  if (service.link) return service.link
  
  // Check if service has category (dynamic services)
  if (service.category === 'sales') return `/animal-sales?category=${service.id}`
  if (service.category === 'drugs') return `/pharmacy?category=${service.id}`
  if (service.category === 'feeds') return `/feeds?category=${service.id}`
  
  // For static services, use booking page
  return `/booking?service=${encodeURIComponent(service.name)}`
}

export default function ServiceCard({ service }: ServiceProps) {
  return (
    <div className="salon-card overflow-hidden shadow-salon hover:shadow-salon-hover transition-all group">
      <div className="relative h-48">
        <Image
          src={service.image || "/placeholder.svg"}
          alt={service.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{service.name}</h3>
        <p className="text-gray-600 mb-4">{service.description}</p>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center text-primary font-semibold">
            
            <span>{typeof service.price === "number" ? `RWF ${service.price.toLocaleString()}` : service.price}</span>
          </div>

          <div className="flex items-center text-gray-500 text-sm">
            <Clock className="h-4 w-4 mr-1" />
            <span>{service.duration}</span>
          </div>
        </div>

        <Button
          asChild
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shadow-md"
        >
          <Link href={getServiceLink(service)} target={service.link ? "_blank" : "_self"}>
            {service.name === "Access RVSMS" ? "Access RVSMS" : "Order Now"}
          </Link>
        </Button>
      </div>
    </div>
  )
}