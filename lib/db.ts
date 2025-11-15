import { MongoClient } from "mongodb"

// Add fallback for MongoDB URI with a dummy value that will be overridden by environment variables
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://placeholder:placeholder@placeholder.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    try {
      client = new MongoClient(MONGODB_URI, options)
      globalWithMongo._mongoClientPromise = client.connect()
    } catch (error) {
      console.error('MongoDB connection error:', error)
      throw new Error('Failed to connect to MongoDB')
    }
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  try {
    client = new MongoClient(MONGODB_URI, options)
    clientPromise = client.connect()
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw new Error('Failed to connect to MongoDB')
  }
}

// Add a function to test the connection
export async function testConnection() {
  try {
    const client = await clientPromise
    await client.db().command({ ping: 1 })
    console.log('Successfully connected to MongoDB')
    return true
  } catch (error) {
    console.error('MongoDB connection test failed:', error)
    return false
  }
}

export default clientPromise
