"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isPremium: boolean;
  generationCount: number;
  createdAt: string;
}

interface AdminPayment {
  id: string;
  userEmail?: string;
  userName?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  status: string;
  createdAt: string;
}

interface AdminThumbnail {
  id: string;
  userEmail?: string;
  originalPrompt: string;
  enhancedPrompt: string;
  imageUrl: string;
  size: string;
  layout: string;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  totalGenerations: number;
  totalPayments: number;
  premiumUsers: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [thumbnails, setThumbnails] = useState<AdminThumbnail[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [selectedThumbnails, setSelectedThumbnails] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const isAdmin = typeof window !== "undefined" ? localStorage.getItem("admin") : null;
    if (!token || !isAdmin) {
      router.push("/admin/login");
      setLoading(false);
      return;
    }
    api
      .get<{ user: { name: string; email: string; role: string } }>("/api/auth/me")
      .then((res) => {
        if (res.user?.role !== "admin") {
          router.push("/admin/login");
          return;
        }
        setUser(res.user);
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    api.get<Stats>("/api/admin/stats").then(setStats).catch(() => setStats(null));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setUsersLoading(true);
    api
      .get<{ users: AdminUser[] }>("/api/admin/users")
      .then((res) => setUsers(res.users || []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [user]);

  function loadPayments() {
    if (!user) return;
    setPaymentsLoading(true);
    api
      .get<{ payments: AdminPayment[] }>("/api/admin/payments")
      .then((res) => setPayments(res.payments || []))
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false));
  }

  function loadThumbnails() {
    if (!user) return;
    setThumbnailsLoading(true);
    api
      .get<{ thumbnails: AdminThumbnail[] }>("/api/admin/thumbnails")
      .then((res) => setThumbnails(res.thumbnails || []))
      .catch(() => setThumbnails([]))
      .finally(() => setThumbnailsLoading(false));
  }

  function handleTogglePremium(u: AdminUser) {
    setTogglingId(u.id);
    api
      .patch<{ user: AdminUser }>(`/api/admin/users/${u.id}/premium`)
      .then((res) => {
        setUsers((prev) =>
          prev.map((x) => (x.id === u.id ? { ...x, isPremium: res.user.isPremium } : x))
        );
        api.get<Stats>("/api/admin/stats").then(setStats).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setTogglingId(null));
  }

  function toggleSelectThumbnail(id: string) {
    setSelectedThumbnails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedThumbnails.size === thumbnails.length) {
      setSelectedThumbnails(new Set());
    } else {
      setSelectedThumbnails(new Set(thumbnails.map((t) => t.id)));
    }
  }

  async function handleDeleteThumbnails(ids: string[]) {
    if (!confirm(`Delete ${ids.length} thumbnail(s)? This cannot be undone.`)) return;
    setDeletingIds(new Set(ids));
    try {
      await api.del("/api/admin/thumbnails", { ids });
      setThumbnails((prev) => prev.filter((t) => !ids.includes(t.id)));
      setSelectedThumbnails((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      // Refresh stats
      api.get<Stats>("/api/admin/stats").then(setStats).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingIds(new Set());
    }
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("admin");
    }
    router.push("/admin/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 animate-pulse" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex">
      {/* ── Left Sidebar ── */}
      <aside className="hidden md:flex w-[260px] flex-col border-r border-white/[0.06] bg-[#0a0f1a] flex-shrink-0">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/[0.06]">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm">A</div>
          <span className="text-lg font-bold text-white">Admin<span className="text-red-400">Panel</span></span>
        </div>

        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-400/20 to-red-600/20 flex items-center justify-center text-red-400 font-semibold text-sm">A</div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || "Admin"}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/admin/dashboard" className="sidebar-item active flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 bg-red-500/[0.08]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Dashboard
          </Link>
          <Link href="/" className="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Home
          </Link>
        </nav>

        <div className="px-3 pb-4 border-t border-white/[0.06] pt-4">
          <Button variant="ghost" onClick={handleLogout} className="w-full text-slate-500 hover:text-white hover:bg-white/[0.04] h-9 text-sm rounded-lg justify-start gap-2">
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
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-xs">A</div>
            <span className="font-bold text-white text-sm">Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 h-8 w-8 p-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Manage users, generations, and payments</p>

          {/* Stats cards */}
          {stats && (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total Users", value: stats.totalUsers, color: "text-white", icon: "👥" },
                { label: "Generations", value: stats.totalGenerations, color: "text-white", icon: "🖼️" },
                { label: "Premium Users", value: stats.premiumUsers, color: "text-amber-400", icon: "⭐" },
                { label: "Test Payments", value: stats.totalPayments, color: "text-white", icon: "💳" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.1] transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{s.label}</p>
                    <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity">{s.icon}</span>
                  </div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="users" className="mt-8">
            <TabsList className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 h-auto">
              <TabsTrigger value="users" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-slate-500 rounded-lg px-4 py-2 text-sm transition-all">
                Users
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-slate-500 rounded-lg px-4 py-2 text-sm transition-all" onClick={loadPayments}>
                Payments
              </TabsTrigger>
              <TabsTrigger value="thumbnails" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-slate-500 rounded-lg px-4 py-2 text-sm transition-all" onClick={loadThumbnails}>
                Thumbnails
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                {usersLoading ? (
                  <div className="p-12 text-center text-slate-500 text-sm">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">No users yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">Name</TableHead>
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">Email</TableHead>
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">Role</TableHead>
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">Gens</TableHead>
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">Premium</TableHead>
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                          <TableCell className="text-white text-sm">{u.name}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{u.email}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-white/[0.05] text-slate-400 border border-white/[0.08]"}`}>
                              {u.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">{u.generationCount}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${u.isPremium ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-white/[0.03] text-slate-600 border border-white/[0.06]"}`}>
                              {u.isPremium ? "Yes" : "No"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg"
                              disabled={u.role === "admin" || togglingId === u.id}
                              onClick={() => handleTogglePremium(u)}
                            >
                              {togglingId === u.id ? "..." : u.isPremium ? "Remove" : "Grant"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                {paymentsLoading ? (
                  <div className="p-12 text-center text-slate-500 text-sm">Loading payments...</div>
                ) : payments.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">No payments yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">User</TableHead>
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">Order ID</TableHead>
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">Payment ID</TableHead>
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">Status</TableHead>
                        <TableHead className="text-slate-500 text-xs uppercase tracking-wider font-medium">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id} className="border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                          <TableCell className="text-white text-sm">{p.userName || p.userEmail || "—"}</TableCell>
                          <TableCell className="text-slate-400 font-mono text-xs">{p.razorpayOrderId}</TableCell>
                          <TableCell className="text-slate-400 font-mono text-xs">{p.razorpayPaymentId}</TableCell>
                          <TableCell>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{p.status}</span>
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">
                            {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="thumbnails" className="mt-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                {thumbnailsLoading ? (
                  <div className="p-12 text-center text-slate-500 text-sm">Loading thumbnails...</div>
                ) : thumbnails.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">No thumbnails yet.</div>
                ) : (
                  <div className="p-4">
                    {/* Bulk actions bar */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                        >
                          <span className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                            selectedThumbnails.size === thumbnails.length
                              ? "bg-red-500 border-red-500"
                              : "border-white/20 hover:border-white/40"
                          }`}>
                            {selectedThumbnails.size === thumbnails.length && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            )}
                          </span>
                          {selectedThumbnails.size > 0
                            ? `${selectedThumbnails.size} selected`
                            : "Select all"}
                        </button>
                      </div>
                      {selectedThumbnails.size > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleDeleteThumbnails(Array.from(selectedThumbnails))}
                          disabled={deletingIds.size > 0}
                          className="h-8 px-3 text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg"
                        >
                          {deletingIds.size > 0 ? "Deleting..." : `Delete ${selectedThumbnails.size} selected`}
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {thumbnails.map((t) => (
                        <div
                          key={t.id}
                          className={`group rounded-xl border overflow-hidden transition-all duration-300 ${
                            selectedThumbnails.has(t.id)
                              ? "border-red-500/40 bg-red-500/[0.04]"
                              : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                          }`}
                        >
                          <div className="relative overflow-hidden">
                            <img
                              src={t.imageUrl}
                              alt={t.originalPrompt}
                              className="h-32 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Select checkbox overlay */}
                            <button
                              onClick={() => toggleSelectThumbnail(t.id)}
                              className={`absolute top-2 left-2 h-5 w-5 rounded border flex items-center justify-center transition-all ${
                                selectedThumbnails.has(t.id)
                                  ? "bg-red-500 border-red-500"
                                  : "bg-black/50 border-white/30 opacity-0 group-hover:opacity-100"
                              }`}
                            >
                              {selectedThumbnails.has(t.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              )}
                            </button>
                          </div>
                          <div className="p-3">
                            <p className="text-[10px] text-slate-600 mb-1">{t.userEmail}</p>
                            <p className="text-sm text-white truncate" title={t.originalPrompt}>
                              {t.originalPrompt}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-[10px] text-slate-600">{t.size} • {t.layout}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteThumbnails([t.id])}
                                disabled={deletingIds.has(t.id)}
                                className="h-6 w-6 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                              >
                                {deletingIds.has(t.id) ? (
                                  <span className="text-[10px]">...</span>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
