"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post<{ token: string; user?: { role?: string } }>("/api/auth/login", { email, password });
      if (data.user?.role !== "admin") {
        setError("Access denied. Admin privileges required.");
        setLoading(false);
        return;
      }
      if (typeof window !== "undefined" && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("admin", "true");
      }
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] bg-mesh flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-red-500/5 blur-[120px]" />
      </div>
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
          <div className="flex justify-center mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-xl">A</div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center">
            Admin Login
          </h1>
          <p className="mt-2 text-slate-500 text-center text-sm">
            Sign in with an admin account
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email" className="text-slate-400 text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-red-500/50 focus:ring-red-500/20 h-11 rounded-xl transition-colors"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-400 text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-red-500/50 focus:ring-red-500/20 h-11 rounded-xl transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-400 text-white font-semibold h-11 rounded-xl shadow-lg shadow-red-500/20 transition-all hover:shadow-red-500/30 hover:-translate-y-0.5"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-slate-600 hover:text-slate-400 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
