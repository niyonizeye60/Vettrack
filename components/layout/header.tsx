"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Image from "next/image"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useLanguage } from "@/contexts/LanguageContext"
import CartDrawer from "@/components/cart/cart-drawer"

// Navigation items will be translated dynamically

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { t } = useLanguage()
  
  const navItems = [
    { name: t('nav.home'), href: "/" },
    { name: t('nav.services'), href: "/services" },
    { name: t('nav.about'), href: "/about" },
    { name: t('nav.blog'), href: "/blog" },
    { name: t('nav.contact'), href: "/contact" },
  ]

  // Force black nav items on Login, Register, password recovery, and any Blog page
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password";
  const forceBlackNav = isAuthPage || pathname.startsWith("/blog/");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 animate-fadeIn ${
        isAuthPage ? "bg-white/95 backdrop-blur-md shadow-md py-2" : isScrolled ? "bg-white/95 backdrop-blur-md shadow-md py-2" : "bg-transparent py-4"
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 transition-transform hover:scale-105">
            <div className="w-15 h-15  overflow-hidden">
              <Image
                src="/Group 2.svg?height=40&width=40&text=NTDM"
                alt="NTDM Animal Hospital Logo"
                width={100}
                height={100}
                className=" object-cover"
                style={{ boxShadow: "0 0 12px 2px white" }}
              />
            </div>
            {/* <span className="text-2xl font-bold gradient-text">NTDM Animal Hospital</span> */}
          </Link>

          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 hover:scale-105 transform ${
                  pathname === item.href
                    ? "text-white bg-primary shadow-md"
                    : forceBlackNav
                      ? "text-black hover:text-white hover:bg-primary/80"
                      : isScrolled
                        ? "text-black hover:text-white hover:bg-primary/80"
                        : "text-white hover:bg-primary/80"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex items-center space-x-2 ml-4">
              <LanguageSwitcher
                className={
                  forceBlackNav || isScrolled
                    ? "text-black hover:text-black hover:bg-primary/10"
                    : "text-white hover:text-white hover:bg-white/10"
                }
              />
              <CartDrawer
                className={
                  forceBlackNav || isScrolled
                    ? "text-black hover:text-black hover:bg-primary/10"
                    : "text-white hover:text-white hover:bg-white/10"
                }
              />
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/login">{t('nav.login')}</Link>
              </Button>
              <Button asChild className="rounded-full">
                <Link href="/register">{t('nav.register')}</Link>
              </Button>
            </div>
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <CartDrawer className={forceBlackNav ? "text-black" : isScrolled ? "text-black" : "text-white"} />
            <Button
              size="icon"
              className="bg-primary text-white hover:bg-primary/90"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 bg-white rounded-lg shadow-lg p-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-4 py-3 rounded-full text-base font-medium mb-2 transition-colors duration-300 ${
                  pathname === item.href
                    ? "text-white bg-primary shadow-md"
                    : "text-black hover:text-white hover:bg-primary/80"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex justify-center mb-4">
              <LanguageSwitcher className="text-black hover:text-black" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">{t('nav.login')}</Link>
              </Button>
              <Button asChild className="w-full">
                <Link href="/register">{t('nav.register')}</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
