import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Thumbnail from "@/models/Thumbnail";
import User from "@/models/User";
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

export async function DELETE(request: NextRequest) {
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

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No thumbnail IDs provided" },
        { status: 400 }
      );
    }

    // Get thumbnails to find their owners before deleting
    const thumbnails = await Thumbnail.find({ _id: { $in: ids } }).lean();
    const userIds = [...new Set(thumbnails.map((t) => t.userId.toString()))];

    // Delete the thumbnails
    const result = await Thumbnail.deleteMany({ _id: { $in: ids } });

    // Decrement generation count for affected users
    for (const userId of userIds) {
      const deletedForUser = thumbnails.filter(
        (t) => t.userId.toString() === userId
      ).length;
      await User.findByIdAndUpdate(userId, {
        $inc: { generationCount: -deletedForUser },
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("[Admin Delete Thumbnails]", err);
    return NextResponse.json(
      { error: "Failed to delete thumbnails" },
      { status: 500 }
    );
  }
}
