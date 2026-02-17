import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./lib/db.js";

// Import routes
import authRoutes from "./routes/auth.js";
import generateRoutes from "./routes/generate.js";
import paymentRoutes from "./routes/payments.js";
import thumbnailRoutes from "./routes/thumbnails.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - allow frontend origin
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "ai-thumbnail-backend" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/thumbnails", thumbnailRoutes);
app.use("/api/admin", adminRoutes);

// Connect to DB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Backend running on port ${PORT}`);
  });
});
