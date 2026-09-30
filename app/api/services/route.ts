export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getCurrentUser } from '@/lib/auth'
import { can, canViewSellerContact } from '@/lib/roles'
import { canAccessMarketplaceCategory } from '@/lib/marketplace-access'
import { logActivity } from '@/lib/activity-log'
import { resolveLocation } from '@/lib/rwanda-geo'
import { notifyFarmer, sellerListingFallbackName, sellerListingsPath } from '@/lib/marketplace-notifications'
import { availableUnits, isStockTracked, publicProductFilter } from '@/lib/stock'
import { sweepExpiryAlerts } from '@/lib/product-alerts'
import { getSellByDays } from '@/lib/db-settings'
import { productFieldsSchema, productFieldUpdates, SERVER_ONLY_PRODUCT_FIELDS } from '@/lib/validations/product'

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })
const canManage = (role: unknown) => can(role, 'marketplace.listings.manage')

/**
 * Shape a listing for the wire, dropping seller contact unless the caller is
 * entitled to it. Stripping happens here rather than in the page so the details
 * never reach the browser at all - the public detail page used to render them
 * straight out of this payload.
 */
function serializeService(service: any, viewer: { _id?: string; role?: string } | null) {
  // The seller's edit history (old prices and descriptions) is for the marketplace
  // only; the public and other sellers never see it.
  // Stock holds name the orders holding units, and an order id is all a guest buyer
  // needs to read their order - so they never leave the server. Buyers see only how
  // many units they can order (`available`, null when the listing doesn't count stock).
  const {
    _id, sellerPhone, sellerEmail, editLog, editedAt, editCount, stock, stockHolds, stockUpdatedAt,
    lowStockAt, lowStockNotifiedAt, expiryWarnedAt, expiryHiddenNotifiedAt, ...rest
  } = service
  const managing = canManage(viewer?.role)
  const base = {
    ...rest,
    id: _id.toString(),
    available: availableUnits(service),
    ...(managing ? { editLog, editedAt, editCount, stock: stock ?? null, lowStockAt: lowStockAt ?? null } : {}),
  }
  return canViewSellerContact(viewer, service)
    ? { ...base, sellerPhone, sellerEmail }
    : base
}

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Anonymous visitors are the common case here and cost nothing extra:
    // getCurrentUser returns early when there's no session cookie.
    const viewer = await getCurrentUser()

    // The busiest read in the app, so it is what drives the expiry warnings (throttled).
    await sweepExpiryAlerts()

    // Hidden, sold-out and past-sell-by listings are off the public pages. Only the
    // marketplace manager asks for them back (includeHidden), and only staff are ever
    // given them - the flag alone does nothing for anyone else.
    const showHidden = searchParams.get('includeHidden') === '1' && canManage(viewer?.role)
    const visible = showHidden ? {} : publicProductFilter(await getSellByDays())

    if (category) {
      const services = await db.collection('services').find({ category, ...visible }).toArray()
      return NextResponse.json(services.map(s => serializeService(s, viewer)))
    }

    const [sales, drugs, feeds] = await Promise.all([
      db.collection('services').find({ category: 'sales', ...visible }).toArray(),
      db.collection('services').find({ category: 'drugs', ...visible }).toArray(),
      db.collection('services').find({ category: 'feeds', ...visible }).toArray()
    ])

    const formatServices = (services: any[]) => services.map(s => serializeService(s, viewer))

    return NextResponse.json({
      sales: formatServices(sales),
      drugs: formatServices(drugs),
      feeds: formatServices(feeds)
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

const PRODUCT_KEYS = ['stock', 'lowStockAt', 'expiresOn', 'batchNumber', 'registrationNumber', 'prescriptionRequired'] as const

/** Sold through the cart, so every one of them counts its units. */
const COUNTED_CATEGORIES = ['drugs', 'feeds']
const stockRequired = () =>
  NextResponse.json({ error: 'Enter how many units are in stock - every drug and feed must have a count' }, { status: 400 })

/**
 * Pull the stock, expiry and regulation fields out of a staff payload and validate
 * them, and drop anything only the server writes (checkout holds, warning flags).
 * Mutates `data`, so what is left is safe to spread.
 */
function takeProductFields(data: Record<string, unknown>) {
  for (const key of SERVER_ONLY_PRODUCT_FIELDS) delete data[key]
  const picked: Record<string, unknown> = {}
  for (const key of PRODUCT_KEYS) {
    if (key in data) picked[key] = data[key]
    delete data[key]
  }
  const parsed = productFieldsSchema.safeParse(picked)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid product details' }
  return productFieldUpdates(parsed.data)
}

// Writes require marketplace.listings.manage. Until Phase 2 lands the farmer
// request flow, publishing is an internal action - a farmer asks, staff or
// marketplace_admin publishes. `data` is still spread unfiltered, which is
// tolerable only because the caller is now known to hold that capability;
// Phase 2 adds field validation alongside the farmer-facing path.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!canManage(currentUser?.role)) return unauthorized()

    const data = await request.json()
    if (!canAccessMarketplaceCategory(currentUser, data.category)) return forbidden()
    const product = takeProductFields(data)
    if ('error' in product) return NextResponse.json({ error: product.error }, { status: 400 })
    if (COUNTED_CATEGORIES.includes(data.category) && !('stock' in product.set)) return stockRequired()

    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')

    // Stamp coordinates: explicit lat/lng (e.g. live GPS or map pin) wins;
    // otherwise resolve district+sector, then district center, then Kigali.
    const serviceData = { ...data, ...product.set, image: data.image || null, createdAt: new Date() }
    if (!serviceData.latitude && !serviceData.longitude) {
      const coords = resolveLocation(serviceData.district, serviceData.sector)
      if (coords) {
        serviceData.latitude = coords.lat
        serviceData.longitude = coords.lng
      }
    }

    const result = await db.collection('services').insertOne(serviceData)
    await logActivity(currentUser!._id, 'marketplace.listing.created', `Created ${data.category || 'listing'}: ${data.name || ''}`)

    return NextResponse.json({
      ...serviceData,
      id: result.insertedId.toString()
    })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!canManage(currentUser?.role)) return unauthorized()

    const { id, ...data } = await request.json()

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const product = takeProductFields(data)
    if ('error' in product) return NextResponse.json({ error: product.error }, { status: 400 })

    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')

    const existing = await db.collection('services').findOne(
      { _id: new ObjectId(id) },
      { projection: { category: 1, stock: 1 } }
    )
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    // A drug or feed must count its units. Saving one that has no count yet needs one;
    // one that has a count can't have it cleared. (The count itself is only sent when
    // staff change it, so an ordinary edit of a counted product passes.)
    if (COUNTED_CATEGORIES.includes(data.category ?? existing.category)) {
      if ('stock' in product.unset) return stockRequired()
      if (!isStockTracked(existing) && !('stock' in product.set)) return stockRequired()
    }
    // Check both the listing's current category and the one it's being moved
    // to, so a scoped marketplace_admin can neither touch a listing outside
    // their grant nor reassign one of theirs into a category they don't hold.
    if (
      !canAccessMarketplaceCategory(currentUser, existing.category) ||
      !canAccessMarketplaceCategory(currentUser, data.category ?? existing.category)
    ) {
      return forbidden()
    }

    // Re-stamp coordinates on update when none were supplied explicitly, so a
    // district/sector edit is always reflected in location-sorted search.
    const updateData = { ...data, ...product.set, image: data.image || null, updatedAt: new Date() }
    if (updateData.latitude === undefined && updateData.longitude === undefined) {
      const coords = resolveLocation(updateData.district, updateData.sector)
      if (coords) {
        updateData.latitude = coords.lat
        updateData.longitude = coords.lng
      }
    }

    const result = await db.collection('services').updateOne(
      { _id: new ObjectId(id) },
      Object.keys(product.unset).length > 0 ? { $set: updateData, $unset: product.unset } : { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    await logActivity(currentUser!._id, 'marketplace.listing.updated', `Updated listing ${id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!canManage(currentUser?.role)) return unauthorized()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')

    const existing = await db.collection('services').findOne(
      { _id: new ObjectId(id) },
      { projection: { category: 1, name: 1, sellerId: 1 } }
    )
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    if (!canAccessMarketplaceCategory(currentUser, existing.category)) return forbidden()

    const result = await db.collection('services').deleteOne({
      _id: new ObjectId(id)
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    await logActivity(currentUser!._id, 'marketplace.listing.deleted', `Deleted listing ${id}`)

    // A seller finding their listing gone should hear it from us. Their request then
    // reads as removed on their own page, where they can clear it from their list.
    if (existing.sellerId && ObjectId.isValid(existing.sellerId)) {
      await notifyFarmer(
        existing.sellerId,
        'Your listing was removed',
        `"${existing.name ?? sellerListingFallbackName(existing.category)}" was removed from the marketplace by Vettrack.`,
        sellerListingsPath(existing.category)
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
