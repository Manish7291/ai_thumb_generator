import { Router } from "express";
import connectDB from "../lib/db.js";
import User from "../models/User.js";
import Thumbnail from "../models/Thumbnail.js";
import Payment from "../models/Payment.js";
import { getAdminFromRequest } from "../lib/auth.js";

const router = Router();

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });

    const conn = await connectDB();
    if (!conn) return res.status(503).json({ error: "Database unavailable" });

    const [totalUsers, totalGenerations, totalPayments, premiumUsers] =
      await Promise.all([
        User.countDocuments(),
        Thumbnail.countDocuments(),
        Payment.countDocuments(),
        User.countDocuments({ isPremium: true }),
      ]);

    return res.json({ totalUsers, totalGenerations, totalPayments, premiumUsers });
  } catch (err) {
    console.error("[Admin Stats]", err);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });

    const conn = await connectDB();
    if (!conn) return res.status(503).json({ error: "Database unavailable" });

    const users = await User.find({}).select("-password").sort({ createdAt: -1 }).lean();

    return res.json({
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isPremium: u.isPremium,
        generationCount: u.generationCount,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error("[Admin Users]", err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// PATCH /api/admin/users/:id/premium
router.patch("/users/:id/premium", async (req, res) => {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "User ID required" });

    const conn = await connectDB();
    if (!conn) return res.status(503).json({ error: "Database unavailable" });

    const existing = await User.findById(id);
    if (!existing) return res.status(404).json({ error: "User not found" });

    existing.isPremium = !existing.isPremium;
    await existing.save();

    return res.json({
      user: {
        id: existing._id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
        isPremium: existing.isPremium,
        generationCount: existing.generationCount,
      },
    });
  } catch (err) {
    console.error("[Admin Toggle Premium]", err);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

// GET /api/admin/payments
router.get("/payments", async (req, res) => {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });

    const conn = await connectDB();
    if (!conn) return res.status(503).json({ error: "Database unavailable" });

    const payments = await Payment.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .lean();

    return res.json({
      payments: payments.map((p) => {
        const u = p.userId;
        return {
          id: p._id,
          userId: p.userId,
          userEmail: u?.email,
          userName: u?.name,
          razorpayOrderId: p.razorpayOrderId,
          razorpayPaymentId: p.razorpayPaymentId,
          status: p.status,
          createdAt: p.createdAt,
        };
      }),
    });
  } catch (err) {
    console.error("[Admin Payments]", err);
    return res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// GET /api/admin/thumbnails
router.get("/thumbnails", async (req, res) => {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });

    const conn = await connectDB();
    if (!conn) return res.status(503).json({ error: "Database unavailable" });

    const thumbnails = await Thumbnail.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .lean()
      .limit(100);

    return res.json({
      thumbnails: thumbnails.map((t) => {
        const u = t.userId;
        return {
          id: t._id,
          userId: t.userId,
          userEmail: u?.email,
          originalPrompt: t.originalPrompt,
          enhancedPrompt: t.enhancedPrompt,
          imageUrl: t.imageUrl,
          size: t.size,
          layout: t.layout,
          style: t.style,
          createdAt: t.createdAt,
        };
      }),
    });
  } catch (err) {
    console.error("[Admin Thumbnails]", err);
    return res.status(500).json({ error: "Failed to fetch thumbnails" });
  }
});

// DELETE /api/admin/thumbnails
router.delete("/thumbnails", async (req, res) => {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });

    const conn = await connectDB();
    if (!conn) return res.status(503).json({ error: "Database unavailable" });

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No thumbnail IDs provided" });
    }

    const thumbnails = await Thumbnail.find({ _id: { $in: ids } }).lean();
    const userIds = Array.from(new Set(thumbnails.map((t) => t.userId.toString())));

    const result = await Thumbnail.deleteMany({ _id: { $in: ids } });

    for (const userId of userIds) {
      const deletedForUser = thumbnails.filter(
        (t) => t.userId.toString() === userId
      ).length;
      await User.findByIdAndUpdate(userId, {
        $inc: { generationCount: -deletedForUser },
      });
    }

    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("[Admin Delete Thumbnails]", err);
    return res.status(500).json({ error: "Failed to delete thumbnails" });
  }
});

export default router;
