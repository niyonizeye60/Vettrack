"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ServiceCard from "@/components/services/service-card"
import { Activity, Video, ShieldAlert, ShoppingBag, Pill, Wheat, FileText, MapPin, Stethoscope, Shield, DollarSign, Brain } from "lucide-react"

// Service data
const services = {
  tracking: [
    {
      id: "t1",
      name: "Animal Health Tracking Device",
      description: "Real-time location tracking for your livestock with mobile app access.",
      price: 43300,
      duration: "Device + 3 months service",
      image: "/tracking/track2.png",
    },
    {
      id: "t2",
      name: "Advanced Health Monitoring",
      description: "Track vital signs, activity levels, and health indicators in real-time.",
      price: 500,
      duration: "Device + 3 months service",
      image:
        "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
    {
      id: "t3",
      name: "Pig Management System",
      description: "Comprehensive tracking solution for large herds with analytics dashboard.",
      price: 500,
      duration: "10 devices + 6 months service",
      image:
        "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
    {
      id: "t4",
      name: "Pet Tracking Collar",
      description: "Lightweight GPS collar for dogs and cats with geofencing alerts.",
      price: 5000,
      duration: "Device + 3 months service",
      image: "/tracking/track3.png",
    },
  ],
  consultations: [
    {
      id: "c1",
      name: "General Veterinary Consultation",
      description: "Comprehensive health check-up and consultation for any animal.",
      price: 5000,
      duration: "30 min",
      image: "/consultations/cons1.png",
    },
    {
      id: "c2",
      name: "Virtual Consultation",
      description: "Connect with our veterinarians remotely via video call.",
      price: 500,
      duration: "20 min",
      image: "/consultations/cons2.jpg",
    },
    {
      id: "c3",
      name: "Emergency Consultation",
      description: "Immediate attention for urgent animal health issues.",
      price: 600,
      duration: "Priority service",
      image:
        "https://images.unsplash.com/photo-1612531385446-f7e6d131e1d0?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
    {
      id: "c4",
      name: "Farm Visit",
      description: "Our veterinarians come to your farm for on-site consultations and treatments.",
      price: 15000,
      duration: "2 hours + travel",
      image: "/consultations/cons3.jpg",
    },
  ],
  monitoring: [
    {
      id: "m1",
      name: "Disease Screening",
      description: "Comprehensive testing for common livestock and pet diseases.",
      price: 3000,
      duration: "Results in 48 hours",
      image: "/monitoring/vac2.jpg",
    },
    {
      id: "m2",
      name: "Vaccination Program",
      description: "Scheduled vaccinations with reminders and health tracking.",
      price: 100,
      duration: "Annual program",
      image: "/monitoring/vac1.png",
    },
    {
      id: "m3",
      name: "Parasite Control",
      description: "Regular monitoring and treatment for internal and external parasites.",
      price: 2000,
      duration: "Quarterly treatment",
      image:
        "https://images.unsplash.com/photo-1599443015574-be5fe8a05783?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
    {
      id: "m4",
      name: "Reproductive Health Monitoring",
      description: "Track breeding cycles, pregnancy, and reproductive health.",
      price: 500,
      duration: "Per animal",
      image:
        "https://images.unsplash.com/photo-1596733430284-f7437764b1a9?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
  ],
  sales: [
    {
      id: "s1",
      name: "Dairy Cattle",
      description: "High-yielding dairy cows with health certification and follow-up care.",
      price: 5000,
      duration: "Includes delivery",
      image:
        "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
    {
      id: "s2",
      name: "Poultry",
      description: "Healthy chickens for egg production or meat with vaccination history.",
      price: 200,
      duration: "Bulk discounts available",
      image:
        "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
    {
      id: "s3",
      name: "Goats and Sheep",
      description: "Quality small ruminants for dairy or meat production.",
      price: 500,
      duration: "Health guaranteed",
      image: "/services/pet4.jpg",
    },
    {
      id: "s4",
      name: "Pet Adoption",
      description: "Adopt a healthy, vaccinated pet with ongoing veterinary support.",
      price: 5000,
      duration: "Includes initial check-up",
      image:
        "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
    {
      id: "s5",
      name: "Porks",
      description: "The Best pork Breed and veterinary support.",
      price: 2000,
      duration: "Includes initial check-up",
      image: "/services/pet2.jpg",
    },
  ],
  drugs: [
    {
      id: "d1",
      name: "Basic Veterinary Kit",
      description: "Essential medications for common animal health issues.",
      price: 200,
      duration: "30 day supply",
      image:
        "https://th.bing.com/th/id/OIP.uvzZ5gbvONhZ_Iej4Q11TAHaEo?r=0&pid=ImgDet&w=199&h=124&c=7&dpr=1.5",
    },
    {
      id: "d2",
      name: "Antibiotics Package",
      description: "Wide range of antibiotics for bacterial infections in livestock.",
      price: 200,
      duration: "Various sizes available",
      image:
        "https://jpabs.org/800/600/http/images.jdmagicbox.com/comp/sangli/h1/9999px233.x233.130402132127.i2h1/catalogue/basawant-pharma-islampur-sangli-sangli-veterinary-medicine-retailers-ksnqys2.jpg",
    },
    {
      id: "d3",
      name: "Vaccines Package",
      description: "Preventative vaccines for common livestock diseases.",
      price: 200,
      duration: "10 doses",
      image:
        "https://5.imimg.com/data5/FB/QY/MY-4841311/veterinary-vaccines-500x500.jpg",
    },
    {
      id: "d4",
      name: "Pet Care Package",
      description: "Medications and supplements specifically for dogs and cats.",
      price: 200,
      duration: "Monthly supply",
      image:
        "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
    {
      id: "d5",
      name: "Dewormers",
      description: "Effective deworming medications for all types of animals.",
      price: 200,
      duration: "10 treatments",
      image:
        "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
  ],
  feeds: [
    {
      id: "f1",
      name: "Premium Cattle Feed",
      description: "High-nutrition feed for dairy and beef cattle.",
      price: 200,
      duration: "50kg bag",
      image:
        "https://ruralhq.co.nz/wp-content/uploads/2019/03/shutterstock_659176180.jpg",
    },
    {
      id: "f2",
      name: "Poultry Feed",
      description: "Balanced feed for layers and broilers.",
      price: 200,
      duration: "25kg bag",
      image:
        "https://th.bing.com/th/id/OIP.Qmi6sQ8jivUD_KCoVs-O6wHaEz?r=0&pid=ImgDet&w=199&h=128&c=7&dpr=1.5",
    },
    {
      id: "f3",
      name: "Goat & Sheep Feed",
      description: "Specially formulated for small ruminants.",
      price: 200,
      duration: "25kg bag",
      image:
        "https://th.bing.com/th/id/OIP.gc7yiDLMGglfb9tM-ZZegwHaE7?r=0&pid=ImgDet&w=199&h=132&c=7&dpr=1.5",
    },
    {
      id: "f4",
      name: "Organic Feed Supplement",
      description: "Natural additives to boost animal health and productivity.",
      price: 200,
      duration: "5kg package",
      image:
        "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
    {
      id: "f5",
      name: "Pet Food",
      description: "High-quality food for dogs and cats.",
      price: 200,
      duration: "10kg bag",
      image:
        "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
     {
      id: "f6",
      name: "Pig",
      description: "High-quality food for pig.",
      price: 200,
      duration: "10kg bag",
      image:
        "https://www.pigprogress.net/app/uploads/2021/12/001_198_IMG_PPR_25_EXPERT_FM_Feedstructureinswinediets-1024x683.jpg",
    },
  ],
  government: [
    {
      id: "g1",
      name: "Access RVSMS",
      description: "Rwanda Veterinary SMS Management System - Access the government veterinary services portal.",
      price: "Free Access",
      duration: "Online portal",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-7Mn99yF88tjmOB5fPByC1VgcKxCUhM.png",
      link: "https://rvsms.vercel.app/",
    },
    {
      id: "g3",
      name: "Export Certification",
      description: "Preparation of all documents for animal product exports.",
      price: 15000,
      duration: "Per certification",
      image:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
    {
      id: "g6",
      name: "Disease Reporting",
      description: "Proper documentation and reporting of notifiable diseases.",
      price: 5000,
      duration: "Per report",
      image:
        "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&h=350&fit=crop&crop=focalpoint&auto=format&q=80",
    },
  ],
Ai: [

  "Coming Soon"
   
],

}

export default function ServicesTabs() {
  const [activeTab, setActiveTab] = useState("tracking")
  const [categories, setCategories] = useState<{sales: any[], drugs: any[], feeds: any[]}>({
    sales: [],
    drugs: [],
    feeds: []
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  // Filter services based on active tab
  const getFilteredServices = () => {
    if (activeTab === 'sales' || activeTab === 'drugs' || activeTab === 'feeds') {
      return categories[activeTab as keyof typeof categories] || []
    }
    return services[activeTab as keyof typeof services] || []
  }

  return (
    <>
      <Tabs defaultValue="tracking" onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-8 overflow-x-auto px-4">
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 sm:hidden"></div>
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 sm:hidden"></div>
            <TabsList className="bg-muted/50 flex-nowrap min-w-max px-2">
              <TabsTrigger value="tracking" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap min-w-[44px] sm:min-w-auto">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Tracking</span>
              </TabsTrigger>
              <TabsTrigger value="consultations" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap min-w-[44px] sm:min-w-auto">
                <Stethoscope className="h-4 w-4" />
                <span className="hidden sm:inline">Consultations</span>
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap min-w-[44px] sm:min-w-auto">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Monitoring</span>
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap min-w-[44px] sm:min-w-auto">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Animal Sales</span>
              </TabsTrigger>
              <TabsTrigger value="drugs" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap min-w-[44px] sm:min-w-auto">
                <Pill className="h-4 w-4" />
                <span className="hidden sm:inline">Pharmacy</span>
              </TabsTrigger>
              <TabsTrigger value="feeds" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap min-w-[44px] sm:min-w-auto">
                <Wheat className="h-4 w-4" />
                <span className="hidden sm:inline">Feeds</span>
              </TabsTrigger>
              <TabsTrigger value="government" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap min-w-[44px] sm:min-w-auto">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Gov Support</span>
              </TabsTrigger>
              <TabsTrigger value="Ai" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap min-w-[44px] sm:min-w-auto">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">AI Disease Prediction</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        {/* Mobile hint */}
        <div className="text-center text-sm text-gray-500 mb-4 sm:hidden">
          👈 Swipe to see more services 👉
        </div>

        <TabsContent value="tracking" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.tracking.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="consultations" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.consultations.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.monitoring.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.sales.map((category) => (
              <ServiceCard key={category.id} service={{
                id: category.id,
                name: category.name,
                description: category.description,
                price: 'View Items',
                duration: '',
                image: category.image,
                category: 'sales'
              }} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="drugs" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.drugs.map((category) => (
              <ServiceCard key={category.id} service={{
                id: category.id,
                name: category.name,
                description: category.description,
                price: 'View Items',
                duration: '',
                image: category.image,
                category: 'drugs'
              }} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="feeds" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.feeds.map((category) => (
              <ServiceCard key={category.id} service={{
                id: category.id,
                name: category.name,
                description: category.description,
                price: 'View Items',
                duration: '',
                image: category.image,
                category: 'feeds'
              }} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="government" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.government.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}