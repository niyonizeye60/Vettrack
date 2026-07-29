export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getCurrentUser } from '@/lib/auth'
import { DEFAULT_SELLER_PHONE } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    
    if (category) {
      const services = await db.collection('services').find({ category }).toArray()
      const formattedServices = services.map(service => ({ 
        ...service, 
        id: service._id.toString(), 
        _id: undefined 
      }))
      return NextResponse.json(formattedServices)
    }
    
    const [sales, drugs, feeds] = await Promise.all([
      db.collection('services').find({ category: 'sales' }).toArray(),
      db.collection('services').find({ category: 'drugs' }).toArray(),
      db.collection('services').find({ category: 'feeds' }).toArray()
    ])
    
    const formatServices = (services: any[]) => 
      services.map(service => ({ ...service, id: service._id.toString(), _id: undefined }))
    
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

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')
    
    const currentUser = await getCurrentUser()

    const service = {
      ...data,
      image: data.image || null,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
      sellerPhone: data.sellerPhone || DEFAULT_SELLER_PHONE,
      commissionPercentage: data.commissionPercentage ? Number(data.commissionPercentage) : null,
      userId: currentUser?._id?.toString() || null,
      sellerName: currentUser?.name || data.sellerName || null,
      createdAt: new Date()
    }
    
    const result = await db.collection('services').insertOne(service)
    
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
    const { id, ...data } = await request.json()
    
    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')
    
    const result = await db.collection('services').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...data,
          image: data.image || null,
          latitude: data.latitude ? Number(data.latitude) : null,
          longitude: data.longitude ? Number(data.longitude) : null,
          sellerPhone: data.sellerPhone || DEFAULT_SELLER_PHONE,
          commissionPercentage: data.commissionPercentage ? Number(data.commissionPercentage) : null,
          updatedAt: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    
    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')
    
    const result = await db.collection('services').deleteOne({
      _id: new ObjectId(id)
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}