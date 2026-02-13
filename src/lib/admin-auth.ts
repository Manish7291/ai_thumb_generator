import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export function getAdminFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;

  return payload;
}
