"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { ShoppingCart, Trash2 } from "lucide-react"
import { useCart } from "@/contexts/CartContext"
import { useLanguage } from "@/contexts/LanguageContext"
import CartLineItem from "@/components/cart/cart-line-item"

export default function CartDrawer({ className = "" }: { className?: string }) {
  const { items, count, subtotal, clear } = useCart()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${className}`}
          onClick={() => setOpen(true)}
          aria-label={t('cart.title')}
        >
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary">
              {count > 9 ? "9+" : count}
            </Badge>
          )}
        </Button>

        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>{t('cart.title')}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <ShoppingCart className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600">{t('cart.empty')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('cart.emptyDesc')}</p>
              </div>
            ) : (
              items.map((item) => <CartLineItem key={item.id} item={item} />)
            )}
          </div>

          {items.length > 0 && (
            <SheetFooter className="flex-col gap-3 sm:flex-col border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between w-full text-sm font-medium">
                <span className="text-gray-600">{t('cart.subtotal')}</span>
                <span className="text-lg font-bold text-gray-900">RWF {subtotal.toLocaleString()}</span>
              </div>
              <Button asChild className="w-full" onClick={() => setOpen(false)}>
                <Link href="/checkout">{t('cart.checkout')}</Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('cart.clear')}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cart.clearConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cart.clearConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { clear(); setConfirmClear(false) }}
            >
              {t('cart.clear')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
