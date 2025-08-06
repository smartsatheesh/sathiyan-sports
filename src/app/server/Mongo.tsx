import mongoose from "mongoose";

// Define a global type for the mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Add mongoose to the NodeJS global type
declare global {
  var mongoose: MongooseCache | undefined;
}

// Set to true to use local MongoDB, false to use Atlas
const USE_LOCAL_MONGODB = false;

// Choose the appropriate connection string
const MONGODB_URI = USE_LOCAL_MONGODB 
  ? "mongodb://localhost:27017/sathiyan-sports"
  : "mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports";

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env"
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached?.conn) {
    return cached.conn;
  }
  if (!cached?.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain at least 5 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached!.conn = await cached!.promise;
    console.log('MongoDB Atlas connected successfully');
  } catch (e) {
    cached!.promise = null;
    console.error('MongoDB connection error:', e);
    
    // Provide helpful error messages based on error type
    if (e instanceof Error) {
      if (e.message.includes('IP address')) {
        console.error('❌ IP WHITELIST ERROR: Add your current IP address to MongoDB Atlas Network Access');
        console.error('🔗 Go to: https://cloud.mongodb.com → Network Access → Add IP Address');
      } else if (e.message.includes('authentication')) {
        console.error('❌ AUTHENTICATION ERROR: Check your MongoDB username and password');
      } else if (e.message.includes('ENOTFOUND')) {
        console.error('❌ NETWORK ERROR: Check your internet connection and MongoDB URI');
      }
    }
    
    throw e;
  }

  return cached!.conn;
}

export default connectDB;
