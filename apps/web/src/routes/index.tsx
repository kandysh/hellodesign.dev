import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  ArrowRight,
  Database,
  Gauge,
  Globe,
  Layers,
  MessageSquare,
  PenLine,
  Search,
  Shield,
  Sparkles,
} from "lucide-react"

export const Route = createFileRoute("/")({ component: HomePage })

const CATEGORY_INFO: Record<string, { label: string; icon: typeof MessageSquare }> = {
  messaging: { label: "Messaging", icon: MessageSquare }, storage: { label: "Storage", icon: Database },
  networking: { label: "Networking", icon: Globe }, caching: { label: "Caching", icon: Gauge },
  "api-design": { label: "API Design", icon: Search }, "distributed-systems": { label: "Distributed Systems", icon: Shield },
  databases: { label: "Databases", icon: Database }, general: { label: "General", icon: Layers },
}

const STEPS = [
  {
    n: "01",
    title: "Pick a question",
    desc: "Browse the available system design questions and practice architecture decisions with AI feedback.",
    icon: Search,
  },
  {
    n: "02",
    title: "Write & diagram your answer",
    desc: "Explain your decisions in Markdown, add an architecture diagram, and include an optional code example.",
    icon: PenLine,
  },
  {
    n: "03",
    title: "Get evaluated by AI",
    desc: "Get AI feedback across the rubric dimensions configured for each question.",
    icon: Sparkles,
  },
]

function HomePage() {
  const { data: questions = [] } = useQuery<{ category: string }[]>({
    queryKey: ["questions", "home-counts"],
    queryFn: () => fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/questions`).then((r) => { if (!r.ok) throw new Error("Could not load questions"); return r.json() }),
    staleTime: 60_000,
  })
  const categoryCounts = questions.reduce<Record<string, number>>((counts, question) => { counts[question.category] = (counts[question.category] ?? 0) + 1; return counts }, {})
  const categories = Object.entries(categoryCounts).map(([slug, count]) => ({ slug, count, ...(CATEGORY_INFO[slug] ?? { label: slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), icon: Layers }) }))
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--app-bg)" }}>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
          {/* Left */}
          <div className="flex flex-col gap-6 z-10">
            {/* Live badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit text-xs font-medium"
              style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-body)" }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "var(--app-green)" }}
              />
              <span style={{ fontFamily: "'Space Grotesk', monospace" }}>
                BYOK · Use a provider key you control
              </span>
            </div>

            <h1
              className="font-extrabold leading-tight"
              style={{
                fontSize: "clamp(2.5rem,5vw,3.5rem)",
                letterSpacing: "-0.02em",
                color: "var(--app-fg)",
              }}
            >
              Practice system design interviews with{" "}
              <span style={{ color: "var(--app-indigo)" }}>your chosen model.</span>
            </h1>

            <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--app-body)" }}>
              Work through system design prompts, organize your thinking in a notebook, and get rubric-based AI feedback on your design.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                to="/questions"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded text-sm font-semibold text-white bg-primary hover:brightness-110 border border-indigo-400/50 transition-all duration-150 active:scale-95"
                style={{ boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}
              >
                Explore practice questions
                <ArrowRight size={15} />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded text-sm font-medium transition-all duration-150 active:scale-95 border"
                style={{ color: "var(--app-indigo-pale)", borderColor: "var(--app-muted)", background: "transparent" }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = "var(--app-surface-2)"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = "transparent"
                }}
              >
                How BYOK works
              </Link>
            </div>
            <p className="text-xs" style={{ color: "var(--app-muted)" }}>
              Browse and write before adding a key. <Link to="/settings" className="font-medium underline underline-offset-4" style={{ color: "var(--app-indigo-pale)" }}>Set up a provider key</Link> when you’re ready for an AI review.
            </p>
          </div>

          {/* Right — clearly illustrative architecture diagram */}
          <div className="relative hidden lg:block">
            <div
              className="absolute -inset-6 rounded-3xl blur-3xl opacity-20"
              style={{ background: "radial-gradient(ellipse at center, var(--app-indigo), transparent)" }}
            />
            <IllustrativeDiagram />
          </div>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────── */}
      <div className="border-y" style={{ borderColor: "var(--app-surface-4)", background: "var(--app-surface)" }}>
        <div className="max-w-[1440px] mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { val: questions.length ? String(questions.length) : "—", label: "Available questions" },
            { val: "BYOK", label: "Use your model key" },
            { val: "Quick + Deep", label: "Practice modes" },
            { val: "Personal", label: "Progress tracking" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span
                className="text-3xl font-extrabold"
                style={{ color: "var(--app-indigo-pale)", letterSpacing: "-0.02em" }}
              >
                {stat.val}
              </span>
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--app-subtle)" }}
              >
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
            style={{ color: "var(--app-indigo-pale)" }}
          >
            Process
          </p>
          <h2 className="text-3xl font-bold" style={{ color: "var(--app-fg)", letterSpacing: "-0.01em" }}>
            How it works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.n}
        className="surface-card flex flex-col gap-4 p-6 rounded-2xl"
                style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center shrink-0"
                    style={{ background: "rgba(192,193,255,0.1)", color: "var(--app-indigo-pale)" }}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    className="font-bold text-xs uppercase tracking-widest"
                    style={{ color: "var(--app-muted)", fontFamily: "'Space Grotesk', monospace" }}
                  >
                    Step {step.n}
                  </span>
                </div>
                <h3 className="font-bold text-base" style={{ color: "var(--app-fg)" }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--app-subtle)" }}>
                  {step.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────── */}
      <section
        className="border-t"
        style={{ borderColor: "var(--app-border-2)", background: "var(--app-bg-elevated)" }}
      >
        <div className="w-full max-w-[1440px] mx-auto px-6 py-20">
          <div className="mb-12 text-center">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "var(--app-green)" }}
            >
              Categories
            </p>
            <h2
              className="text-3xl font-bold"
              style={{ color: "var(--app-fg)", letterSpacing: "-0.01em" }}
            >
              Question categories
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.slug}
                  to="/questions"
                  search={{ category: cat.slug } as never}
                  className="group relative overflow-hidden flex flex-col gap-3 p-5 rounded-lg transition-all duration-200"
                  style={{
                    background: "var(--app-surface-2)",
                    border: "1px solid var(--app-border)",
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(128,131,255,0.5)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = "var(--app-border)"
                  }}
                >
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center transition-colors duration-200"
                    style={{ background: "rgba(192,193,255,0.08)", color: "var(--app-indigo-pale)" }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--app-fg)" }}>
                      {cat.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--app-muted)" }}>
                      {cat.count} questions
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Feature Grid (Bento Style) ─────────────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-6 py-20">
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--app-fg)" }}>
            A focused system design workspace
          </h2>
          <p className="text-sm" style={{ color: "var(--app-subtle)" }}>
            Use one workspace for your written answer, architecture diagram, code, and AI review.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Canvas — spans 2 columns */}
          <div className="md:col-span-2 flex flex-col gap-4 p-6 rounded-xl bento-card transition-colors hover:border-surface-bright">
            <div className="flex items-center justify-between">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "var(--app-bg)", border: "1px solid var(--app-border)", color: "var(--app-indigo)" }}
              >
                <Layers size={18} />
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded"
                style={{ background: "var(--app-surface-4)", color: "var(--app-subtle)" }}
              >
                CANVAS V2
              </span>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <h3 className="font-bold text-base" style={{ color: "var(--app-fg)" }}>
                Architecture diagrams
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--app-subtle)" }}>
                Sketch components and connections alongside your written design. Diagrams are included with your submission when added.
              </p>
            </div>
            {/* Visual preview */}
            <div
              className="mt-2 h-28 rounded-lg relative overflow-hidden flex items-center justify-center"
              style={{
                background: "var(--app-bg)",
                border: "1px solid var(--app-border)",
                backgroundImage: "radial-gradient(var(--app-border) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="px-3 py-1.5 rounded text-[12px]"
                  style={{
                    border: "1px solid var(--app-indigo)",
                    background: "var(--app-surface)",
                    color: "var(--app-indigo-pale)",
                    fontFamily: "'Space Grotesk', monospace",
                  }}
                >
                  Client
                </div>
                <div className="w-8 h-px" style={{ background: "var(--app-indigo)" }} />
                <div
                  className="px-3 py-1.5 rounded text-[12px]"
                  style={{
                    border: "1px solid var(--app-muted)",
                    background: "var(--app-surface)",
                    color: "var(--app-fg)",
                    fontFamily: "'Space Grotesk', monospace",
                  }}
                >
                  API Gateway
                </div>
              </div>
            </div>
          </div>

          {/* Editor — 1 column */}
          <div className="flex flex-col gap-4 p-6 rounded-xl bento-card transition-colors hover:border-surface-bright">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "var(--app-bg)", border: "1px solid var(--app-border)", color: "var(--app-indigo)" }}
            >
              <PenLine size={18} />
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <h3 className="font-bold text-base" style={{ color: "var(--app-fg)" }}>
                Markdown and code
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--app-subtle)" }}>
                Explain trade-offs in Markdown and add an optional syntax-highlighted code example to your notebook.
              </p>
            </div>
            {/* Code preview */}
            <div
              className="mt-auto rounded p-3 text-[11px] leading-relaxed"
              style={{
                background: "var(--app-bg-deep)",
                border: "1px solid var(--app-border)",
                fontFamily: "'Space Grotesk', monospace",
              }}
            >
              <div
                className="flex items-center gap-1.5 mb-2 pb-2"
                style={{ borderBottom: "1px solid var(--app-border)" }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--app-red)" }} />
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--app-muted)" }} />
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--app-green)" }} />
              </div>
              <span style={{ color: "var(--app-indigo)" }}>type</span>{" "}
              <span style={{ color: "var(--app-green)" }}>User</span>
              {" = {\n"}
              <span className="pl-4 block" style={{ color: "var(--app-body)" }}>
                id: string;
              </span>
              <span className="pl-4 block" style={{ color: "var(--app-body)" }}>
                {"role: "}
                <span style={{ color: "var(--app-green)" }}>{"'ADMIN'"}</span>
                {" | "}
                <span style={{ color: "var(--app-green)" }}>{"'USER'"}</span>
                {";"}
              </span>
              {"}"}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-6 py-20">
        <div
          className="rounded-xl p-10 flex flex-col md:flex-row items-center justify-between gap-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(23,31,51,0.8) 100%)",
            border: "1px solid var(--app-indigo-20)",
          }}
        >
          <div className="flex flex-col gap-2">
            <h2
              className="text-2xl font-bold"
              style={{ color: "var(--app-fg)", letterSpacing: "-0.01em" }}
            >
              Ready to level up your system design?
            </h2>
            <p className="text-sm" style={{ color: "var(--app-subtle)" }}>
              Bring your own model key. Provider usage charges are billed to your provider account.
            </p>
          </div>
          <Link
            to="/questions"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-semibold text-white bg-primary hover:brightness-110 border border-indigo-400/50 transition-all duration-150 active:scale-95"
            style={{ boxShadow: "0 0 16px rgba(99,102,241,0.35)" }}
          >
            <Activity size={15} />
            Start Practicing
          </Link>
        </div>
      </section>
    </div>
  )
}

// ── Illustrative architecture diagram ─────────────────────────

function IllustrativeDiagram() {
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden flex flex-col"
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        height: 440,
      }}
    >
      {/* Faux header bar */}
      <div
        className="h-8 flex items-center px-4 gap-2 shrink-0"
        style={{ background: "var(--app-bg)", borderBottom: "1px solid var(--app-border)" }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--app-border)" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--app-border)" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--app-border)" }} />
        <span
          className="ml-2 text-xs"
          style={{ color: "var(--app-muted)", fontFamily: "'Space Grotesk', monospace" }}
        >
          Illustrative architecture
        </span>
      </div>

      {/* Dot-grid canvas */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundImage: "radial-gradient(var(--app-border) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          background: "var(--app-bg)",
          backgroundRepeat: "repeat",
        }}
      >
        {/* Node: Client */}
        <CanvasNode label="Client" top={40} left={24} />

        {/* Connector */}
        <svg
          aria-hidden="true"
          className="absolute"
          style={{ top: 62, left: 130, overflow: "visible", width: 60, height: 2 }}
        >
          <line
            x1="0"
            y1="1"
            x2="60"
            y2="1"
            stroke="var(--app-muted)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <polygon points="58,0 62,1 58,2" fill="var(--app-muted)" />
        </svg>

        {/* Node: Load Balancer (highlighted) */}
        <CanvasNode label="Load Balancer" top={40} left={196} highlight />

        {/* Connector down */}
        <svg
          aria-hidden="true"
          className="absolute"
          style={{ top: 110, left: 268, overflow: "visible", width: 2, height: 60 }}
        >
          <line
            x1="1"
            y1="0"
            x2="1"
            y2="60"
            stroke="var(--app-muted)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <polygon points="0,58 1,62 2,58" fill="var(--app-muted)" />
        </svg>

        {/* Node: App Server */}
        <CanvasNode label="App Server" top={172} left={196} />

        {/* Connector right */}
        <svg
          aria-hidden="true"
          className="absolute"
          style={{ top: 194, left: 316, overflow: "visible", width: 60, height: 2 }}
        >
          <line
            x1="0"
            y1="1"
            x2="60"
            y2="1"
            stroke="var(--app-muted)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <polygon points="58,0 62,1 58,2" fill="var(--app-muted)" />
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
            color: "var(--app-green)",
            fontFamily: "'Space Grotesk', monospace",
          }}
        >
          <Layers size={12} />
          Redis Cache
        </div>

      </div>

      {/* Bottom editor strip */}
      <div
        className="px-4 py-3 text-xs"
        style={{ background: "var(--app-surface)", borderTop: "1px solid var(--app-border)", color: "var(--app-body)" }}
      >
        <span style={{ color: "var(--app-indigo)", fontFamily: "'Space Grotesk', monospace" }}>
          Design Notes:{" "}
        </span>
        Diagram is illustrative; answer layouts depend on the question.
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
        background: highlight ? "rgba(128,131,255,0.12)" : "var(--app-surface-2)",
        border: highlight ? "1px solid rgba(128,131,255,0.5)" : "1px solid var(--app-border)",
        color: highlight ? "var(--app-indigo-pale)" : "var(--app-fg)",
        boxShadow: highlight ? "0 0 8px rgba(128,131,255,0.25)" : undefined,
        fontFamily: "'Space Grotesk', monospace",
      }}
    >
      {label}
    </div>
  )
}
