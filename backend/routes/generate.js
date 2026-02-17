import { Router } from "express";
import connectDB from "../lib/db.js";
import User from "../models/User.js";
import Thumbnail from "../models/Thumbnail.js";
import { getUserFromRequest } from "../lib/auth.js";
import { sendThumbnailReadyEmail } from "../lib/email.js";
import { enhancePrompt } from "../lib/gemini.js";
import { generateImage } from "../lib/huggingface.js";

const router = Router();

const FREE_LIMIT = 2;

// POST /api/generate
router.post("/", async (req, res) => {
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

    const canGenerate = user.isPremium || user.generationCount < FREE_LIMIT;
    if (!canGenerate) {
      return res.status(403).json({
        error: "Free limit reached. Upgrade to premium for unlimited generations.",
      });
    }

    const {
      prompt,
      enhance = true,
      size: sizePreset = "medium",
      layout = "landscape",
      style = "default",
      negativePrompt = "",
    } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    let enhancedPrompt = prompt.trim();
    if (enhance) {
      try {
        enhancedPrompt = await enhancePrompt(enhancedPrompt, style);
      } catch {
        // Fallback to original
      }
    }

    // Dimension map
    const DIMS = {
      square: { small: { w: 512, h: 512 }, medium: { w: 768, h: 768 }, large: { w: 1024, h: 1024 } },
      landscape: { small: { w: 640, h: 384 }, medium: { w: 896, h: 512 }, large: { w: 1024, h: 576 } },
      portrait: { small: { w: 384, h: 640 }, medium: { w: 512, h: 896 }, large: { w: 576, h: 1024 } },
    };
    const dims = DIMS[layout]?.[sizePreset] || { w: 768, h: 768 };

    // Style prefixes
    const STYLE_PREFIX = {
      cinematic: "cinematic film still, dramatic lighting, anamorphic lens,",
      photorealistic: "ultra-realistic photograph, 8k UHD, DSLR quality,",
      anime: "anime art style, vibrant colors, cel-shaded,",
      "digital-art": "digital illustration, highly detailed, artstation trending,",
      "3d-render": "3D render, octane render, unreal engine 5, volumetric lighting,",
      neon: "neon lights, cyberpunk aesthetic, glowing edges,",
      watercolor: "watercolor painting, soft washes, artistic brushstrokes,",
    };
    if (style !== "default" && STYLE_PREFIX[style]) {
      enhancedPrompt = `${STYLE_PREFIX[style]} ${enhancedPrompt}`;
    }

    let imageUrl, size;
    try {
      const result = await generateImage(enhancedPrompt, {
        width: dims.w,
        height: dims.h,
        negativePrompt: user.isPremium && negativePrompt ? negativePrompt : undefined,
      });
      imageUrl = result.imageUrl;
      size = result.size;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image generation failed";
      return res.status(502).json({ error: msg });
    }

    const thumbnail = await Thumbnail.create({
      userId: user._id,
      originalPrompt: prompt,
      enhancedPrompt,
      imageUrl,
      size: size || "768x768",
      layout: layout || "landscape",
      style: style || "default",
    });

    user.generationCount += 1;
    await user.save();

    const origin = req.headers.origin || process.env.FRONTEND_URL || "";
    sendThumbnailReadyEmail(
      user.email,
      user.name,
      prompt,
      imageUrl,
      `${origin}/dashboard`
    );

    return res.json({
      thumbnail: {
        id: thumbnail._id,
        originalPrompt: thumbnail.originalPrompt,
        enhancedPrompt: thumbnail.enhancedPrompt,
        imageUrl: thumbnail.imageUrl,
        size: thumbnail.size,
        layout: thumbnail.layout,
        style: thumbnail.style,
        createdAt: thumbnail.createdAt,
      },
    });
  } catch (err) {
    console.error("[Generate]", err);
    return res.status(500).json({ error: "Generation failed" });
  }
});

// POST /api/generate/enhance
router.post("/enhance", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "Gemini API is not configured" });
    }

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const enhanced = await enhancePrompt(prompt);
    return res.json({ enhancedPrompt: enhanced });
  } catch (err) {
    console.error("[Enhance]", err);
    return res.status(500).json({ error: "Prompt enhancement failed" });
  }
});

// POST /api/generate/image
router.post("/image", async (req, res) => {
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      return res.status(503).json({ error: "Hugging Face API is not configured" });
    }

    const { prompt, size = "1024x1024" } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const result = await generateImage(prompt, {});
    return res.json({ imageUrl: result.imageUrl, size });
  } catch (err) {
    console.error("[Generate Image]", err);
    return res.status(500).json({ error: "Image generation failed" });
  }
});

export default router;
