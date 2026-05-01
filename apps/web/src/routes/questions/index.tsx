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
  easy: "#4edea3", medium: "#fbbf24", hard: "#ffb4ab",
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

  const popular = [...questions].sort(() => Math.random() - 0.5).slice(0, 4)

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
    <div className="mx-auto max-w-7xl px-4 py-8" style={{ color: "#dae2fd" }}>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <LayoutGrid size={16} style={{ color: "#8083ff" }} />
          <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#8083ff", fontFamily: "'Space Grotesk', monospace" }}>
            Problem Library
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ letterSpacing: "-0.02em" }}>
          Architecture Challenges
        </h1>
        <p className="text-sm" style={{ color: "#908fa0" }}>
          {filtered.length} challenge{filtered.length !== 1 ? "s" : ""}
          {hasFilters ? " matching filters" : " in the library"}
        </p>
      </div>

      {/* ── Dashboard Metrics (if logged in) ───────────────────── */}
      {session?.user && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: "#8083ff" }}>
              Your Progress
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricsCard
              label="Problems Solved"
              value="15"
              unit="/ 50"
              icon={<CheckCircle2 size={20} />}
              iconColor="#4edea3"
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
              iconColor="#c0c1ff"
              accentColor="primary"
              description="Top 3% of all users"
            />
          </div>
        </div>
      )}

      {/* ── Search + Filter Bar ────────────────────────────────────── */}
      <div className="mb-6 rounded-lg" style={{ background: "#131b2e", border: "1px solid #2d3449" }}>
        {/* Row 1: search + filter buttons */}
        <div className="flex flex-col md:flex-row gap-3 items-center p-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#908fa0" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges by name or topic..."
              className="w-full pl-9 pr-4 py-2 rounded text-sm"
              style={{ background: "#0b1326", border: "1px solid #2d3449", color: "#dae2fd", outline: "none" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#8083ff" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449" }}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => { setShowDiffFilter(!showDiffFilter); setShowTopicFilter(false) }}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm whitespace-nowrap transition-all"
              style={{
                background: showDiffFilter || selectedDifficulties.size > 0 ? "rgba(128,131,255,0.15)" : "#0b1326",
                border: showDiffFilter || selectedDifficulties.size > 0 ? "1px solid #8083ff" : "1px solid #2d3449",
                color: showDiffFilter || selectedDifficulties.size > 0 ? "#dae2fd" : "#908fa0",
              }}
            >
              <SlidersHorizontal size={13} />
              Difficulty
              {selectedDifficulties.size > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#8083ff", color: "#0b1326" }}>
                  {selectedDifficulties.size}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowTopicFilter(!showTopicFilter); setShowDiffFilter(false) }}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm whitespace-nowrap transition-all"
              style={{
                background: showTopicFilter || selectedCategory ? "rgba(128,131,255,0.15)" : "#0b1326",
                border: showTopicFilter || selectedCategory ? "1px solid #8083ff" : "1px solid #2d3449",
                color: showTopicFilter || selectedCategory ? "#dae2fd" : "#908fa0",
              }}
            >
              <LayoutGrid size={13} />
              Topics
              {selectedCategory && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#8083ff", color: "#0b1326" }}>1</span>
              )}
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-2 rounded text-sm whitespace-nowrap transition-all"
                style={{ background: "transparent", border: "1px solid transparent", color: "#908fa0" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ffb4ab" }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#908fa0" }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Difficulty chips (expand) */}
        {showDiffFilter && (
          <div className="px-4 pb-4 flex items-center gap-2 flex-wrap" style={{ borderTop: "1px solid #2d3449" }}>
            <span className="text-xs uppercase tracking-widest font-bold pt-4 pr-1" style={{ color: "#464554" }}>Difficulty:</span>
            {DIFFICULTIES.map((d) => {
              const active = selectedDifficulties.has(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDifficulty(d)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize mt-4 transition-all"
                  style={{
                    background: active ? `${difficultyColors[d]}22` : "#0b1326",
                    border: `1px solid ${active ? difficultyColors[d] : "#2d3449"}`,
                    color: active ? difficultyColors[d] : "#908fa0",
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
          <div className="px-4 pb-4 flex items-center gap-2 flex-wrap" style={{ borderTop: "1px solid #2d3449" }}>
            <span className="text-xs uppercase tracking-widest font-bold pt-4 pr-1" style={{ color: "#464554" }}>Topics:</span>
            {categories.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(active ? null : cat)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold mt-4 transition-all"
                  style={{
                    background: active ? "rgba(128,131,255,0.15)" : "#0b1326",
                    border: `1px solid ${active ? "#8083ff" : "#2d3449"}`,
                    color: active ? "#dae2fd" : "#908fa0",
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
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: "#8083ff" }}>
              Popular This Week
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popular.map((q) => (
              <Link
                key={q.id}
                to="/questions/$questionId"
                params={{ questionId: q.id }}
                className="rounded-lg p-4 group transition-all duration-200 hover:shadow-lg hover:shadow-indigo-950/40 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(128,131,255,0.1) 0%, rgba(78,222,163,0.05) 100%), rgba(23, 31, 51, 0.6)",
                  border: "1px solid #2d3449",
                }}
              >
                <div
                  className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl group-hover:opacity-100 opacity-50 transition-all duration-500 pointer-events-none"
                  style={{
                    background: "rgba(128,131,255,0.15)",
                  }}
                />
                <div className="relative z-10">
                  <DifficultyBadge difficulty={q.difficulty} />
                  <p className="text-sm font-semibold mt-2 line-clamp-2 group-hover:text-indigo-300 transition-colors" style={{ color: "#dae2fd" }}>
                    {q.title}
                  </p>
                  <div className="flex items-center gap-1 text-xs mt-3" style={{ color: "#908fa0" }}>
                    <Clock size={12} />
                    {q.estimatedMins}m
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Questions ────────────────────────────────────────── */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => {
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader
              return (
                <div
                  key={i}
                  className="h-[72px] w-full rounded-lg animate-pulse"
                  style={{ background: "#131b2e" }}
                />
              )
            })}
          </div>
        ) : isError ? (
          <div
            className="flex flex-col items-center justify-center rounded-lg py-16 text-center"
            style={{ border: "1px dashed rgba(255,180,171,0.3)" }}
          >
            <p className="mb-3 text-sm" style={{ color: "#ffb4ab" }}>
              Could not load questions — is the API running?
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded text-xs font-semibold transition-all"
              style={{ background: "rgba(255,180,171,0.1)", border: "1px solid rgba(255,180,171,0.3)", color: "#ffb4ab" }}
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-lg py-16 text-center"
            style={{ border: "1px dashed #2d3449" }}
          >
            <p className="text-sm mb-2" style={{ color: "#464554" }}>No questions match your filters</p>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ question: q }: { question: QuestionSummary }) {
  return (
    <Link
      to="/questions/$questionId"
      params={{ questionId: q.id }}
      className={cn(
        "group flex items-stretch rounded-lg overflow-hidden transition-all duration-150 relative",
        "hover:shadow-lg hover:shadow-indigo-950/50",
      )}
      style={{ 
        border: "1px solid #2d3449", 
        background: "linear-gradient(135deg, rgba(128,131,255,0.1) 0%, rgba(78,222,163,0.05) 100%), rgba(23, 31, 51, 0.4)"
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#464554" }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2d3449" }}
    >
      {/* Gradient blur circle */}
      <div
        className="absolute -right-12 -top-12 w-40 h-40 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-all duration-500 pointer-events-none"
        style={{
          background: "rgba(128,131,255,0.1)",
        }}
      />

      {/* Left accent bar */}
      <div
        className="w-0.5 shrink-0 transition-colors duration-150 relative z-10"
        style={{ background: "#2d3449" }}
        ref={(el) => {
          if (!el) return
          const parent = el.closest("a")
          if (!parent) return
          parent.addEventListener("mouseenter", () => { el.style.background = "#6366f1" })
          parent.addEventListener("mouseleave", () => { el.style.background = "#2d3449" })
        }}
      />

      <div className="flex flex-1 items-center justify-between gap-4 px-5 py-4 relative z-10">
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold truncate transition-colors duration-150 group-hover:text-indigo-300"
            style={{ color: "#dae2fd" }}
          >
            {q.title}
          </p>
          <p className="mt-0.5 text-sm line-clamp-1" style={{ color: "#908fa0" }}>
            {q.description}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-xs" style={{ color: "#464554" }}>
            <Clock size={11} />
            {estimatedTime[q.difficulty] ?? "~25 min"}
          </div>
          <span className="hidden sm:inline text-xs" style={{ color: "#464554", fontFamily: "'Space Grotesk', monospace" }}>
            {categoryLabels[q.category] ?? q.category}
          </span>
          <DifficultyBadge difficulty={q.difficulty as "easy" | "medium" | "hard"} />
          <ArrowRight
            size={15}
            className="transition-transform duration-150 group-hover:translate-x-0.5"
            style={{ color: "#464554" }}
          />
        </div>
      </div>
    </Link>
  )
}

