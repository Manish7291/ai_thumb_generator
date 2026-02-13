import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Thumbnail from "@/models/Thumbnail";
import { getUserFromRequest } from "@/lib/user-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const thumbnail = await Thumbnail.findById(params.id);
    if (!thumbnail) {
      return NextResponse.json(
        { error: "Thumbnail not found" },
        { status: 404 }
      );
    }

    // Only owner can delete
    if (thumbnail.userId.toString() !== payload.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Thumbnail.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Delete Thumbnail]", err);
    return NextResponse.json(
      { error: "Failed to delete thumbnail" },
      { status: 500 }
    );
  }
}
