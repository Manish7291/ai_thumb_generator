"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import api from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isPremium: boolean;
  generationCount: number;
}

interface Thumbnail {
  id: string;
  originalPrompt: string;
  enhancedPrompt: string;
  imageUrl: string;
  size: string;
  layout: string;
  style?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [selectedThumb, setSelectedThumb] = useState<Thumbnail | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"create" | "gallery">("create");
  const [selectedSize, setSelectedSize] = useState<"small" | "medium" | "large">("medium");
  const [selectedLayout, setSelectedLayout] = useState<"square" | "landscape" | "portrait">("landscape");
  const [selectedStyle, setSelectedStyle] = useState("cinematic");
  const [enhanceEnabled, setEnhanceEnabled] = useState(true);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  const FREE_LIMIT = 2;

  const SIZES = [
    { id: "small" as const, label: "Small", desc: "Fast · 512px" },
    { id: "medium" as const, label: "Medium", desc: "Balanced · 768px" },
    { id: "large" as const, label: "Large", desc: "HD · 1024px" },
  ];
  const LAYOUTS = [
    { id: "square" as const, label: "Square", ratio: "1:1" },
    { id: "landscape" as const, label: "Landscape", ratio: "16:9" },
    { id: "portrait" as const, label: "Portrait", ratio: "9:16" },
  ];
  const STYLES = [
    { id: "default", label: "Default", icon: "✨" },
    { id: "cinematic", label: "Cinematic", icon: "🎬" },
    { id: "photorealistic", label: "Photo", icon: "📷" },
    { id: "anime", label: "Anime", icon: "🎌" },
    { id: "digital-art", label: "Digital Art", icon: "🎨" },
    { id: "3d-render", label: "3D Render", icon: "🧊" },
    { id: "neon", label: "Neon", icon: "💜" },
    { id: "watercolor", label: "Watercolor", icon: "🖌️" },
  ];
  const canGenerate = user?.isPremium || (user?.generationCount ?? 0) < FREE_LIMIT;

  function loadUser() {
    api
      .get<{ user: User }>("/api/auth/me")
      .then((res) => {
        if (res.user?.role === "admin") {
          router.push("/admin/dashboard");
          return;
        }
        setUser(res.user);
      })
      .catch(() => router.push("/login"));
  }

  function loadThumbnails() {
    api
      .get<{ thumbnails: Thumbnail[] }>("/api/thumbnails")
      .then((res) => setThumbnails(res.thumbnails || []))
      .catch(() => setThumbnails([]));
  }

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/login");
      setLoading(false);
      return;
    }
    loadUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    loadThumbnails();
  }, [user]);

  useEffect(() => {
    if (user) setLoading(false);
  }, [user]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!canGenerate) {
      setError("Free limit reached. Upgrade to premium.");
      return;
    }
    setGenerating(true);
    setGenerationTime(null);
    const startTime = Date.now();
    try {
      const res = await api.post<{ thumbnail: Thumbnail }>("/api/generate", {
        prompt: prompt.trim(),
        enhance: enhanceEnabled,
        size: selectedSize,
        layout: selectedLayout,
        style: selectedStyle,
        negativePrompt: negativePrompt.trim() || undefined,
      });
      setGenerationTime(Math.round((Date.now() - startTime) / 1000));
      setThumbnails((prev) => [res.thumbnail, ...prev]);
      setUser((u) =>
        u ? { ...u, generationCount: u.generationCount + 1 } : null
      );
      setSelectedThumb(res.thumbnail);
      setPrompt("");
      setSidebarTab("gallery");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function handleUpgrade() {
    setUpgrading(true);
    setError("");
    api
      .post<{
        orderId: string;
        keyId: string;
        amount: number;
        currency: string;
      }>("/api/payments/create-order", {})
      .then((data) => {
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "ThumbnailAI",
          description: "Premium - Unlimited Generations",
          order_id: data.orderId,
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            try {
              await api.post("/api/payments/verify", {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });
              setUser((u) => (u ? { ...u, isPremium: true } : null));
            } catch {
              setError("Payment verification failed");
            } finally {
              setUpgrading(false);
            }
          },
        };
        const rzp = (window as unknown as { Razorpay?: new (o: unknown) => { open: () => void } }).Razorpay;
        if (rzp) {
          new rzp(options).open();
        } else {
          setError("Razorpay not loaded");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to create order");
      })
      .finally(() => setUpgrading(false));
  }

  function handleDownload(url: string, prompt: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `thumbnail-${prompt.slice(0, 20).replace(/\s/g, "-")}.png`;
    a.click();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this thumbnail? This cannot be undone.")) return;
    try {
      await api.del(`/api/thumbnails/${id}`);
      setThumbnails((prev) => prev.filter((t) => t.id !== id));
      if (selectedThumb?.id === id) setSelectedThumb(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("admin");
    }
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 animate-pulse" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      {/* ── Left Sidebar ── */}
      <aside className="hidden md:flex w-[260px] flex-col border-r border-white/[0.06] bg-[#0a0f1a] flex-shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/[0.06]">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[#080c14] font-bold text-sm">T</div>
          <span className="text-lg font-bold text-white">Thumbnail<span className="text-amber-400">AI</span></span>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center text-amber-400 font-semibold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          {user?.isPremium ? (
            <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 w-fit">
              <span className="text-amber-400 text-xs">★</span>
              <span className="text-amber-400 text-xs font-medium">Premium</span>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-xs text-slate-500">
                {user?.generationCount ?? 0} / {FREE_LIMIT} free generations
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                  style={{ width: `${Math.min(((user?.generationCount ?? 0) / FREE_LIMIT) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <button
            onClick={() => setSidebarTab("create")}
            className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${sidebarTab === "create" ? "active bg-amber-500/[0.08] text-amber-400" : "text-slate-400 hover:text-white"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create New
          </button>
          <button
            onClick={() => setSidebarTab("gallery")}
            className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${sidebarTab === "gallery" ? "active bg-amber-500/[0.08] text-amber-400" : "text-slate-400 hover:text-white"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Gallery
            {thumbnails.length > 0 && (
              <span className="ml-auto text-[10px] bg-white/[0.08] text-slate-400 px-1.5 py-0.5 rounded-full">{thumbnails.length}</span>
            )}
          </button>
        </nav>

        {/* Upgrade / Logout at bottom */}
        <div className="px-3 pb-4 space-y-2 border-t border-white/[0.06] pt-4">
          {!user?.isPremium && (
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#080c14] font-semibold h-9 text-sm rounded-lg shadow-lg shadow-amber-500/20 transition-all"
            >
              {upgrading ? "..." : "Upgrade to Premium ₹99"}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full text-slate-500 hover:text-white hover:bg-white/[0.04] h-9 text-sm rounded-lg justify-start gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </Button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#0a0f1a]">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[#080c14] font-bold text-xs">T</div>
            <span className="font-bold text-white text-sm">ThumbnailAI</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.isPremium && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Premium</Badge>}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white h-8 w-8 p-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </Button>
          </div>
        </header>

        {/* Mobile Tab Bar */}
        <div className="md:hidden flex border-b border-white/[0.06]">
          <button onClick={() => setSidebarTab("create")} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${sidebarTab === "create" ? "text-amber-400 border-b-2 border-amber-400" : "text-slate-500"}`}>Create</button>
          <button onClick={() => setSidebarTab("gallery")} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${sidebarTab === "gallery" ? "text-amber-400 border-b-2 border-amber-400" : "text-slate-500"}`}>Gallery</button>
        </div>

        <main className="flex-1 overflow-y-auto">
          {sidebarTab === "create" ? (
            /* ── Create Tab ── */
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 animate-fade-in">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Create Thumbnail</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Describe your video or content. We&apos;ll enhance it with AI and generate a thumbnail.
                </p>
              </div>

              {/* Controls Panel */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8">
                <form onSubmit={handleGenerate} className="space-y-6">
                  {/* Prompt Input */}
                  <div>
                    <Label htmlFor="prompt" className="text-slate-300 text-sm font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      Prompt
                    </Label>
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. Gaming setup with RGB lights, intense focus, dark room with neon glow..."
                      className="mt-2 w-full min-h-[120px] rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 p-4 text-sm resize-none outline-none transition-colors"
                      required
                      disabled={!canGenerate || generating}
                    />
                  </div>

                  {/* Layout Selector */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                      Layout
                    </Label>
                    <div className="flex gap-2">
                      {LAYOUTS.map((l) => (
                        <button key={l.id} type="button" onClick={() => setSelectedLayout(l.id)}
                          className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm transition-all ${
                            selectedLayout === l.id
                              ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                              : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12]"
                          }`}
                        >
                          <div className={`border-2 border-current rounded-sm ${l.id === "square" ? "w-5 h-5" : l.id === "landscape" ? "w-7 h-[18px]" : "w-[18px] h-7"}`} />
                          <span className="font-medium text-xs">{l.label}</span>
                          <span className="text-[10px] opacity-50">{l.ratio}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Selector */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                      Size
                    </Label>
                    <div className="flex gap-2">
                      {SIZES.map((s) => (
                        <button key={s.id} type="button" onClick={() => setSelectedSize(s.id)}
                          className={`flex-1 px-3 py-2.5 rounded-xl border text-sm transition-all text-center ${
                            selectedSize === s.id
                              ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                              : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12]"
                          }`}
                        >
                          <span className="font-medium block">{s.label}</span>
                          <span className="text-[10px] opacity-50">{s.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Preset */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                      Style Preset
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {STYLES.map((s) => (
                        <button key={s.id} type="button" onClick={() => setSelectedStyle(s.id)}
                          className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs transition-all ${
                            selectedStyle === s.id
                              ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                              : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12]"
                          }`}
                        >
                          <span className="text-base">{s.icon}</span>
                          <span className="font-medium">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI Enhancement Toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-300">AI Enhancement</p>
                      <p className="text-xs text-slate-600">Auto-improve prompt with Gemini AI</p>
                    </div>
                    <button type="button" onClick={() => setEnhanceEnabled(!enhanceEnabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${enhanceEnabled ? "bg-amber-500" : "bg-white/[0.1]"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enhanceEnabled ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  {/* Negative Prompt (Premium) */}
                  {user?.isPremium && (
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                        Negative Prompt
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">Premium</span>
                      </Label>
                      <input
                        type="text"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="e.g. blurry, low quality, text, watermark..."
                        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 px-4 py-2.5 text-sm outline-none transition-colors"
                        disabled={generating}
                      />
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="submit"
                      disabled={!canGenerate || generating}
                      className={`bg-amber-500 hover:bg-amber-400 text-[#080c14] font-semibold h-11 px-6 rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:-translate-y-0.5 ${generating ? "animate-pulse-glow" : ""}`}
                    >
                      {generating ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Generating...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Generate
                        </span>
                      )}
                    </Button>
                    {!user?.isPremium && !canGenerate && (
                      <Button
                        type="button"
                        onClick={handleUpgrade}
                        disabled={upgrading}
                        variant="outline"
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-11 px-6 rounded-xl"
                      >
                        {upgrading ? "..." : "Upgrade to Premium ₹99"}
                      </Button>
                    )}
                  </div>
                </form>
              </div>

              {/* Image Preview Area */}
              {generating && (
                <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] aspect-video flex items-center justify-center animate-pulse-glow">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center">
                        <svg className="animate-spin w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-medium">Generating your thumbnail...</p>
                      <p className="text-slate-500 text-sm mt-1">Enhancing with Gemini, creating with Hugging Face</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedThumb && !generating && (
                <div className="mt-8 animate-fade-in">
                  <h2 className="text-lg font-semibold text-white mb-4">Latest Generation</h2>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    <img
                      src={selectedThumb.imageUrl}
                      alt={selectedThumb.originalPrompt}
                      className="w-full max-h-[500px] object-contain bg-black/20"
                    />
                    <div className="p-5 space-y-3 border-t border-white/[0.06]">
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedThumb.style && selectedThumb.style !== "default" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 capitalize">{selectedThumb.style.replace(/-/g, " ")}</span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{selectedThumb.size}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">{selectedThumb.layout}</span>
                        {generationTime !== null && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">⚡ {generationTime}s</span>
                        )}
                      </div>
                      <p className="text-sm text-white"><span className="text-slate-500">Prompt:</span> {selectedThumb.originalPrompt}</p>
                      {selectedThumb.enhancedPrompt && selectedThumb.enhancedPrompt !== selectedThumb.originalPrompt && (
                        <p className="text-xs text-slate-500"><span className="text-slate-600">Enhanced:</span> {selectedThumb.enhancedPrompt}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleDownload(selectedThumb.imageUrl, selectedThumb.originalPrompt)}
                          className="bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-lg h-9 text-sm transition-all"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { navigator.clipboard.writeText(selectedThumb.originalPrompt); }}
                          className="text-slate-400 hover:text-white hover:bg-white/[0.06] h-9 text-sm rounded-lg"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          Copy Prompt
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setPrompt(selectedThumb.originalPrompt); setSidebarTab("create"); setSelectedThumb(null); }}
                          className="text-slate-400 hover:text-white hover:bg-white/[0.06] h-9 text-sm rounded-lg"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Regenerate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(selectedThumb.id)}
                          className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 h-9 text-sm rounded-lg"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Gallery Tab ── */
            <div className="px-4 md:px-8 py-8 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white">Your Thumbnails</h1>
                  <p className="mt-1 text-sm text-slate-500">{thumbnails.length} generation{thumbnails.length !== 1 ? "s" : ""}</p>
                </div>
                <Button
                  onClick={() => setSidebarTab("create")}
                  className="bg-amber-500 hover:bg-amber-400 text-[#080c14] font-semibold h-9 px-4 rounded-lg text-sm"
                >
                  + New
                </Button>
              </div>
              {thumbnails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-20 w-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-slate-500 text-sm">No thumbnails yet</p>
                  <p className="text-slate-600 text-xs mt-1">Create your first one to get started</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {thumbnails.map((t) => (
                    <div
                      key={t.id}
                      className="group rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-amber-500/20 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                      onClick={() => { setSelectedThumb(t); setSidebarTab("create"); }}
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={t.imageUrl}
                          alt={t.originalPrompt}
                          className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-sm text-white truncate" title={t.originalPrompt}>
                          {t.originalPrompt}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {t.style && t.style !== "default" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400/80 capitalize">{t.style.replace(/-/g, " ")}</span>
                          )}
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-slate-500">{t.layout}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-600">{new Date(t.createdAt).toLocaleDateString()}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-slate-500 hover:text-white hover:bg-white/[0.06] text-xs"
                            onClick={(e) => { e.stopPropagation(); handleDownload(t.imageUrl, t.originalPrompt); }}
                          >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 text-xs"
                            onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
