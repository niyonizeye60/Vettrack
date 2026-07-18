import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Calendar, User } from "lucide-react"

const blogPosts = [
  {
    id: 1,
    title: "The Benefits of GPS Tracking for Livestock Management",
    excerpt:
      "Discover how GPS tracking technology can revolutionize your livestock management and improve productivity.",
    image:
      "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&h=500&fit=crop&crop=focalpoint&auto=format&q=80",
    date: "May 5, 2023",
    author: "Dr. Jean Mugisha",
    category: "Technology",
  },
  {
    id: 2,
    title: "Common Diseases in Dairy Cattle and How to Prevent Them",
    excerpt:
      "Learn about the most common diseases affecting dairy cattle in Rwanda and effective prevention strategies.",
    image:
      "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&h=500&fit=crop&crop=focalpoint&auto=format&q=80",
    date: "April 28, 2023",
    author: "Dr. Alice Uwimana",
    category: "Health",
  },
  {
    id: 3,
    title: "Virtual Veterinary Consultations: What to Expect",
    excerpt: "A guide to preparing for and getting the most out of your virtual veterinary consultation.",
    image:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop&crop=focalpoint&auto=format&q=80",
    date: "April 15, 2023",
    author: "Eric Nshimiyimana",
    category: "Services",
  },
  {
    id: 4,
    title: "Choosing the Right Pet for Your Family",
    excerpt:
      "Factors to consider when selecting a pet that fits your lifestyle, home environment, and family dynamics.",
    image:
      "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=500&fit=crop&crop=focalpoint&auto=format&q=80",
    date: "April 10, 2023",
    author: "Dr. Jean Mugisha",
    category: "Pets",
  },
  {
    id: 5,
    title: "Sustainable Farming Practices for Livestock Owners",
    excerpt: "Environmentally friendly approaches to livestock farming that can improve productivity and reduce costs.",
    image:
      "https://images.unsplash.com/photo-1605152276897-4f618f831968?w=800&h=500&fit=crop&crop=focalpoint&auto=format&q=80",
    date: "March 30, 2023",
    author: "Dr. Alice Uwimana",
    category: "Farming",
  },
  {
    id: 6,
    title: "The Importance of Regular Health Check-ups for Your Animals",
    excerpt: "Why preventive care and regular veterinary check-ups are essential for maintaining animal health.",
    image:
      "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&h=500&fit=crop&crop=focalpoint&auto=format&q=80",
    date: "March 22, 2023",
    author: "Eric Nshimiyimana",
    category: "Health",
  },
]

export default function BlogList() {
  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogPosts.map((post) => (
          <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-48">
              <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
              <div className="absolute top-4 right-4 bg-primary text-white text-xs font-semibold px-2 py-1 rounded-full">
                {post.category}
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center text-sm text-gray-500 mb-3">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{post.date}</span>
                <span className="mx-2">•</span>
                <User className="h-4 w-4 mr-1" />
                <span>{post.author}</span>
              </div>
              <h3 className="text-xl font-bold mb-2 line-clamp-2">{post.title}</h3>
              <p className="text-gray-600 line-clamp-3 mb-4">{post.excerpt}</p>
            </CardContent>
            <CardFooter className="px-6 pb-6 pt-0">
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href={`/blog/${post.id}`}>Read More</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
