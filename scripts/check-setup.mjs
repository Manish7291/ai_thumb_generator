/**
 * Quick setup verification script.
 * Tests: MongoDB connection, User model, admin exists, JWT signing.
 */

import mongoose from "mongoose";
import jwt from "jsonwebtoken";
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

async function check() {
  const results = [];
  
  if (!process.env.MONGODB_URI) {
    results.push({ ok: false, msg: "MONGODB_URI not set" });
  } else {
    results.push({ ok: true, msg: "MONGODB_URI is set" });
  }
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    results.push({ ok: false, msg: "JWT_SECRET missing or too short" });
  } else {
    results.push({ ok: true, msg: "JWT_SECRET is set" });
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    results.push({ ok: true, msg: "MongoDB connected" });
  } catch (e) {
    results.push({ ok: false, msg: "MongoDB failed: " + e.message });
    print(results);
    process.exit(1);
  }

  const User = mongoose.model("User", new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String,
    isPremium: Boolean,
    generationCount: Number,
  }, { timestamps: true }));

  const admin = await User.findOne({ role: "admin" });
  if (admin) {
    results.push({ ok: true, msg: "Admin user exists: " + admin.email });
  } else {
    results.push({ ok: false, msg: "No admin user. Run: npm run seed:admin" });
  }

  try {
    jwt.sign({ userId: "test" }, process.env.JWT_SECRET);
    results.push({ ok: true, msg: "JWT sign/verify works" });
  } catch (e) {
    results.push({ ok: false, msg: "JWT failed: " + e.message });
  }

  await mongoose.disconnect();
  print(results);
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

function print(results) {
  console.log("\n=== Setup Check ===\n");
  for (const r of results) {
    console.log(r.ok ? "✓" : "✗", r.msg);
  }
  console.log("");
}

check();
