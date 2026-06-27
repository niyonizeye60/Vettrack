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
  Menu,
  UserCircle,
  Milk
} from "lucide-react";
import { useState, useEffect } from "react";
import { Activity, Trash2, ShieldAlert, Syringe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMobileSidebar } from "./mobile-sidebar-context";

export default function FarmerSidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useMobileSidebar();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if mobile on initial load and resize
  useEffect(() => {
    setMounted(true);
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
    { href: "/farmer", label: t('farmer.dashboard'), icon: <Home className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/farmer/animals", label: t('farmer.animals'), icon: <User className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/farmer/milk", label: t('farmer.milk'), icon: <Milk className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/farmer/consultations", label: t('farmer.consultations'), icon: <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/farmer/tracking", label: t('farmer.tracking'), icon: <Activity className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/farmer/waste", label: t('farmer.waste'), icon: <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/farmer/insemination", label: t('farmer.insemination'), icon: <Syringe className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/farmer/diseases", label: t('farmer.diseases'), icon: <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/farmer/messages", label: t('farmer.messages'), icon: <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ];

  // Toggle sidebar collapse state
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Determine if sidebar should be shown
  const showSidebar = (isMobile && mobileOpen) || !isMobile;

  if (!mounted) return null;

  return (
    <>
      {showSidebar && (
        <div className={`
          ${isMobile ? "fixed inset-0 z-[60]" : "sticky top-0 h-screen z-30"}
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
            <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between">
              {(!collapsed || isMobile) && (
                <div className="font-bold text-emerald-700 text-sm sm:text-base">{t('farmer.portal')}</div>
              )}
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  aria-label="Toggle sidebar"
                >
                  <Menu
                    className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transform transition-transform duration-300 ease-in-out ${collapsed ? "rotate-180" : ""
                      }`}
                  />
                </button>
              )}
            </div>

            {/* Navigation items */}
            <ul className="space-y-1 pt-3 sm:pt-4 flex-1 overflow-y-auto px-2 sm:px-0">
              {navItems.map((item) => {
                const isActive = item.href === "/farmer"
                  ? pathname === "/farmer"
                  : pathname === item.href || pathname?.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setMobileOpen(false)}
                      className={`
                        flex items-center py-3 px-3 sm:px-4 rounded-lg sm:rounded-none
                        ${collapsed && !isMobile ? "justify-center" : "space-x-2 sm:space-x-3"} 
                        ${isActive
                          ? "bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }
                        transition-all duration-200 min-h-[44px] sm:min-h-[40px]
                      `}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {(!collapsed || isMobile) && <span className="text-sm sm:text-base truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Footer section */}
            <div className="p-3 sm:p-4 border-t border-gray-100 text-xs text-gray-500">
              {(!collapsed || isMobile) && (
                <p className="text-center sm:text-left">© {new Date().getFullYear()} {t('farmer.portal')}</p>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}