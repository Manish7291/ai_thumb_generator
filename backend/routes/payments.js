import { Router } from "express";
import crypto from "crypto";
import connectDB from "../lib/db.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import { getUserFromRequest } from "../lib/auth.js";
import { sendPremiumEmail } from "../lib/email.js";
import Razorpay from "razorpay";

const router = Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// POST /api/payments/create-order
router.post("/create-order", async (req, res) => {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: "Payments not configured" });
    }

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

    if (user.isPremium) {
      return res.status(400).json({ error: "Already premium" });
    }

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

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[Create Order]", err);
    const msg = err instanceof Error ? err.message : "Failed to create order";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/payments/verify
router.post("/verify", async (req, res) => {
  try {
    if (!RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: "Payments not configured" });
    }

    const payload = getUserFromRequest(req);
    if (!payload) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Invalid verification data" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const conn = await connectDB();
    if (!conn) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: payload.userId,
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.status = "test_success";
    await payment.save();

    const user = await User.findByIdAndUpdate(
      payload.userId,
      { isPremium: true },
      { new: true }
    );

    if (user) {
      const origin = req.headers.origin || process.env.FRONTEND_URL || "";
      sendPremiumEmail(user.email, user.name, `${origin}/dashboard`);
    }

    return res.json({ success: true, message: "Premium activated" });
  } catch (err) {
    console.error("[Verify Payment]", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
