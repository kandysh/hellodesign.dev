import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowRight,
  MessageSquare,
  Database,
  Globe,
  Shield,
  Search,
  Gauge,
  Sparkles,
  PenLine,
  Github,
  Layers,
  Activity,
} from "lucide-react"

export const Route = createFileRoute("/")({ component: HomePage })

const CATEGORIES = [
  { slug: "messaging",           label: "Messaging",          icon: MessageSquare, count: 4 },
  { slug: "storage",             label: "Storage",            icon: Database,      count: 6 },
  { slug: "networking",          label: "CDN & Networks",     icon: Globe,         count: 3 },
  { slug: "caching",             label: "Rate Limiting",      icon: Gauge,         count: 5 },
  { slug: "api-design",          label: "Search Systems",     icon: Search,        count: 4 },
  { slug: "distributed-systems", label: "Auth & Security",    icon: Shield,        count: 5 },
]

const STEPS = [
  {
    n: "01",
    title: "Pick a question",
    desc: "Browse 30+ real system design questions — URL shorteners, distributed caches, video streaming platforms, and more.",
    icon: Search,
  },
  {
    n: "02",
    title: "Write & diagram your answer",
    desc: "Use the rich text editor to explain your architecture and the Excalidraw canvas to draw component diagrams.",
    icon: PenLine,
  },
  {
    n: "03",
    title: "Get evaluated by AI",
    desc: "7 specialist agents score your answer across requirements, scalability, data model, API design, and more.",
    icon: Sparkles,
  },
]

function HomePage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0b1326" }}>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-6 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
          {/* Left */}
          <div className="flex flex-col gap-6 z-10">
            {/* Live badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit text-xs font-medium"
              style={{ background: "#171f33", border: "1px solid #2d3449", color: "#c7c4d7" }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "#4edea3" }}
              />
              <span style={{ fontFamily: "'Space Grotesk', monospace" }}>
                System Design V2.0 is Live
              </span>
            </div>

            <h1
              className="font-extrabold leading-tight"
              style={{ fontSize: "clamp(2.5rem,5vw,3.5rem)", letterSpacing: "-0.02em", color: "#dae2fd" }}
            >
              Master Technical Interviews with{" "}
              <span style={{ color: "#8083ff" }}>AI‑Led Precision.</span>
            </h1>

            <p className="text-base leading-relaxed max-w-xl" style={{ color: "#c7c4d7" }}>
              High‑density environments for data‑driven architects. Simulate real‑world system
              design constraints with our Excalidraw‑style canvas and Lexical‑style technical editor.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                to="/questions"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/50 transition-all duration-150 active:scale-95"
                style={{ boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}
              >
                Start Interview Simulation
                <ArrowRight size={15} />
              </Link>
              <Link
                to="/questions"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded text-sm font-medium transition-all duration-150 active:scale-95 border"
                style={{ color: "#c0c1ff", borderColor: "#464554", background: "transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#171f33" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                Browse Questions
              </Link>
            </div>
          </div>

          {/* Right — mock architecture canvas */}
          <div className="relative hidden lg:block">
            <div
              className="absolute -inset-6 rounded-3xl blur-3xl opacity-20"
              style={{ background: "radial-gradient(ellipse at center, #6366f1, transparent)" }}
            />
            <MockCanvas />
          </div>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────── */}
      <div
        className="border-y"
        style={{ borderColor: "#222a3d", background: "#131b2e" }}
      >
        <div className="max-w-[1440px] mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { val: "30+",  label: "Design problems" },
            { val: "7",    label: "AI evaluation agents" },
            { val: "4",    label: "Scoring dimensions" },
            { val: "100%", label: "Free to start" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span className="text-3xl font-extrabold" style={{ color: "#c0c1ff", letterSpacing: "-0.02em" }}>
                {stat.val}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#908fa0" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ──────────────────────────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-6 py-20">
        <div className="mb-12 text-center">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "#c0c1ff" }}
          >
            Process
          </p>
          <h2 className="text-3xl font-bold" style={{ color: "#dae2fd", letterSpacing: "-0.01em" }}>
            How it works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.n}
                className="flex flex-col gap-4 p-6 rounded-lg group hover:border-indigo-500/40 transition-all duration-200"
                style={{ background: "#171f33", border: "1px solid #2d3449" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center shrink-0"
                    style={{ background: "rgba(192,193,255,0.1)", color: "#c0c1ff" }}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    className="font-bold text-xs uppercase tracking-widest"
                    style={{ color: "#464554", fontFamily: "'Space Grotesk', monospace" }}
                  >
                    Step {step.n}
                  </span>
                </div>
                <h3 className="font-bold text-base" style={{ color: "#dae2fd" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#908fa0" }}>{step.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────── */}
      <section
        className="border-t"
        style={{ borderColor: "#222a3d", background: "rgba(23,31,51,0.5)" }}
      >
        <div className="w-full max-w-[1440px] mx-auto px-6 py-20">
          <div className="mb-12 text-center">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "#4edea3" }}
            >
              Categories
            </p>
            <h2 className="text-3xl font-bold" style={{ color: "#dae2fd", letterSpacing: "-0.01em" }}>
              Question categories
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.slug}
                  to="/questions"
                  search={{ category: cat.slug } as never}
                  className="group relative overflow-hidden flex flex-col gap-3 p-5 rounded-lg transition-all duration-200"
                  style={{
                    background: "#171f33",
                    border: "1px solid #2d3449",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(128,131,255,0.5)"
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#2d3449"
                  }}
                >
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center transition-colors duration-200"
                    style={{ background: "rgba(192,193,255,0.08)", color: "#c0c1ff" }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#dae2fd" }}>{cat.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#464554" }}>{cat.count} questions</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-6 py-20">
        <div
          className="rounded-xl p-10 flex flex-col md:flex-row items-center justify-between gap-8"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(23,31,51,0.8) 100%)",
            border: "1px solid rgba(128,131,255,0.2)",
          }}
        >
          <div className="flex flex-col gap-2">
            <h2
              className="text-2xl font-bold"
              style={{ color: "#dae2fd", letterSpacing: "-0.01em" }}
            >
              Ready to level up your system design?
            </h2>
            <p className="text-sm" style={{ color: "#908fa0" }}>
              Start practicing with real-world challenges. Free forever.
            </p>
          </div>
          <Link
            to="/questions"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/50 transition-all duration-150 active:scale-95"
            style={{ boxShadow: "0 0 16px rgba(99,102,241,0.35)" }}
          >
            <Activity size={15} />
            Start Practicing
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        className="border-t py-8"
        style={{ borderColor: "#222a3d" }}
      >
        <div className="max-w-[1440px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span
            className="font-black text-base tracking-tighter"
            style={{ color: "#dae2fd" }}
          >
            Hello Design
          </span>
          <p className="text-xs" style={{ color: "#464554" }}>
            Practice system design. Get evaluated by AI.
          </p>
          <a
            href="https://github.com/kandysh/hellodesign.dev"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs transition-colors duration-150 hover:text-slate-300"
            style={{ color: "#464554" }}
          >
            <Github size={14} />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}

// ── Mock Architecture Canvas ──────────────────────────────────

function MockCanvas() {
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden flex flex-col"
      style={{
        background: "#131b2e",
        border: "1px solid #2d3449",
        height: 440,
      }}
    >
      {/* Faux header bar */}
      <div
        className="h-8 flex items-center px-4 gap-2 shrink-0"
        style={{ background: "#0b1326", borderBottom: "1px solid #2d3449" }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#2d3449" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#2d3449" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#2d3449" }} />
        <span className="ml-2 text-xs" style={{ color: "#464554", fontFamily: "'Space Grotesk', monospace" }}>
          design-workspace.canvas
        </span>
      </div>

      {/* Dot-grid canvas */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundImage: "radial-gradient(#2d3449 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          background: "#0b1326",
          backgroundRepeat: "repeat",
        }}
      >
        {/* Node: Client */}
        <CanvasNode label="Client" top={40} left={24} />

        {/* Connector */}
        <svg aria-hidden="true" className="absolute" style={{ top: 62, left: 130, overflow: "visible", width: 60, height: 2 }}>
          <line x1="0" y1="1" x2="60" y2="1" stroke="#464554" strokeWidth="1.5" strokeDasharray="4 3" />
          <polygon points="58,0 62,1 58,2" fill="#464554" />
        </svg>

        {/* Node: Load Balancer (highlighted) */}
        <CanvasNode label="Load Balancer" top={40} left={196} highlight />

        {/* Connector down */}
        <svg aria-hidden="true" className="absolute" style={{ top: 110, left: 268, overflow: "visible", width: 2, height: 60 }}>
          <line x1="1" y1="0" x2="1" y2="60" stroke="#464554" strokeWidth="1.5" strokeDasharray="4 3" />
          <polygon points="0,58 1,62 2,58" fill="#464554" />
        </svg>

        {/* Node: App Server */}
        <CanvasNode label="App Server" top={172} left={196} />

        {/* Connector right */}
        <svg aria-hidden="true" className="absolute" style={{ top: 194, left: 316, overflow: "visible", width: 60, height: 2 }}>
          <line x1="0" y1="1" x2="60" y2="1" stroke="#464554" strokeWidth="1.5" strokeDasharray="4 3" />
          <polygon points="58,0 62,1 58,2" fill="#464554" />
        </svg>

        {/* Node: DB */}
        <CanvasNode label="PostgreSQL" top={172} left={380} />

        {/* Node: Cache (bottom-right area) */}
        <div
          className="absolute flex items-center gap-2 px-3 py-2 rounded text-xs font-medium"
          style={{
            top: 280,
            left: 196,
            background: "rgba(78,222,163,0.08)",
            border: "1px dashed rgba(78,222,163,0.4)",
            color: "#4edea3",
            fontFamily: "'Space Grotesk', monospace",
          }}
        >
          <Layers size={12} />
          Redis Cache
        </div>

        {/* Score badge */}
        <div
          className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded text-xs"
          style={{ background: "#131b2e", border: "1px solid #2d3449", color: "#908fa0" }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#4edea3" }} />
          <span style={{ fontFamily: "'Space Grotesk', monospace" }}>AI evaluating…</span>
        </div>
      </div>

      {/* Bottom editor strip */}
      <div
        className="px-4 py-3 text-xs"
        style={{ background: "#131b2e", borderTop: "1px solid #2d3449", color: "#c7c4d7" }}
      >
        <span style={{ color: "#8083ff", fontFamily: "'Space Grotesk', monospace" }}>Design Notes: </span>
        Use read replicas for global latency reduction. Add CDN layer…
      </div>
    </div>
  )
}

function CanvasNode({
  label,
  top,
  left,
  highlight,
}: {
  label: string
  top: number
  left: number
  highlight?: boolean
}) {
  return (
    <div
      className="absolute flex items-center gap-2 px-3 py-2 rounded text-xs font-medium"
      style={{
        top,
        left,
        background: highlight ? "rgba(128,131,255,0.12)" : "#171f33",
        border: highlight ? "1px solid rgba(128,131,255,0.5)" : "1px solid #2d3449",
        color: highlight ? "#c0c1ff" : "#dae2fd",
        boxShadow: highlight ? "0 0 8px rgba(128,131,255,0.25)" : undefined,
        fontFamily: "'Space Grotesk', monospace",
      }}
    >
      {label}
    </div>
  )
}
