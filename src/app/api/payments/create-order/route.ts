import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { getUserFromRequest } from "@/lib/user-auth";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require("razorpay");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Payments not configured" },
        { status: 503 }
      );
    }

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

    if (user.isPremium) {
      return NextResponse.json(
        { error: "Already premium" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    const amount = 99 * 100; // ₹99 in paise
    const receipt = `prem_${Date.now()}`.slice(0, 40);
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
    });

    await Payment.create({
      userId: user._id,
      razorpayOrderId: order.id,
      razorpayPaymentId: "pending",
      status: "pending",
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[Create Order] Error:", err instanceof Error ? err.message : err, err);
    const msg = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
