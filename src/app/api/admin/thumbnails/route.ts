import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Thumbnail from "@/models/Thumbnail";
import { getAdminFromRequest } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = await connectDB();
    if (!conn) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 }
      );
    }

    const thumbnails = await Thumbnail.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .lean()
      .limit(100);

    return NextResponse.json({
      thumbnails: thumbnails.map((t) => {
        const u = t.userId as { email?: string } | null;
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
    return NextResponse.json(
      { error: "Failed to fetch thumbnails" },
      { status: 500 }
    );
  }
}
