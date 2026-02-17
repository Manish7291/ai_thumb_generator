import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("[Auth] JWT_SECRET is not set. Auth will not work.");
}

export function signToken(payload) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getUserFromRequest(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  return verifyToken(token);
}

export function getAdminFromRequest(req) {
  const payload = getUserFromRequest(req);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}
