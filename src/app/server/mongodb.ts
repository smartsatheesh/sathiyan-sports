import { MongoClient, Db, Collection } from 'mongodb';
import mongoose from 'mongoose';
import { CoachUser } from '../models/CoachUser';
import { GeneratedPlan } from '../models/GeneratedPlan';
import { CoachSession } from '../models/CoachSession';

// Global MongoDB connection cache
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

// Mongoose connection cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

// Get MongoDB URI from environment
const getMongoURI = (): string => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }
  return uri;
};

// Get database name from environment or use default
const getDBName = (): string => {
  return process.env.MONGODB_DB || 'SathiyanSports';
};

/**
 * Connect to MongoDB using native MongoDB driver
 * Used for coach-related collections and raw MongoDB operations
 */
export async function connectToMongoDB(): Promise<{ db: Db; client: MongoClient }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = getMongoURI();
  
  console.log("🔗 Connecting to MongoDB (Native Driver)...");
  
  try {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    
    await client.connect();
    const db = client.db(getDBName());
    
    cachedClient = client;
    cachedDb = db;
    
    console.log("✅ MongoDB (Native Driver) connected successfully");
    return { client, db };
  } catch (error) {
    console.error("❌ MongoDB (Native Driver) connection failed:", error);
    throw new Error(`MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Connect to MongoDB using Mongoose
 * Used for user authentication, registration, and profile management
 */
export async function connectToMongoose(): Promise<typeof mongoose> {
  let cached = global.mongoose;

  if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = getMongoURI();
    
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 10000,
      dbName: getDBName(), // Explicitly set database name
    };

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      console.log("✅ MongoDB (Mongoose) connected successfully");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB (Mongoose) connection error:', e);
    
    // Provide helpful error messages
    if (e instanceof Error) {
      if (e.message.includes('IP address')) {
        console.error('❌ IP WHITELIST ERROR: Add your current IP address to MongoDB Atlas Network Access');
      } else if (e.message.includes('authentication')) {
        console.error('❌ AUTHENTICATION ERROR: Check your MongoDB username and password');
      } else if (e.message.includes('ENOTFOUND')) {
        console.error('❌ NETWORK ERROR: Check your internet connection and MongoDB URI');
      }
    }
    throw e;
  }

  return cached.conn;
}

// ==========================================
// COLLECTION GETTERS
// ==========================================

// Collection getters using native MongoDB driver
export async function getCoachUsersCollection(): Promise<Collection<CoachUser>> {
  const { db } = await connectToMongoDB();
  return db.collection<CoachUser>('coach_users');
}

export async function getGeneratedPlansCollection(): Promise<Collection<GeneratedPlan>> {
  const { db } = await connectToMongoDB();
  return db.collection<GeneratedPlan>('generated_plans');
}

export async function getCoachSessionsCollection(): Promise<Collection<CoachSession>> {
  const { db } = await connectToMongoDB();
  return db.collection<CoachSession>('coach_sessions');
}

// Default exports for backward compatibility
export default connectToMongoose; // For existing Mongoose usage
export { connectToMongoDB as connectToDatabase }; // For existing native MongoDB usage