import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, User, ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

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
    content: `Keeping track of your livestock is no longer limited to manual counting or herding. Thanks to modern animal tracking devices, farmers can now monitor their animals in real-time with precision and ease.

We explore the key benefits of animal tracking devices that include GPS location, body temperature sensing, and heartbeat monitoring. These tools alert you to any unusual movement or inactivity, making it easier to detect illness, injury, or theft early.

GPS features allow you to know where your animals are at all times, especially useful for free-range systems. Meanwhile, temperature and heart rate sensors provide early warnings for fever, infections, or distress. With this technology, farmers can respond faster and make informed decisions.

We also discuss how data collected from these devices can help improve feeding plans, grazing schedules, and breeding programs. Learn about cost considerations, ease of use, and how mobile apps can help you track everything from your phone.

Whether you have a small farm or manage hundreds of animals, NTDM animal hospital will help you understand and use and access this smart tracking technology at your farm thus, saving money, reducing losses and, improve your animal welfare.`,
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
    content: `Dairy farming is one of the most important sectors in Rwandan agriculture, but it comes with health challenges. Cattle are prone to several diseases that, if not managed early, can severely affect milk production and overall farm productivity. That's where our platform comes in—we help farmers by connecting them directly with qualified veterinary professionals who provide timely support and expert care.

This dives deep into the most frequent diseases affecting dairy cattle, including mastitis, lumpy skin disease, foot and mouth disease, East Coast fever, and tick-borne infections. Each disease is explained with its causes, signs, and how it spreads, giving you the knowledge you need to recognize issues early and act fast—with the support of a vet when needed.

More importantly, we provide actionable prevention strategies. Through our platform, farmers can learn how to implement effective vaccination schedules, parasite control programs, proper milking hygiene, and how to isolate sick animals. We also emphasize the importance of early detection through regular observation and veterinary check-ups, which can easily be arranged through the connections we facilitate between you and trusted animal health experts.`,
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
    content: `Online veterinary services have become increasingly popular, especially in rural areas where clinics may be far. Through our platform, we help farmers access trusted vets remotely, making professional care easier to reach no matter where you are. This article prepares you to make the most out of your virtual vet consultation and shows how our service can support you throughout the process.

We explain how to choose a reliable vet platform—like ours—prepare your animal for the call, and what to have ready, such as clear photos, short videos, and a record of symptoms. You'll also learn which conditions are suitable for virtual treatment and when a physical visit might still be necessary. If needed, we help you coordinate both.

Virtual consultations arranged through our platform can help diagnose skin issues, behavioral changes, minor injuries, and offer personalized guidance on feeding, medication use, and wound care. We also cover key topics like data privacy, consultation fees, and how prescriptions are handled in a virtual setting, giving you clarity before the call even begins.

By the end, you'll feel confident using online veterinary care through our service—for both emergencies and routine health advice. It's a flexible, fast, and affordable option that brings expert help to your farm, whenever and wherever you need it.`,
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
    content: `Bringing a dog or cat into your home can be a deeply rewarding experience—but it requires thoughtful consideration. Pets are not just animals; they become companions, part of your daily life, and even reflections of your lifestyle and emotional needs.

Start by assessing your routine and home environment. If you're often busy, travel frequently, or live in a small apartment, a cat or a low-energy dog breed may be a better match. On the other hand, if you have more space, time, and energy to spare, an active dog breed might be perfect for you. Think about how much time you can dedicate to walks, grooming, and playtime—because your pet's happiness depends on it.

Health is another essential factor. A healthy pet not only saves you from high vet bills but also brings more joy and fewer worries. Look for signs such as clear eyes, clean ears, shiny fur, and alert, friendly behavior. Avoid adopting animals that appear lethargic, aggressive, or show signs of illness.

Choosing where to get your pet is just as important. Responsible breeders and certified animal shelters can make all the difference. They not only prioritize the animal's well-being but also help match pets to the right homes. Whether you're a first-time pet parent, have young children, or are looking for a calming emotional companion, there's a cat or dog that fits your needs we got you covered.`,
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
    content: `Sustainability in livestock farming is about producing more with less. Less waste, less environmental damage, and fewer resources. Through our platform, we connect livestock owners with professionals who help them adopt practical, sustainable farming methods that benefit both the planet and their bottom line. These aren't just ideas—they're services you can access through the network we've built to support farmers like you.

We begin with waste management practices such as composting manure into organic fertilizer and managing runoff to protect nearby water sources. Farmers can get guidance on setting up these systems directly from experts we link them to. We also explore grazing systems like rotational grazing, which preserve pasture quality, reduce erosion, and promote healthier herds over time.

Water conservation is another key area where we support farmers. This explains how to build rainwater harvesting systems and reduce water wastage during cleaning and feeding. And through our service connections, you can access on-farm advice or assistance for setting up these systems. We also highlight renewable energy options, such as using biogas from animal waste—an efficient, eco-friendly way to reduce costs while managing waste.

Moreover, sustainability goes hand in hand with animal welfare. Healthier animals are more productive and use fewer resources, which is why we emphasize the importance of proper nutrition, clean housing, and stress reduction. These services are all accessible through the veterinary professionals we help you connect with.`,
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
    content: `Many farmers only call a vet when animals are already sick, but regular check-ups can save time, money, and animal lives. Through our platform, we make preventive veterinary care more accessible by connecting farmers with trusted animal health professionals who can support their herds before problems arise. This article explains the importance of routine care and how it contributes to long-term farm productivity.

We outline what a standard animal check-up involves—physical exams, vaccinations, deworming, and blood tests—all of which you can arrange through the vets we link you with. You'll learn how these procedures help detect hidden issues like early-stage infections, nutritional deficiencies, or reproductive problems before they escalate.

Regular visits also allow the vet to keep proper medical records, monitor animal growth, and update vaccination schedules. For breeding animals, this plays a key role in managing fertility and avoiding complications that could affect performance or output.

This features real-life case studies from farmers who reduced both mortality and treatment costs simply by adopting scheduled check-ups and health tracking. We also provide a downloadable calendar to help you plan quarterly or bi-annual visits, which our platform can help coordinate.

Preventive health care isn't just for large farms. Whether you're a backyard farmer or managing a small herd, these services are within reach, thanks to our network—helping you raise healthier animals that grow better, produce more, and make your work less stressful.`,
  },
]

interface BlogPostPageProps {
  params: Promise<{ id: string }>
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params
  const postId = Number.parseInt(id)
  const post = blogPosts.find((p) => p.id === postId)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-16 pb-8 max-w-4xl">
        <div className="mb-8">
          <Card className="overflow-hidden">
            <div className="relative h-64 md:h-96">
              <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                {post.category}
              </div>
            </div>

            <CardContent className="p-8">
              <div className="flex items-center text-sm text-muted-foreground mb-6">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{post.date}</span>
                <span className="mx-3">•</span>
                <User className="h-4 w-4 mr-2" />
                <span>{post.author}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-balance">{post.title}</h1>

              <div className="prose prose-lg max-w-none text-foreground">
                {post.content.split("\n\n").map((paragraph, index) => (
                  <p key={index} className="mb-6 leading-relaxed text-pretty">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button asChild>
            <Link href="/blog">Read More Articles</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
