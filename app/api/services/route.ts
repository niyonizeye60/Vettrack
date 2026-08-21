export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getCurrentUser } from '@/lib/auth'
import { canViewSellerContact, isStaffRole } from '@/lib/roles'
import { logActivity } from '@/lib/activity-log'

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

/**
 * Shape a listing for the wire, dropping seller contact unless the caller is
 * entitled to it. Stripping happens here rather than in the page so the details
 * never reach the browser at all - the public detail page used to render them
 * straight out of this payload.
 */
function serializeService(service: any, viewer: { _id?: string; role?: string } | null) {
  const { _id, sellerPhone, sellerEmail, ...rest } = service
  const base = { ...rest, id: _id.toString() }
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

    if (category) {
      const services = await db.collection('services').find({ category }).toArray()
      return NextResponse.json(services.map(s => serializeService(s, viewer)))
    }

    const [sales, drugs, feeds] = await Promise.all([
      db.collection('services').find({ category: 'sales' }).toArray(),
      db.collection('services').find({ category: 'drugs' }).toArray(),
      db.collection('services').find({ category: 'feeds' }).toArray()
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

// Writes are staff-only. Until Phase 2 lands the farmer request flow, publishing
// is an internal action - a farmer asks, staff publishes. `data` is still spread
// unfiltered, which is tolerable only because the caller is now known staff;
// Phase 2 adds field validation alongside the farmer-facing path.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!isStaffRole(currentUser?.role)) return unauthorized()

    const data = await request.json()

    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')

    const service = {
      ...data,
      image: data.image || null,
      createdAt: new Date()
    }

    const result = await db.collection('services').insertOne(service)
    await logActivity(currentUser!._id, 'marketplace.listing.created', `Created ${data.category || 'listing'}: ${data.name || ''}`)

    return NextResponse.json({
      ...service,
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
    if (!isStaffRole(currentUser?.role)) return unauthorized()

    const { id, ...data } = await request.json()

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')

    const result = await db.collection('services').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...data,
          image: data.image || null,
          updatedAt: new Date()
        }
      }
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
    if (!isStaffRole(currentUser?.role)) return unauthorized()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')

    const result = await db.collection('services').deleteOne({
      _id: new ObjectId(id)
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    await logActivity(currentUser!._id, 'marketplace.listing.deleted', `Deleted listing ${id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
