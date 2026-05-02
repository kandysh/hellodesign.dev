import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import type { QuestionSummary } from "@sysdesign/types"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { MetricsCard } from "@/components/MetricsCard"
import { useSession } from "@/lib/auth-client"
import { ArrowRight, Clock, LayoutGrid, SlidersHorizontal, Trophy, Flame, CheckCircle2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { questionsQueryOptions } from "@/lib/queries/questions"

const categoryLabels: Record<string, string> = {
  "distributed-systems": "Distributed Systems",
  databases:             "Databases",
  caching:               "Caching",
  messaging:             "Messaging",
  "api-design":          "API Design",
  storage:               "Storage",
  networking:            "Networking",
  general:               "General",
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const
const estimatedTime: Record<string, string> = {
  easy: "~15 min", medium: "~25 min", hard: "~40 min",
}

const difficultyColors: Record<string, string> = {
  easy: "var(--app-green)", medium: "var(--app-amber)", hard: "var(--app-red)",
}

export const Route = createFileRoute("/questions/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.prefetchQuery(questionsQueryOptions),
  component: QuestionsPage,
})

function QuestionsPage() {
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDiffFilter, setShowDiffFilter] = useState(false)
  const [showTopicFilter, setShowTopicFilter] = useState(false)

  const { data: questions = [], isLoading, isError, refetch } = useQuery(questionsQueryOptions)
  const { data: session } = useSession()

  const categories = [...new Set(questions.map((q) => q.category))]
  const filtered = questions.filter((q) => {
    const diffOk = selectedDifficulties.size === 0 || selectedDifficulties.has(q.difficulty)
    const catOk = !selectedCategory || q.category === selectedCategory
    const searchOk = !searchQuery || q.title.toLowerCase().includes(searchQuery.toLowerCase()) || q.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return diffOk && catOk && searchOk
  })

  // Stable daily popular: seed with today's date string so same order all day
  const todaySeed = new Date().toISOString().slice(0, 10)
  const popular = [...questions]
    .sort((a, b) => {
      const ha = Math.abs(Array.from(a.id + todaySeed).reduce((s, c) => s * 31 + c.charCodeAt(0), 0) % 997)
      const hb = Math.abs(Array.from(b.id + todaySeed).reduce((s, c) => s * 31 + c.charCodeAt(0), 0) % 997)
      return ha - hb
    })
    .slice(0, 4)

  function toggleDifficulty(d: string) {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d); else next.add(d)
      return next
    })
  }

  function clearAll() {
    setSelectedDifficulties(new Set())
    setSelectedCategory(null)
    setSearchQuery("")
    setShowDiffFilter(false)
    setShowTopicFilter(false)
  }

  const hasFilters = selectedDifficulties.size > 0 || selectedCategory !== null || searchQuery !== ""

  return (
    <div className="mx-auto max-w-7xl px-4 py-8" style={{ color: "var(--app-fg)" }}>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <LayoutGrid size={16} style={{ color: "var(--app-indigo)" }} />
          <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "var(--app-indigo)", fontFamily: "'Space Grotesk', monospace" }}>
            Problem Library
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ letterSpacing: "-0.02em" }}>
          Architecture Challenges
        </h1>
        <p className="text-sm" style={{ color: "var(--app-subtle)" }}>
          {filtered.length} challenge{filtered.length !== 1 ? "s" : ""}
          {hasFilters ? " matching filters" : " in the library"}
        </p>
      </div>

      {/* ── Dashboard Metrics (if logged in) ───────────────────── */}
      {session?.user && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--app-indigo)" }}>
              Your Progress
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <MetricsCard
              label="Problems Solved"
              value="15"
              unit="/ 50"
              icon={<CheckCircle2 size={20} />}
              iconColor="var(--app-green)"
              accentColor="tertiary"
              progress={30}
              description="28% of the library"
            />
            <MetricsCard
              label="Current Streak"
              value="12"
              unit="days"
              icon={<Flame size={20} />}
              iconColor="#b9c8de"
              accentColor="secondary"
              description="Keep it up! 3 days to next milestone"
            />
            <MetricsCard
              label="Global Rank"
              value="45,892"
              icon={<Trophy size={20} />}
              iconColor="var(--app-indigo-pale)"
              accentColor="primary"
              description="Top 3% of all users"
            />
          </div>
        </div>
      )}

      {/* ── Search + Filter Bar ────────────────────────────────────── */}
      <div className="mb-6 rounded-lg" style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}>
        {/* Row 1: search + filter buttons */}
        <div className="flex flex-col md:flex-row gap-3 items-center p-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--app-subtle)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges by name or topic..."
              className="w-full pl-9 pr-4 py-2 rounded text-sm"
              style={{ background: "var(--app-bg)", border: "1px solid var(--app-border)", color: "var(--app-fg)", outline: "none" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--app-indigo)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--app-border)" }}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => { setShowDiffFilter(!showDiffFilter); setShowTopicFilter(false) }}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm whitespace-nowrap transition-all"
              style={{
                background: showDiffFilter || selectedDifficulties.size > 0 ? "var(--app-indigo-15)" : "var(--app-bg)",
                border: showDiffFilter || selectedDifficulties.size > 0 ? "1px solid var(--app-indigo)" : "1px solid var(--app-border)",
                color: showDiffFilter || selectedDifficulties.size > 0 ? "var(--app-fg)" : "var(--app-subtle)",
              }}
            >
              <SlidersHorizontal size={13} />
              Difficulty
              {selectedDifficulties.size > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "var(--app-indigo)", color: "var(--app-bg)" }}>
                  {selectedDifficulties.size}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowTopicFilter(!showTopicFilter); setShowDiffFilter(false) }}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm whitespace-nowrap transition-all"
              style={{
                background: showTopicFilter || selectedCategory ? "var(--app-indigo-15)" : "var(--app-bg)",
                border: showTopicFilter || selectedCategory ? "1px solid var(--app-indigo)" : "1px solid var(--app-border)",
                color: showTopicFilter || selectedCategory ? "var(--app-fg)" : "var(--app-subtle)",
              }}
            >
              <LayoutGrid size={13} />
              Topics
              {selectedCategory && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "var(--app-indigo)", color: "var(--app-bg)" }}>1</span>
              )}
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-2 rounded text-sm whitespace-nowrap transition-all"
                style={{ background: "transparent", border: "1px solid transparent", color: "var(--app-subtle)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--app-red)" }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-subtle)" }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Difficulty chips (expand) */}
        {showDiffFilter && (
          <div className="px-4 pb-4 flex items-center gap-2 flex-wrap" style={{ borderTop: "1px solid var(--app-border)" }}>
            <span className="text-xs uppercase tracking-widest font-bold pt-4 pr-1" style={{ color: "var(--app-muted)" }}>Difficulty:</span>
            {DIFFICULTIES.map((d) => {
              const active = selectedDifficulties.has(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDifficulty(d)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize mt-4 transition-all"
                  style={{
                    background: active ? `${difficultyColors[d]}22` : "var(--app-bg)",
                    border: `1px solid ${active ? difficultyColors[d] : "var(--app-border)"}`,
                    color: active ? difficultyColors[d] : "var(--app-subtle)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: difficultyColors[d] }} />
                  {d}
                </button>
              )
            })}
          </div>
        )}

        {/* Row 3: Topic chips (expand) */}
        {showTopicFilter && (
          <div className="px-4 pb-4 flex items-center gap-2 flex-wrap" style={{ borderTop: "1px solid var(--app-border)" }}>
            <span className="text-xs uppercase tracking-widest font-bold pt-4 pr-1" style={{ color: "var(--app-muted)" }}>Topics:</span>
            {categories.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(active ? null : cat)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold mt-4 transition-all"
                  style={{
                    background: active ? "var(--app-indigo-15)" : "var(--app-bg)",
                    border: `1px solid ${active ? "var(--app-indigo)" : "var(--app-border)"}`,
                    color: active ? "var(--app-fg)" : "var(--app-subtle)",
                  }}
                >
                  {categoryLabels[cat] ?? cat}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Popular This Week ──────────────────────────────────────── */}
      {popular.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--app-indigo)" }}>
              Popular This Week
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {popular.map((q) => {
              const dot = difficultyColors[q.difficulty] ?? "var(--app-indigo)"
              return (
                <Link
                  key={q.id}
                  to="/questions/$questionId"
                  params={{ questionId: q.id }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 shrink-0 transition-all duration-150 group"
                  style={{
                    background: "var(--app-surface)",
                    border: "1px solid var(--app-border)",
                    maxWidth: 240,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = dot
                    ;(e.currentTarget as HTMLElement).style.background = "var(--app-surface-2)"
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--app-border)"
                    ;(e.currentTarget as HTMLElement).style.background = "var(--app-surface)"
                  }}
                >
                  {/* Difficulty dot */}
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: dot }}
                  />
                  <div className="min-w-0">
                    <p
                      className="text-xs font-semibold truncate"
                      style={{ color: "var(--app-fg)", maxWidth: 180 }}
                    >
                      {q.title}
                    </p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--app-muted)" }}>
                      {categoryLabels[q.category] ?? q.category} · {q.estimatedMins}m
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Questions ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => {
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader
              return (
                <div
                  key={i}
                  className="h-[68px] w-full rounded-lg animate-pulse"
                  style={{ background: "var(--app-surface)" }}
                />
              )
            })}
          </>
        ) : isError ? (
          <div
            className="flex flex-col items-center justify-center rounded-lg py-16 text-center"
            style={{ border: "1px dashed rgba(255,180,171,0.3)" }}
          >
            <p className="mb-3 text-sm" style={{ color: "var(--app-red)" }}>
              Could not load questions — is the API running?
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded text-xs font-semibold transition-all"
              style={{ background: "rgba(255,180,171,0.1)", border: "1px solid rgba(255,180,171,0.3)", color: "var(--app-red)" }}
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-lg py-16 text-center"
            style={{ border: "1px dashed var(--app-border)" }}
          >
            <p className="text-sm mb-2" style={{ color: "var(--app-muted)" }}>No questions match your filters</p>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {filtered.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ question: q }: { question: QuestionSummary }) {
  const [hovered, setHovered] = useState(false)
  const accentColor = difficultyColors[q.difficulty] ?? "var(--app-muted)"

  return (
    <Link
      to="/questions/$questionId"
      params={{ questionId: q.id }}
      className={cn(
        "group flex items-stretch rounded-lg overflow-hidden transition-all duration-200",
        "hover:shadow-lg",
      )}
      style={{
        border: `1px solid ${hovered ? accentColor : "var(--app-border)"}`,
        background: "var(--app-card-gradient), var(--app-card-bg)",
        opacity: hovered ? 1 : 0.95,
        transition: "border-color 0.15s, box-shadow 0.2s, opacity 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent bar — difficulty colour on hover */}
      <div
        className="w-1 shrink-0 relative z-10"
        style={{
          background: hovered ? accentColor : "var(--app-border)",
          transition: "background 0.2s",
        }}
      />

      <div className="flex flex-1 items-center justify-between gap-4 px-5 py-4 relative z-10">
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold truncate text-sm"
            style={{
              color: hovered ? "var(--app-fg)" : "var(--app-body)",
              transition: "color 0.15s",
            }}
          >
            {q.title}
          </p>
          <p className="mt-0.5 text-xs line-clamp-1" style={{ color: "var(--app-subtle)" }}>
            {q.description}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-xs" style={{ color: "var(--app-muted)" }}>
            <Clock size={11} />
            {estimatedTime[q.difficulty] ?? "~25 min"}
          </div>
          <span
            className="hidden sm:inline text-xs px-2 py-0.5 rounded-full"
            style={{
              color: "var(--app-muted)",
              fontFamily: "'Space Grotesk', monospace",
              background: "var(--app-surface)",
              border: "1px solid var(--app-border)",
            }}
          >
            {categoryLabels[q.category] ?? q.category}
          </span>
          <DifficultyBadge difficulty={q.difficulty as "easy" | "medium" | "hard"} />
          <ArrowRight
            size={15}
            className="transition-transform duration-200"
            style={{
              color: hovered ? accentColor : "var(--app-muted)",
              transform: hovered ? "translateX(2px)" : "translateX(0)",
              transition: "color 0.15s, transform 0.2s",
            }}
          />
        </div>
      </div>
    </Link>
  )
}

