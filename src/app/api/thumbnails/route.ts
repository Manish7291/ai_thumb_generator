import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Thumbnail from "@/models/Thumbnail";
import { getUserFromRequest } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
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

    const thumbnails = await Thumbnail.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
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
    return NextResponse.json(
      { error: "Failed to fetch thumbnails" },
      { status: 500 }
    );
  }
}
