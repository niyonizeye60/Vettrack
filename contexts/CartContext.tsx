"use client"

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react"

export type CartCategory = "sales" | "drugs" | "feeds"

export interface CartItem {
  id: string
  categoryId: string
  category: CartCategory
  name: string
  image: string
  price: number
  quantity: number
  maxQuantity?: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  subtotal: number
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clear: () => void
}

const CART_STORAGE_KEY = "ntdm-cart"

const CartContext = createContext<CartContextValue | null>(null)

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setItems(readStoredCart())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  const addItem: CartContextValue["addItem"] = (item, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      const cap = item.category === "sales" ? 1 : item.maxQuantity
      if (existing) {
        const nextQuantity = cap ? Math.min(existing.quantity + quantity, cap) : existing.quantity + quantity
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQuantity } : i))
      }
      const initialQuantity = cap ? Math.min(quantity, cap) : quantity
      return [...prev, { ...item, maxQuantity: cap, quantity: initialQuantity }]
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const cap = i.category === "sales" ? 1 : i.maxQuantity
        const bounded = cap ? Math.min(Math.max(1, quantity), cap) : Math.max(1, quantity)
        return { ...i, quantity: bounded }
      })
    )
  }

  const clear = () => setItems([])

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items])

  return (
    <CartContext.Provider value={{ items, count, subtotal, addItem, removeItem, updateQuantity, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider")
  }
  return ctx
}
