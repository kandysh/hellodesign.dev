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
  CheckCircle,
  PenLine,
  Github,
} from "lucide-react"

export const Route = createFileRoute("/")({ component: HomePage })

const CATEGORIES = [
  { slug: "messaging",      label: "Messaging",     icon: MessageSquare, count: 4 },
  { slug: "storage",        label: "Storage",       icon: Database,      count: 6 },
  { slug: "networking",     label: "CDN & Networks",icon: Globe,         count: 3 },
  { slug: "caching",        label: "Rate Limiting", icon: Gauge,         count: 5 },
  { slug: "api-design",     label: "Search Systems",icon: Search,        count: 4 },
  { slug: "distributed-systems", label: "Auth & Security", icon: Shield, count: 5 },
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
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 md:py-28">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          {/* Left */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
              <Sparkles size={12} />
              Multi-agent AI evaluation on every answer
            </div>
            <h1 className="mb-4 text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
              Design systems.
              <br />
              <span className="text-primary">Get evaluated</span>
              <br />
              by AI.
            </h1>
            <p className="mb-8 max-w-md text-lg text-base-content/60 leading-relaxed">
              Practice real system design questions. Draw your architecture. Receive
              deep, structured feedback across 7 dimensions — instantly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/questions"
                className="btn btn-primary btn-lg rounded-lg gap-2 shadow-lg shadow-primary/20 transition-default hover:shadow-primary/40"
              >
                Start solving <ArrowRight size={16} />
              </Link>
              <Link
                to="/questions"
                className="btn btn-ghost btn-lg rounded-lg border border-base-300/50 transition-default hover:border-base-300"
              >
                Browse questions
              </Link>
            </div>
          </div>

          {/* Right — animated preview card */}
          <div className="relative hidden md:block">
            <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-3xl" />
            <PreviewCard />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="border-t border-base-300/40 bg-base-200/40 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mb-12 text-center text-base-content/50">
            Three steps to better system design skills
          </p>

          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Connector line (desktop) */}
            <div
              className="absolute top-8 left-1/4 right-1/4 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block"
              aria-hidden="true"
            />

            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.n}
                  className="relative rounded-xl border border-base-300/40 bg-base-200 p-6 shadow-lg shadow-indigo-950/40 transition-default hover:border-primary/30 hover:shadow-primary/10"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon size={18} />
                    </div>
                    <span className="font-mono text-xs font-bold text-base-content/30 tracking-widest">
                      STEP {step.n}
                    </span>
                  </div>
                  <h3 className="mb-2 font-semibold text-base-content">{step.title}</h3>
                  <p className="text-sm text-base-content/50 leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">Question categories</h2>
          <p className="mb-12 text-center text-base-content/50">
            From fundamentals to senior-level distributed systems
          </p>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.slug}
                  to="/questions"
                  search={{ category: cat.slug } as never}
                  className="group relative overflow-hidden rounded-xl border border-base-300/40 bg-base-200 p-5 transition-default hover:border-primary/40 hover:shadow-lg hover:shadow-indigo-950/40"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-default group-hover:opacity-100" />
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-base-300/60 text-primary transition-default group-hover:bg-primary/15">
                    <Icon size={20} />
                  </div>
                  <p className="font-semibold text-base-content">{cat.label}</p>
                  <p className="text-xs text-base-content/40 mt-0.5">{cat.count} questions</p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-base-300/40 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <span className="font-mono text-sm text-base-content/40">
            <span className="text-primary">sys</span>design
            <span className="ml-0.5 inline-block h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
          </span>
          <p className="text-xs text-base-content/30">
            Practice system design. Get evaluated by AI.
          </p>
          <a
            href="https://github.com/kandysh/hellodesign.dev"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-base-content/40 transition-default hover:text-base-content/70"
          >
            <Github size={14} />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}

// ── Animated preview card ─────────────────────────────────────

function PreviewCard() {
  return (
    <div className="relative rounded-2xl border border-base-300/50 bg-base-200 p-5 shadow-2xl shadow-indigo-950/60">
      {/* Question header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="badge badge-sm badge-warning badge-outline">Medium</span>
            <span className="text-xs text-base-content/40">~25 min</span>
          </div>
          <p className="font-semibold text-sm text-base-content">Design a URL Shortener</p>
        </div>
      </div>

      {/* Fake diagram preview */}
      <div className="mb-4 overflow-hidden rounded-xl border border-base-300/40 bg-base-300/30" style={{ height: 120 }}>
        <div className="flex h-full items-center justify-center gap-3 px-4 opacity-60">
          <FakeBox label="Client" />
          <FakeArrow />
          <FakeBox label="API GW" highlight />
          <FakeArrow />
          <div className="flex flex-col gap-1.5">
            <FakeBox label="App" small />
            <FakeBox label="Redis" small />
          </div>
          <FakeArrow />
          <FakeBox label="DB" />
        </div>
      </div>

      {/* Score preview */}
      <div className="flex items-center gap-3 rounded-xl border border-base-300/40 bg-base-300/20 p-3">
        <div className="relative">
          <svg width={52} height={52}>
            <circle cx={26} cy={26} r={20} fill="none" stroke="#1e1e2e" strokeWidth={5} />
            <circle
              cx={26} cy={26} r={20} fill="none"
              stroke="#4ade80" strokeWidth={5}
              strokeDasharray={125.66} strokeDashoffset={28}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
            />
            <text x={26} y={30} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#4ade80">82</text>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-base-content/70 mb-1.5">Evaluation score</p>
          <div className="flex flex-wrap gap-1">
            {["Scalability 85", "DB 74", "API 88"].map((d) => (
              <span key={d} className="rounded-full border border-base-300/50 bg-base-300/30 px-2 py-0.5 text-[10px] text-base-content/50">
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Blur overlay suggesting more content */}
      <div className="absolute bottom-0 left-0 right-0 h-8 rounded-b-2xl bg-gradient-to-t from-base-200 to-transparent" />
    </div>
  )
}

function FakeBox({ label, highlight, small }: { label: string; highlight?: boolean; small?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg border text-center font-mono text-[9px] font-semibold ${
        highlight
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-base-300/60 bg-base-300/40 text-base-content/50"
      } ${small ? "h-7 w-12" : "h-9 w-14"}`}
    >
      {label}
    </div>
  )
}

function FakeArrow() {
  return <div className="h-px w-5 bg-base-content/20" aria-hidden="true" />
}
