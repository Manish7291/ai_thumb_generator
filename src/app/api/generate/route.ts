import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Thumbnail from "@/models/Thumbnail";
import { getUserFromRequest } from "@/lib/user-auth";
import { sendThumbnailReadyEmail } from "@/lib/email";
import { enhancePrompt } from "@/lib/gemini";
import { generateImage } from "@/lib/huggingface";

const FREE_LIMIT = 2;

export async function POST(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = await connectDB();
    if (!conn) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 }
      );
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const canGenerate =
      user.isPremium || user.generationCount < FREE_LIMIT;
    if (!canGenerate) {
      return NextResponse.json(
        { error: "Free limit reached. Upgrade to premium for unlimited generations." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { prompt, enhance = true, size: sizePreset = "medium", layout = "landscape", style = "default", negativePrompt = "" } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let enhancedPrompt = prompt.trim();
    if (enhance) {
      try {
        enhancedPrompt = await enhancePrompt(enhancedPrompt, style);
      } catch {
        // Fallback to original
      }
    }

    // Dimension map: layout × sizePreset → pixel dimensions
    const DIMS: Record<string, Record<string, { w: number; h: number }>> = {
      square:    { small: { w: 512, h: 512 }, medium: { w: 768, h: 768 }, large: { w: 1024, h: 1024 } },
      landscape: { small: { w: 640, h: 384 }, medium: { w: 896, h: 512 }, large: { w: 1024, h: 576 } },
      portrait:  { small: { w: 384, h: 640 }, medium: { w: 512, h: 896 }, large: { w: 576, h: 1024 } },
    };
    const dims = DIMS[layout]?.[sizePreset] || { w: 768, h: 768 };

    // Prepend style keywords
    const STYLE_PREFIX: Record<string, string> = {
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

    let imageUrl: string;
    let size: string;
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
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const thumbnail = await Thumbnail.create({
      userId: user._id,
      originalPrompt: prompt,
      enhancedPrompt: enhancedPrompt,
      imageUrl,
      size: size || "768x768",
      layout: layout || "landscape",
      style: style || "default",
    });

    user.generationCount += 1;
    await user.save();

    const origin = request.headers.get("origin") || request.nextUrl?.origin || "";
    sendThumbnailReadyEmail(
      user.email,
      user.name,
      prompt,
      imageUrl,
      `${origin}/dashboard`
    );

    return NextResponse.json({
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
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
