import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import type { QuestionSummary } from "@sysdesign/types"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { ArrowRight, Clock, LayoutGrid, SlidersHorizontal } from "lucide-react"
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

  const { data: questions = [], isLoading, isError, refetch } = useQuery(questionsQueryOptions)

  const categories = [...new Set(questions.map((q) => q.category))]
  const filtered = questions.filter((q) => {
    const diffOk = selectedDifficulties.size === 0 || selectedDifficulties.has(q.difficulty)
    const catOk = !selectedCategory || q.category === selectedCategory
    return diffOk && catOk
  })

  function toggleDifficulty(d: string) {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d); else next.add(d)
      return next
    })
  }

  const totalEasy   = questions.filter((q) => q.difficulty === "easy").length
  const totalMedium = questions.filter((q) => q.difficulty === "medium").length
  const totalHard   = questions.filter((q) => q.difficulty === "hard").length

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
          {(selectedDifficulties.size > 0 || selectedCategory) ? " matching filters" : " in the library"}
        </p>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Easy", count: totalEasy, color: "#4edea3" },
          { label: "Medium", count: totalMedium, color: "#fbbf24" },
          { label: "Hard", count: totalHard, color: "#ffb4ab" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg px-4 py-3 flex items-center gap-3"
            style={{ background: "#131b2e", border: "1px solid #2d3449" }}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stat.color }} />
            <div>
              <p className="text-base font-bold" style={{ color: stat.color, fontFamily: "'Space Grotesk', monospace" }}>
                {stat.count}
              </p>
              <p className="text-xs" style={{ color: "#908fa0" }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside className="w-48 shrink-0 space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "#464554" }}>
              <SlidersHorizontal size={11} /> Difficulty
            </p>
            <div className="flex flex-col gap-1">
              {DIFFICULTIES.map((d) => {
                const active = selectedDifficulties.has(d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDifficulty(d)}
                    className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-left transition-colors duration-150"
                    style={{
                      background: active ? "rgba(99,102,241,0.1)" : "transparent",
                      border: active ? "1px solid rgba(192,193,255,0.2)" : "1px solid transparent",
                      color: active ? "#dae2fd" : "#908fa0",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: difficultyColors[d] }} />
                    <span className="capitalize">{d}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "#464554" }}>
              Category
            </p>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="rounded px-3 py-1.5 text-left text-sm transition-colors duration-150"
                style={{
                  background: !selectedCategory ? "rgba(99,102,241,0.1)" : "transparent",
                  border: !selectedCategory ? "1px solid rgba(192,193,255,0.2)" : "1px solid transparent",
                  color: !selectedCategory ? "#dae2fd" : "#908fa0",
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className="rounded px-3 py-1.5 text-left text-sm transition-colors duration-150"
                  style={{
                    background: selectedCategory === cat ? "rgba(99,102,241,0.1)" : "transparent",
                    border: selectedCategory === cat ? "1px solid rgba(192,193,255,0.2)" : "1px solid transparent",
                    color: selectedCategory === cat ? "#dae2fd" : "#908fa0",
                  }}
                >
                  {categoryLabels[cat] ?? cat}
                </button>
              ))}
            </div>
          </div>

          {(selectedDifficulties.size > 0 || selectedCategory) && (
            <button
              type="button"
              onClick={() => { setSelectedDifficulties(new Set()); setSelectedCategory(null) }}
              className="text-xs transition-colors hover:underline underline-offset-2"
              style={{ color: "#464554" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#908fa0" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#464554" }}
            >
              Clear filters
            </button>
          )}
        </aside>

        {/* ── Questions ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
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
                onClick={() => { setSelectedDifficulties(new Set()); setSelectedCategory(null) }}
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
    </div>
  )
}

function QuestionCard({ question: q }: { question: QuestionSummary }) {
  return (
    <Link
      to="/questions/$questionId"
      params={{ questionId: q.id }}
      className={cn(
        "group flex items-stretch rounded-lg overflow-hidden transition-all duration-150",
        "hover:shadow-lg hover:shadow-indigo-950/50",
      )}
      style={{ border: "1px solid #2d3449", background: "#131b2e" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#464554" }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2d3449" }}
    >
      {/* Left accent bar */}
      <div
        className="w-0.5 shrink-0 transition-colors duration-150"
        style={{ background: "#2d3449" }}
        ref={(el) => {
          if (!el) return
          const parent = el.closest("a")
          if (!parent) return
          parent.addEventListener("mouseenter", () => { el.style.background = "#6366f1" })
          parent.addEventListener("mouseleave", () => { el.style.background = "#2d3449" })
        }}
      />

      <div className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
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

