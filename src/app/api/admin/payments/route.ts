import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Payment from "@/models/Payment";
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

    const payments = await Payment.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .lean();

    return NextResponse.json({
      payments: payments.map((p) => {
        const u = p.userId as { email?: string; name?: string } | null;
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
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
