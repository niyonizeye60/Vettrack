export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getCurrentUser } from '@/lib/auth'
import { isStaffRole } from '@/lib/roles'
import { logActivity } from '@/lib/activity-log'

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Categories are public catalogue structure - the browse pages read them
// unauthenticated. Only the writes below are staff-gated.
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')
    
    const [sales, drugs, feeds] = await Promise.all([
      db.collection('categories').find({ type: 'sales' }).toArray(),
      db.collection('categories').find({ type: 'drugs' }).toArray(),
      db.collection('categories').find({ type: 'feeds' }).toArray()
    ])
    
    // Convert ObjectId to string for JSON serialization
    const formatCategories = (categories: any[]) => 
      categories.map(cat => ({ ...cat, id: cat._id.toString(), _id: undefined }))
    
    return NextResponse.json({ 
      sales: formatCategories(sales), 
      drugs: formatCategories(drugs), 
      feeds: formatCategories(feeds) 
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!isStaffRole(currentUser?.role)) return unauthorized()

    const { name, description, image, type } = await request.json()
    
    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')
    
    const category = {
      name,
      description,
      image: image || null,
      type,
      createdAt: new Date()
    }
    
    const result = await db.collection('categories').insertOne(category)
    await logActivity(currentUser!._id, 'marketplace.category.created', `Created ${type} category: ${name}`)
    
    return NextResponse.json({ 
      ...category, 
      id: result.insertedId.toString() 
    })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!isStaffRole(currentUser?.role)) return unauthorized()

    const { id, name, description, image } = await request.json()

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    
    const client = await clientPromise
    const db = client.db('ntdm_animal_hospital')
    
    const result = await db.collection('categories').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          name,
          description,
          image: image || null,
          updatedAt: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    await logActivity(currentUser!._id, 'marketplace.category.updated', `Updated category ${id}`)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
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
    
    const result = await db.collection('categories').deleteOne({
      _id: new ObjectId(id)
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    await logActivity(currentUser!._id, 'marketplace.category.deleted', `Deleted category ${id}`)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
