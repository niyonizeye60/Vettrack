"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PawPrint } from "lucide-react";
import { useState, useEffect, ReactNode } from "react";
import { useMobileSidebar } from "./mobile-sidebar-context";

export interface StaffNavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

interface StaffSidebarProps {
  /** Portal name shown beside the brand mark, already translated. */
  portalLabel: string;
  /** The portal root. Matched exactly for the active state so it isn't always lit. */
  homeHref: string;
  items: StaffNavItem[];
  /** Extra footer content, rendered above the copyright line and hidden when collapsed. */
  footer?: ReactNode;
  brandIcon?: ReactNode;
}

/**
 * The staff portal sidebar. Every staff portal renders this one component with its
 * own items rather than keeping a copy - see components/admin/admin-sidebar.tsx and
 * the marketplace/finance shells for how little each caller has to supply.
 */
export default function StaffSidebar({
  portalLabel,
  homeHref,
  items,
  footer,
  brandIcon,
}: StaffSidebarProps) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useMobileSidebar();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  const showSidebar = (isMobile && mobileOpen) || !isMobile;
  const expanded = !collapsed || isMobile;

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
              {expanded && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-green-600 flex-shrink-0">
                    {brandIcon ?? <PawPrint className="h-5 w-5 sm:h-6 sm:w-6" />}
                  </span>
                  <span className="font-bold text-gray-900 text-base sm:text-lg leading-tight tracking-tight min-w-0">
                    {portalLabel}
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
              {items.map((item) => {
                const isActive =
                  item.href === homeHref
                    ? pathname === homeHref
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setMobileOpen(false)}
                      className={`
                        flex items-center py-2.5 px-3 rounded-lg text-sm font-medium
                        ${!expanded ? "justify-center" : "gap-3"}
                        ${isActive
                          ? "bg-green-600 text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }
                        transition-colors duration-150
                      `}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {expanded && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-200 text-xs text-gray-500">
              {expanded ? (
                <div className="space-y-2">
                  {footer}
                  <p className="text-center sm:text-left pt-1">© {new Date().getFullYear()} {portalLabel}</p>
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
