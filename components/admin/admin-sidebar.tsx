"use client";

import {
  Home,
  Users,
  FileText,
  BarChart3,
  MessageSquare,
  Calendar,
  PawPrint,
  Stethoscope,
  Store,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import StaffSidebar from "@/components/staff/staff-sidebar";

export default function AdminSidebar() {
  const { t } = useLanguage();
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [supportTickets, setSupportTickets] = useState(0);

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
    // { href: "/marketplace/listings", label: t("admin.marketplaceListings"), icon: <Store className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/admin/reports", label: t("admin.reports"), icon: <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/admin/support", label: t("admin.support"), icon: <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/admin/appointments", label: t("admin.appointments"), icon: <Calendar className="h-4 w-4 sm:h-5 sm:w-5" /> },
    ...(process.env.NODE_ENV !== "production"
      ? [{ href: "/admin/diseases", label: t("admin.diseaseOversight"), icon: <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" /> }]
      : []),
  ];

  return (
    <StaffSidebar
      portalLabel={t("admin.portal")}
      homeHref="/admin"
      items={navItems}
      brandIcon={<PawPrint className="h-5 w-5 sm:h-6 sm:w-6" />}
      footer={
        <>
          <div className="flex justify-between">
            <span>{t("admin.activeUsersCount")} <strong className="text-gray-700">{activeUsersCount}</strong></span>
          </div>
          <div className="flex justify-between">
            <span>{t("admin.ticketsCount")} <strong className="text-gray-700">{supportTickets}</strong></span>
          </div>
        </>
      }
    />
  );
}
