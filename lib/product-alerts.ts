import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { notifyFarmer, notifyMarketplaceStaff, sellerListingsPath } from "@/lib/marketplace-notifications"
import { addDays, EXPIRY_WARNING_DAYS, kigaliToday, lastSellableDay } from "@/lib/product-rules"
import { getSellByDays } from "@/lib/db-settings"

const DB_NAME = "ntdm_animal_hospital"

/** Enough of a product to say which one and who looks after it. */
export interface ProductRef {
  name: string
  sellerId?: string | null
  category?: string
}

/**
 * Tell whoever looks after a product: the pharmacy or feed supplier that listed it,
 * or marketplace staff for Vettrack's own stock.
 */
export async function notifyProductOwner(product: ProductRef, title: string, message: string) {
  if (product.sellerId && ObjectId.isValid(product.sellerId)) {
    await notifyFarmer(product.sellerId, title, message, sellerListingsPath(product.category))
  } else {
    await notifyMarketplaceStaff(title, message)
  }
}

export async function alertLowStock(product: ProductRef, remaining: number) {
  await notifyProductOwner(
    product,
    "Stock running low",
    `Only ${remaining} of "${product.name}" left. Update the stock when you restock so it stays on sale.`
  )
}

export async function alertOutOfStock(product: ProductRef) {
  await notifyProductOwner(
    product,
    "Out of stock",
    `"${product.name}" sold out and is no longer shown to buyers. Update its stock to show it again.`
  )
}

let lastSweep = 0
const SWEEP_INTERVAL_MS = 10 * 60_000

/**
 * Warn about expiry dates: once when a product comes within EXPIRY_WARNING_DAYS of
 * its sell-by cutoff, and once when it passes the cutoff and comes off sale.
 *
 * There is no scheduler to run this (see the session-triggered email fallback for why
 * cron can't be relied on), so it runs from busy reads - the public product list and
 * a pharmacy's own list - at most every ten minutes per server instance. Each warning
 * is claimed with a write before it is sent, so two instances can't both send it.
 */
export async function sweepExpiryAlerts(options: { force?: boolean } = {}): Promise<void> {
  const now = Date.now()
  if (!options.force && now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now

  try {
    const client = await clientPromise
    const services = client.db(DB_NAME).collection("services")
    const today = kigaliToday()
    const sellByDays = await getSellByDays()

    // Off sale first: a product that skipped straight past the warning window should
    // get the urgent message, not both.
    const offSale = await services
      .find({
        hidden: { $ne: true },
        expiresOn: { $type: "string", $gt: "", $lt: addDays(today, sellByDays) },
        expiryHiddenNotifiedAt: { $exists: false },
      })
      .limit(50)
      .toArray()
    for (const doc of offSale) {
      const claim = await services.updateOne(
        { _id: doc._id, expiryHiddenNotifiedAt: { $exists: false } },
        { $set: { expiryHiddenNotifiedAt: new Date(), expiryWarnedAt: doc.expiryWarnedAt ?? new Date() } }
      )
      if (claim.modifiedCount === 0) continue
      await notifyProductOwner(
        { name: doc.name, sellerId: doc.sellerId, category: doc.category },
        "Off sale: expiry date",
        `"${doc.name}" expires on ${doc.expiresOn}, so buyers can no longer order it. Update the listing when you restock with a newer batch.`
      )
    }

    const soon = await services
      .find({
        hidden: { $ne: true },
        expiresOn: { $type: "string", $gt: "", $lte: addDays(today, sellByDays + EXPIRY_WARNING_DAYS) },
        expiryWarnedAt: { $exists: false },
      })
      .limit(50)
      .toArray()
    for (const doc of soon) {
      const claim = await services.updateOne(
        { _id: doc._id, expiryWarnedAt: { $exists: false } },
        { $set: { expiryWarnedAt: new Date() } }
      )
      if (claim.modifiedCount === 0) continue
      await notifyProductOwner(
        { name: doc.name, sellerId: doc.sellerId, category: doc.category },
        "Expires soon",
        `"${doc.name}" expires on ${doc.expiresOn}. Buyers can order it until ${lastSellableDay(doc.expiresOn, sellByDays)}.`
      )
    }
  } catch (error) {
    // An alert that didn't go out must never break the page that triggered it.
    console.error("Expiry alert sweep failed:", error)
  }
}
