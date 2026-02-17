import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("[DB] MONGODB_URI is not set. Auth and data features will not work.");
}

let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export default async function connectDB() {
  if (!MONGODB_URI) return null;
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    try {
      cached.promise = mongoose.connect(MONGODB_URI);
      cached.conn = await cached.promise;
      console.log("[DB] Connected to MongoDB");
    } catch (err) {
      console.error("[DB] Connection failed:", err);
      cached.promise = null;
      return null;
    }
  } else {
    cached.conn = await cached.promise;
  }
  return cached.conn;
}
