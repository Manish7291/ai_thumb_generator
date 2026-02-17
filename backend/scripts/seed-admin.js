import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required. Set it in .env");
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  role: { type: String, default: "user" },
  isPremium: { type: Boolean, default: false },
  generationCount: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const email = "admin@thumbnailai.com";
  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }
  const password = await bcrypt.hash("admin123", 10);
  await User.create({ name: "Admin", email, password, role: "admin" });
  console.log("Admin created:", email, "/ password: admin123");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
