import { Router } from "express";
import bcrypt from "bcryptjs";
import connectDB from "../lib/db.js";
import User from "../models/User.js";
import { signToken, getUserFromRequest } from "../lib/auth.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const conn = await connectDB();
    if (!conn) {
      return res.status(503).json({ error: "Database unavailable. Please try again later." });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
        generationCount: user.generationCount,
      },
    });
  } catch (err) {
    console.error("[Auth Login]", err);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const conn = await connectDB();
    if (!conn) {
      return res.status(503).json({ error: "Database unavailable. Please try again later." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "user",
      isPremium: false,
      generationCount: 0,
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
        generationCount: user.generationCount,
      },
    });
  } catch (err) {
    console.error("[Auth Register]", err);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conn = await connectDB();
    if (!conn) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
        generationCount: user.generationCount,
      },
    });
  } catch (err) {
    console.error("[Auth Me]", err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
