import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c14] bg-mesh">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080c14]/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[#080c14] font-bold text-sm">T</div>
            <span className="text-xl font-bold tracking-tight text-white">
              Thumbnail<span className="text-amber-400">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link
                href="/login"
                className="text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Login
              </Link>
            </Button>
            <Button asChild className="bg-amber-500 hover:bg-amber-400 text-[#080c14] font-semibold shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative pt-36 pb-28 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-sm text-amber-400 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            AI-Powered Generation
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl leading-[1.1]">
            Create Stunning
            <span className="block bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">AI Thumbnails</span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Describe your content. We enhance it with Gemini AI and generate
            stunning thumbnails with Hugging Face. Free to start — upgrade when
            you&apos;re ready.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-400 text-[#080c14] text-base h-13 px-8 font-semibold shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:-translate-y-0.5">
              <Link href="/register">Start Free — 2 Free Generations</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white hover:border-white/20 h-13 px-8 transition-all">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-amber-400 font-medium text-sm tracking-wider uppercase mb-3">How It Works</p>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Three Simple Steps
            </h2>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
              From idea to eye-catching thumbnail in seconds
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "✏️", step: "01", title: "Describe", desc: "Enter a simple prompt describing your video or content" },
              { icon: "✨", step: "02", title: "Enhance", desc: "Gemini AI refines your prompt for maximum visual impact" },
              { icon: "🖼️", step: "03", title: "Generate", desc: "Hugging Face creates your thumbnail — download instantly" },
            ].map((item) => (
              <Card key={item.step} className="group border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 hover:border-amber-500/20 hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{item.icon}</span>
                    <span className="text-xs font-mono text-slate-600 group-hover:text-amber-500/50 transition-colors">{item.step}</span>
                  </div>
                  <CardTitle className="text-white text-lg">{item.title}</CardTitle>
                  <CardDescription className="text-slate-400 leading-relaxed">
                    {item.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 font-medium text-sm tracking-wider uppercase mb-3">Pricing</p>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Simple Pricing</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-white">Free</CardTitle>
                <CardDescription className="text-slate-400">Get started instantly</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">₹0<span className="text-sm font-normal text-slate-500">/forever</span></p>
                <ul className="mt-6 space-y-3 text-sm text-slate-400">
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 2 thumbnail generations</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> AI prompt enhancement</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Instant download</li>
                </ul>
                <Button asChild variant="outline" className="w-full mt-8 border-white/10 text-slate-300 hover:bg-white/5">
                  <Link href="/register">Start Free</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30 bg-amber-500/[0.03] glow-amber relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-500 text-[#080c14] text-xs font-bold px-3 py-1 rounded-full">POPULAR</span>
              </div>
              <CardHeader>
                <CardTitle className="text-white">Premium</CardTitle>
                <CardDescription className="text-slate-400">For serious creators</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">₹99<span className="text-sm font-normal text-slate-500">/one-time</span></p>
                <ul className="mt-6 space-y-3 text-sm text-slate-400">
                  <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> Unlimited generations</li>
                  <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> AI prompt enhancement</li>
                  <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> Priority processing</li>
                  <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> Email notifications</li>
                </ul>
                <Button asChild className="w-full mt-8 bg-amber-500 hover:bg-amber-400 text-[#080c14] font-semibold shadow-lg shadow-amber-500/20">
                  <Link href="/register">Get Premium</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5" />
          <div className="relative">
            <h3 className="text-3xl font-bold text-white">
              Ready to boost your click-through rate?
            </h3>
            <p className="mt-4 text-slate-400">
              Join creators who generate thumbnails in seconds, not hours.
            </p>
            <Button asChild size="lg" className="mt-8 bg-amber-500 hover:bg-amber-400 text-[#080c14] font-semibold h-13 px-10 shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:-translate-y-0.5">
              <Link href="/register">Create Free Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[#080c14] font-bold text-[10px]">T</div>
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} ThumbnailAI
            </p>
          </div>
          <div className="flex gap-6">
            <Link
              href="/admin/login"
              className="text-sm text-slate-600 hover:text-slate-400 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
