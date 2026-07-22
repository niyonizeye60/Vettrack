"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  Settings,
  ClipboardList,
} from "lucide-react"

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/dashboard/veterinary",
    icon: LayoutDashboard,
  },
  {
    title: "Consultation Management",
    href: "/dashboard/veterinary/consultations_management",
    icon: ClipboardList,
  },
  {
    title: "Schedule",
    href: "/dashboard/veterinary/schedule",
    icon: Calendar,
  },
  {
    title: "Patients",
    href: "/dashboard/veterinary/patients",
    icon: Users,
  },
  {
    title: "Messages",
    href: "/dashboard/veterinary/messages",
    icon: MessageSquare,
  },
  {
    title: "Settings",
    href: "/dashboard/veterinary/settings",
    icon: Settings,
  },
]

export default function VeterinarySidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {sidebarItems.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={pathname === item.href ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start",
            pathname === item.href && "bg-secondary"
          )}
        >
          <Link href={item.href}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.title}
          </Link>
        </Button>
      ))}
    </div>
  )
} 