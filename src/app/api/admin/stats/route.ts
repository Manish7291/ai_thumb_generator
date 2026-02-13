import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Thumbnail from "@/models/Thumbnail";
import Payment from "@/models/Payment";
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

    const [totalUsers, totalGenerations, totalPayments, premiumUsers] = await Promise.all([
      User.countDocuments(),
      Thumbnail.countDocuments(),
      Payment.countDocuments(),
      User.countDocuments({ isPremium: true }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalGenerations,
      totalPayments,
      premiumUsers,
    });
  } catch (err) {
    console.error("[Admin Stats]", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
