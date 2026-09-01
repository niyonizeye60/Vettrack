"use client"

import { useState, useEffect, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, Settings, LogOut, User, Shield, Loader2 } from "lucide-react"
import { logoutUser, getCurrentUser } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat"
import { useMobileSidebar } from "./mobile-sidebar-context"

interface HeaderUser {
  _id: string
  name: string
  email: string
  role: string
  image?: string
}

interface StaffHeaderProps {
  /** Portal name, already translated. */
  portalLabel: string
  tagline?: string
  homeHref: string
  brandIcon?: ReactNode
  /** Portal-specific notifications control. Portals without one simply show no bell. */
  notifications?: ReactNode
  profileHref?: string
  settingsHref?: string
}

/**
 * Chrome shared by every staff portal: mobile nav toggle, brand, language switcher,
 * profile menu and logout. Anything portal-specific arrives as a prop, so the
 * marketplace and finance portals cost a handful of lines each rather than a copy
 * of this file.
 */
export default function StaffHeader({
  portalLabel,
  tagline,
  homeHref,
  brandIcon,
  notifications,
  profileHref,
  settingsHref,
}: StaffHeaderProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const { toggleMobileSidebar } = useMobileSidebar()
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getCurrentUser()
        setUser(userData ? { ...userData, _id: String(userData._id) } as HeaderUser : null)
      } catch (error) {
        console.error("Error fetching user:", error)
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logoutUser()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      setIsLoggingOut(false)
    }
  }

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "A"

  return (
    <header className="sticky top-0 z-50 h-14 sm:h-16 bg-white border-b border-gray-200 shadow-sm print:hidden">
      <PresenceHeartbeat />
      <div className="flex h-full items-center justify-between px-3 sm:px-6">

        {/* Left: mobile toggle + brand */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileSidebar}
            className="md:hidden p-2"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href={homeHref} className="flex items-center space-x-2 group">
            <span className="text-green-600 flex-shrink-0">
              {brandIcon ?? <Shield className="h-6 w-6 sm:h-7 sm:w-7" />}
            </span>
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">{portalLabel}</h1>
              {tagline && <p className="text-xs text-gray-500 hidden md:block">{tagline}</p>}
            </div>
          </Link>
        </div>

        {/* Right: language, notifications, avatar */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <LanguageSwitcher />

          {notifications}

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src={user?.image} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-green-100 text-green-600 text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium truncate max-w-32">{user?.name?.split(" ")[0] || portalLabel}</p>
                  <p className="text-xs text-gray-500 truncate max-w-32">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || portalLabel}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profileHref && (
                <DropdownMenuItem asChild>
                  <Link href={profileHref} className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {t("admin.profile")}
                  </Link>
                </DropdownMenuItem>
              )}
              {settingsHref && (
                <DropdownMenuItem asChild>
                  <Link href={settingsHref} className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    {t("admin.settings")}
                  </Link>
                </DropdownMenuItem>
              )}
              {(profileHref || settingsHref) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={handleLogout}
                disabled={isLoggingOut}
                onSelect={(e) => isLoggingOut && e.preventDefault()}
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {isLoggingOut ? t("auth.loggingOut") : t("admin.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
