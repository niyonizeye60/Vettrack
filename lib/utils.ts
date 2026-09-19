import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a phone number for IntouchPay API (expects 250XXXXXXXXX format)
 */
export function formatPhoneForIntouchPay(raw: string): string {
  let phone = raw.replace(/\s+/g, "")
  if (phone.startsWith("0")) {
    phone = "250" + phone.slice(1)
  } else if (phone.startsWith("+250")) {
    phone = phone.slice(1) // +250... -> 250...
  } else if (!phone.startsWith("250")) {
    phone = "250" + phone
  }
  return phone
}
