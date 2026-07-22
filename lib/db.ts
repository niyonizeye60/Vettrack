import { MongoClient } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error("Missing required environment variable: MONGODB_URI")
}

const MONGODB_URI = process.env.MONGODB_URI;

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
}

let clientPromise: Promise<MongoClient>

// Cached on `global` in every environment, not just development. In dev this
// survives HMR module reloads; in production (Vercel serverless) it's what
// makes a warm function container reuse its existing MongoDB connection
// instead of re-running this module's top-level code and paying a fresh
// TLS+auth handshake to Atlas on every invocation that lands on that
// container. Skipping this in production (the previous behavior) meant cold
// - and often even warm - invocations could each open their own connection,
// which is exactly the multi-second, refresh-doesn't-help latency this was
// causing on the conversations list.
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

if (!globalWithMongo._mongoClientPromise) {
  try {
    const client = new MongoClient(MONGODB_URI, options)
    globalWithMongo._mongoClientPromise = client.connect()
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw new Error('Failed to connect to MongoDB')
  }
}
clientPromise = globalWithMongo._mongoClientPromise

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
