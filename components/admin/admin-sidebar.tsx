"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Home,
  Users,
  FileText,
  BarChart3,
  MessageSquare,
  Calendar,
  PawPrint,
  Stethoscope,
  Menu,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMobileSidebar } from "./mobile-sidebar-context";

export default function AdminSidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useMobileSidebar();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [supportTickets, setSupportTickets] = useState(0);

  useEffect(() => {
    setMounted(true);
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setCollapsed(window.innerWidth < 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin-dashboard");
        if (response.ok) {
          const data = await response.json();
          setActiveUsersCount(data.stats.activeUsers);
          setSupportTickets(data.stats.supportTickets);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    fetchStats();
  }, []);

  const navItems = [
    { href: "/admin", label: t("admin.dashboard"), icon: <Home className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/admin/users", label: t("admin.users"), icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/admin/content", label: t("admin.content"), icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/admin/reports", label: t("admin.reports"), icon: <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/admin/support", label: t("admin.support"), icon: <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/admin/appointments", label: t("admin.appointments"), icon: <Calendar className="h-4 w-4 sm:h-5 sm:w-5" /> },
//  { href: "/admin/diseases", label: t("admin.diseaseOversight"), icon: <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ];

  const showSidebar = (isMobile && mobileOpen) || !isMobile;

  if (!mounted) return null;

  return (
    <>
      {showSidebar && (
        <div className={`${isMobile ? "fixed inset-0 z-[60]" : "sticky top-0 h-screen z-30"} flex print:hidden`}>
          {isMobile && (
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          )}

          <nav className={`
            ${collapsed ? "w-16" : "w-64"}
            ${isMobile ? "w-64 ml-0" : ""}
            bg-white shadow-lg z-10 transition-all duration-300
            flex flex-col h-full border-r border-gray-200 relative
          `}>
            {/* Brand header */}
            <div className="h-16 px-3 sm:px-4 border-b border-gray-100 flex items-center justify-between gap-2">
              {(!collapsed || isMobile) && (
                <div className="flex items-center gap-2 min-w-0">
                  <PawPrint className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
                  <span className="font-bold text-gray-900 text-base sm:text-lg leading-tight tracking-tight min-w-0">
                    {t("admin.portal")}
                  </span>
                </div>
              )}
              {!isMobile && (
                <button
                  onClick={() => setCollapsed((c) => !c)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Toggle sidebar"
                >
                  <Menu className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transform transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            {/* Nav items */}
            <ul className="space-y-2 pt-3 flex-1 overflow-y-auto px-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setMobileOpen(false)}
                      className={`
                        flex items-center py-2.5 px-3 rounded-lg text-sm font-medium
                        ${collapsed && !isMobile ? "justify-center" : "gap-3"}
                        ${isActive
                          ? "bg-green-600 text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }
                        transition-colors duration-150
                      `}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-200 text-xs text-gray-500">
              {(!collapsed || isMobile) ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t("admin.activeUsersCount")} <strong className="text-gray-700">{activeUsersCount}</strong></span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("admin.ticketsCount")} <strong className="text-gray-700">{supportTickets}</strong></span>
                  </div>
                  <p className="text-center sm:text-left pt-1">© {new Date().getFullYear()} {t("admin.portal")}</p>
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
