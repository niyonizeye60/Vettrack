"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  Stethoscope,
  Settings,
  MessageSquare,
  Bell,
  Menu
} from "lucide-react";
import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FarmerSidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check if mobile on initial load and resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setCollapsed(window.innerWidth < 1024);
    };

    // Initial check
    checkIfMobile();

    // Add resize listener
    window.addEventListener('resize', checkIfMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const navItems = [
    { href: "/farmer", label: t('farmer.dashboard'), icon: <Home className="h-5 w-5" /> },
    { href: "/farmer/animals", label: t('farmer.animals'), icon: <User className="h-5 w-5" /> },
    { href: "/farmer/consultations", label: t('farmer.consultations'), icon: <Stethoscope className="h-5 w-5" /> },
    { href: "/farmer/tracking", label: t('farmer.tracking'), icon: <Activity className="h-5 w-5" /> },
    { href: "/farmer/messages", label: t('farmer.messages'), icon: <MessageSquare className="h-5 w-5" /> }
  ];

  // Toggle sidebar visibility on mobile
  const toggleMobileMenu = () => {
    setMobileOpen(!mobileOpen);
  };

  // Toggle sidebar collapse state
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Determine if sidebar should be shown
  const showSidebar = (isMobile && mobileOpen) || !isMobile;

  // Mobile menu button visible only on small screens
  const mobileMenuButton = (
    <button
      onClick={toggleMobileMenu}
      className="fixed bottom-4 left-4 md:hidden z-20 bg-green-600 text-white p-3 rounded-full shadow-lg"
    >
      <Bell className="h-6 w-6" />
    </button>
  );

  return (
    <>
      {isMobile && mobileMenuButton}

      {showSidebar && (
        <div className={`
          ${isMobile ? "fixed inset-0 z-50" : "sticky top-0 h-screen z-30"} 
          flex
        `}>
          {/* Overlay for mobile */}
          {isMobile && (
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <nav className={`
            ${collapsed ? "w-16" : "w-64"} 
            ${isMobile ? "w-64 ml-0" : ""} 
            bg-white shadow-lg z-10 transition-all duration-300 
            flex flex-col h-full
            border-r border-gray-200
            relative
          `}>
            {/* Sidebar header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              {!collapsed && (
                <div className="font-bold text-green-700">{t('farmer.portal')}</div>
              )}
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <Menu
                    className={`h-5 w-5 text-gray-500 transform transition-transform duration-300 ease-in-out ${collapsed ? "rotate-180" : ""
                      }`}
                  />
                </button>
              )}
            </div>

            {/* Navigation items */}
            <ul className="space-y-1 pt-4 flex-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center py-3 px-4 
                        ${collapsed && !isMobile ? "justify-center" : "space-x-3"} 
                        ${isActive
                          ? "bg-green-50 text-green-700 border-l-4 border-green-600"
                          : "text-gray-600 hover:bg-gray-50"
                        }
                        transition
                      `}
                    >
                      <span>{item.icon}</span>
                      {(!collapsed || isMobile) && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Footer section */}
            <div className="p-4 border-t border-gray-100 text-xs text-gray-500">
              {!collapsed && (
                <p>© {new Date().getFullYear()} {t('farmer.portal')}</p>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}