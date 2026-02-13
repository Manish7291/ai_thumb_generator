/**
 * One-time script to create an admin user.
 * Usage: node scripts/seed-admin.mjs
 * Requires: MONGODB_URI, JWT_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD in .env.local
 * Or set env vars inline: SEED_ADMIN_EMAIL=admin@test.com SEED_ADMIN_PASSWORD=admin123 node scripts/seed-admin.mjs
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        const val = m[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const email = process.env.SEED_ADMIN_EMAIL || "admin@thumbnailai.test";
const password = process.env.SEED_ADMIN_PASSWORD || "admin123";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required. Add it to .env.local");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isPremium: { type: Boolean, default: false },
    generationCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = mongoose.models?.User || mongoose.model("User", UserSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role === "admin") {
        console.log("Admin already exists:", email);
        process.exit(0);
        return;
      }
      existing.role = "admin";
      await existing.save();
      console.log("Updated existing user to admin:", email);
    } else {
      const hashed = await bcrypt.hash(password, 10);
      await User.create({
        name: "Admin",
        email,
        password: hashed,
        role: "admin",
      });
      console.log("Created admin user:", email);
    }
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
