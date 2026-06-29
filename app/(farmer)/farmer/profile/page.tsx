"use client";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function FarmerProfilePage() {
  const { t } = useLanguage();
  const [user, setUser] = useState<{ name?: string; email?: string; image?: string; phone?: string; location?: string; bio?: string } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const userData = await getCurrentUser();
      setUser(userData);
    }
    fetchUser();
  }, []);

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">{t('farmer.myProfile')}</h1>
      <div className="flex flex-col items-center mb-8">
        <Avatar className="w-28 h-28 mb-3 border-4 border-green-200">
          <AvatarImage src={user?.image} alt={user?.name || "Profile"} />
          <AvatarFallback className="bg-emerald-500 text-white text-3xl">
            {user?.name ? user.name.charAt(0).toUpperCase() : "F"}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-semibold">{user?.name || t('farmer.farmer')}</h2>
        <p className="text-gray-600">{user?.email || "your@email.com"}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('farmer.fullName')}</label>
          <input
            type="text"
            value={user?.name || ""}
            disabled
            className="w-full border rounded px-3 py-2 mt-1 bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('common.email')}</label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full border rounded px-3 py-2 mt-1 bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('common.phone')}</label>
          <input
            type="tel"
            value={user?.phone || ""}
            disabled
            className="w-full border rounded px-3 py-2 mt-1 bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('common.location')}</label>
          <input
            type="text"
            value={user?.location || ""}
            disabled
            className="w-full border rounded px-3 py-2 mt-1 bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('farmer.bio')}</label>
          <textarea
            value={user?.bio || ""}
            disabled
            className="w-full border rounded px-3 py-2 mt-1 bg-gray-100"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}