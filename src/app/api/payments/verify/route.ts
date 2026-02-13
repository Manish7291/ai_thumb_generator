import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { getUserFromRequest } from "@/lib/user-auth";
import { sendPremiumEmail } from "@/lib/email";

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Payments not configured" },
        { status: 503 }
      );
    }

    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid verification data" },
        { status: 400 }
      );
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    const conn = await connectDB();
    if (!conn) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 }
      );
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: payload.userId,
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.status = "test_success";
    await payment.save();

    const user = await User.findByIdAndUpdate(
      payload.userId,
      { isPremium: true },
      { new: true }
    );

    // Send premium welcome email
    if (user) {
      const origin = request.headers.get("origin") || request.nextUrl?.origin || "";
      sendPremiumEmail(user.email, user.name, `${origin}/dashboard`);
    }

    return NextResponse.json({
      success: true,
      message: "Premium activated",
    });
  } catch (err) {
    console.error("[Verify Payment]", err);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
