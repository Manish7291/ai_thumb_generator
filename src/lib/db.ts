import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn(
    "[DB] MONGODB_URI is not set. Auth and data features will not work. Add it to .env.local"
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!globalThis.mongooseCache) {
  globalThis.mongooseCache = cache;
}

async function connectDB(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) {
    return null;
  }
  if (cache.conn) {
    return cache.conn;
  }
  if (!cache.promise) {
    try {
      cache.promise = mongoose.connect(MONGODB_URI);
      cache.conn = await cache.promise;
      console.log("[DB] Connected to MongoDB");
    } catch (err) {
      console.error("[DB] Connection failed:", err);
      cache.promise = null;
      return null;
    }
  } else {
    cache.conn = await cache.promise;
  }
  return cache.conn;
}

export default connectDB;
