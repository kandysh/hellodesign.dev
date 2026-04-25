import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import type { Question } from "@sysdesign/types"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { ArrowRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

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

export const Route = createFileRoute("/questions/")({ component: QuestionsPage })

function QuestionsPage() {
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ["questions"],
    queryFn: () => fetch(`${API}/api/questions`).then((r) => r.json()),
  })

  const categories = [...new Set(questions.map((q) => q.category))]

  const filtered = questions.filter((q) => {
    const diffOk = selectedDifficulties.size === 0 || selectedDifficulties.has(q.difficulty)
    const catOk = !selectedCategory || q.category === selectedCategory
    return diffOk && catOk
  })

  function toggleDifficulty(d: string) {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Question Bank</h1>
        <p className="text-base-content/50 text-sm">
          {filtered.length} question{filtered.length !== 1 ? "s" : ""}
          {(selectedDifficulties.size > 0 || selectedCategory) ? " matching filters" : " available"}
        </p>
      </div>

      <div className="flex gap-6">
        {/* ── Sidebar filters ──────────────────────────────────── */}
        <aside className="w-52 shrink-0 space-y-5">
          {/* Difficulty */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/40">
              Difficulty
            </p>
            <div className="flex flex-col gap-1.5">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDifficulty(d)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-default",
                    selectedDifficulties.has(d)
                      ? "bg-base-300/60 text-base-content"
                      : "text-base-content/60 hover:bg-base-300/30 hover:text-base-content",
                  )}
                >
                  <DifficultyBadge difficulty={d} solid={selectedDifficulties.has(d)} />
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/40">
              Category
            </p>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-left text-sm transition-default",
                  !selectedCategory
                    ? "bg-base-300/60 font-medium text-base-content"
                    : "text-base-content/60 hover:bg-base-300/30 hover:text-base-content",
                )}
              >
                All categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-left text-sm transition-default",
                    selectedCategory === cat
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-base-content/60 hover:bg-base-300/30 hover:text-base-content",
                  )}
                >
                  {categoryLabels[cat] ?? cat}
                </button>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {(selectedDifficulties.size > 0 || selectedCategory) && (
            <button
              type="button"
              onClick={() => { setSelectedDifficulties(new Set()); setSelectedCategory(null) }}
              className="text-xs text-base-content/40 hover:text-base-content/70 transition-default underline-offset-2 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </aside>

        {/* ── Question list ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-base-300/50 py-16 text-center">
              <p className="text-base-content/40 mb-2">No questions match your filters</p>
              <button
                type="button"
                onClick={() => { setSelectedDifficulties(new Set()); setSelectedCategory(null) }}
                className="text-sm text-primary hover:underline"
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

function QuestionCard({ question: q }: { question: Question }) {
  return (
    <Link
      to="/questions/$questionId"
      params={{ questionId: q.id }}
      className="group flex items-center gap-0 rounded-xl border border-base-300/40 bg-base-200/50 transition-default hover:border-primary/30 hover:shadow-lg hover:shadow-indigo-950/40 overflow-hidden"
    >
      {/* Left accent border */}
      <div className="w-0.5 self-stretch bg-base-300/40 transition-default group-hover:bg-primary/60" />

      <div className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base-content transition-default group-hover:text-primary truncate">
            {q.title}
          </p>
          <p className="mt-0.5 text-sm text-base-content/50 line-clamp-1">
            {q.description}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-base-content/40">
            <Clock size={11} />
            {estimatedTime[q.difficulty] ?? "~25 min"}
          </div>
          <span className="hidden sm:inline text-xs text-base-content/40">
            {categoryLabels[q.category] ?? q.category}
          </span>
          <DifficultyBadge difficulty={q.difficulty} />
          <ArrowRight
            size={15}
            className="text-base-content/30 transition-default group-hover:translate-x-0.5 group-hover:text-primary"
          />
        </div>
      </div>
    </Link>
  )
}
