"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Mail, Trash2, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Subscriber {
  _id: string
  email: string
  status: string
  subscribedAt: string
  resubscribedAt?: string
}

interface Props {
  subscribers: Subscriber[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function SubscribersPageClient({ subscribers: initial }: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleDelete() {
    if (!deleteTarget) return
    const id = deleteTarget._id
    setDeleteTarget(null)
    const res = await fetch(`/api/newsletter?id=${id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      toast({ title: t('superadmin.subscriberRemoved'), description: deleteTarget.email })
      startTransition(() => router.refresh())
    } else {
      toast({ title: t('common.error'), description: data.error, variant: "destructive" })
    }
  }

  const activeCount = initial.filter((s) => s.status === "active").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('superadmin.newsletterSubscribers')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('superadmin.newsletterSubscribersDesc')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('superadmin.totalSubscribers')}</p>
            <p className="text-2xl font-bold text-gray-900">{initial.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <Mail className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('superadmin.activeSubscribers')}</p>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          </div>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{t('superadmin.subscriberList')}</h2>
        </div>

        {initial.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Mail className="h-10 w-10 mb-3 opacity-40" />
            <p>{t('superadmin.noSubscribersYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">#</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">{t('superadmin.email')}</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">{t('superadmin.status')}</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">{t('superadmin.subscribedAt')}</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {initial.map((sub, idx) => (
                  <tr key={sub._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{sub.email}</td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          sub.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }
                        variant="outline"
                      >
                        {sub.status === "active" ? t('superadmin.active') : t('superadmin.unsubscribed')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(sub.subscribedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setDeleteTarget(sub)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('superadmin.removeSubscriber')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('superadmin.removeSubscriberDesc')} <strong>{deleteTarget?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('superadmin.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
