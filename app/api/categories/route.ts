export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

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
    const { id, name, description, image } = await request.json()
    
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
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
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
    
    const result = await db.collection('categories').deleteOne({
      _id: new ObjectId(id)
    })
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}