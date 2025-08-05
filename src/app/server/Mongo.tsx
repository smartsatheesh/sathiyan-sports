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
const MONGODB_URI = process.env.MONGODB_URI || 
  (USE_LOCAL_MONGODB 
    ? "mongodb://localhost:27017/sathiyan-sports"
    : "mongodb://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w-shard-00-00.ld4gdje.mongodb.net:27017,ac-zhkkd6w-shard-00-01.ld4gdje.mongodb.net:27017,ac-zhkkd6w-shard-00-02.ld4gdje.mongodb.net:27017/SathiyanSports?ssl=true&replicaSet=atlas-12t0o1-shard-0&authSource=admin&retryWrites=true&w=majority");
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
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached!.conn = await cached!.promise;
    console.log('MongoDB connected successfully');
  } catch (e) {
    cached!.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
  }

  return cached!.conn;
}

export default connectDB;
