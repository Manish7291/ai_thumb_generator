import { Router } from "express";
import connectDB from "../lib/db.js";
import Thumbnail from "../models/Thumbnail.js";
import { getUserFromRequest } from "../lib/auth.js";

const router = Router();

// GET /api/thumbnails
router.get("/", async (req, res) => {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conn = await connectDB();
    if (!conn) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    const thumbnails = await Thumbnail.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      thumbnails: thumbnails.map((t) => ({
        id: t._id,
        originalPrompt: t.originalPrompt,
        enhancedPrompt: t.enhancedPrompt,
        imageUrl: t.imageUrl,
        size: t.size,
        layout: t.layout,
        style: t.style,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    console.error("[Thumbnails]", err);
    return res.status(500).json({ error: "Failed to fetch thumbnails" });
  }
});

// DELETE /api/thumbnails/:id
router.delete("/:id", async (req, res) => {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conn = await connectDB();
    if (!conn) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    const thumbnail = await Thumbnail.findById(req.params.id);
    if (!thumbnail) {
      return res.status(404).json({ error: "Thumbnail not found" });
    }

    if (thumbnail.userId.toString() !== payload.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await Thumbnail.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error("[Delete Thumbnail]", err);
    return res.status(500).json({ error: "Failed to delete thumbnail" });
  }
});

export default router;
