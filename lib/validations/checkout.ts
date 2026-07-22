import { z } from "zod"

// Matches Rwandan mobile numbers in local (07XXXXXXXX) or international
// (+2507XXXXXXXX / 2507XXXXXXXX) format.
const RWANDA_PHONE_REGEX = /^(\+?250|0)7[2-9]\d{7}$/

export const buyerSchema = z.object({
  name: z.string().trim().min(2, "Full name is required"),
  phone: z.string().trim().regex(RWANDA_PHONE_REGEX, "Enter a valid Rwandan phone number"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  district: z.string().trim().optional().or(z.literal("")),
  sector: z.string().trim().optional().or(z.literal("")),
  village: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
})

export type Buyer = z.infer<typeof buyerSchema>

export const orderItemInputSchema = z.object({
  serviceId: z.string().min(1),
  quantity: z.number().int().min(1).max(999),
})

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "Your cart is empty"),
  buyer: buyerSchema,
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const intouchPhoneSchema = z.object({
  mobilePhone: z.string().trim().regex(RWANDA_PHONE_REGEX, "Enter a valid Rwandan phone number"),
})
