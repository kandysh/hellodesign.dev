import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import type { QuestionSummary } from "@sysdesign/types"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { MetricsCard } from "@/components/MetricsCard"
import { useSession } from "@/lib/auth-client"
import {
  ArrowRight,
  Clock,
  LayoutGrid,
  Trophy,
  Flame,
  CheckCircle2,
  Search,
  X,
  ChevronDown,
} from "lucide-react"
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
type SortOption = "default" | "az" | "za" | "diff-asc" | "diff-desc" | "time-asc" | "time-desc"

const difficultyOrder: Record<string, number> = { easy: 1, medium: 2, hard: 3 }
const difficultyColors: Record<string, string> = {
  easy: "var(--app-green)", medium: "var(--app-amber)", hard: "var(--app-red)",
}

function matchesSearch(q: QuestionSummary, query: string): boolean {
  const lower = query.toLowerCase()
  return (
    q.title.toLowerCase().includes(lower) ||
    (q.description?.toLowerCase().includes(lower) ?? false) ||
    (categoryLabels[q.category] ?? q.category).toLowerCase().includes(lower)
  )
}

export const Route = createFileRoute("/questions/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.prefetchQuery(questionsQueryOptions),
  component: QuestionsPage,
})

function QuestionsPage() {
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set())
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("default")

  const { data: questions = [], isLoading, isError, refetch } = useQuery(questionsQueryOptions)
  const { data: session } = useSession()

  const categories = [...new Set(questions.map((q) => q.category))]

  // Contextual counts: each dimension excludes its own filter so pills reflect real availability
  function diffCount(d: string): number {
    return questions.filter((q) => {
      const catOk = selectedCategories.size === 0 || selectedCategories.has(q.category)
      const searchOk = !searchQuery || matchesSearch(q, searchQuery)
      return catOk && searchOk && q.difficulty === d
    }).length
  }

  function catCount(cat: string): number {
    return questions.filter((q) => {
      const diffOk = selectedDifficulties.size === 0 || selectedDifficulties.has(q.difficulty)
      const searchOk = !searchQuery || matchesSearch(q, searchQuery)
      return diffOk && searchOk && q.category === cat
    }).length
  }

  const filtered = questions.filter((q) => {
    const diffOk = selectedDifficulties.size === 0 || selectedDifficulties.has(q.difficulty)
    const catOk = selectedCategories.size === 0 || selectedCategories.has(q.category)
    const searchOk = !searchQuery || matchesSearch(q, searchQuery)
    return diffOk && catOk && searchOk
  })

  const sorted: QuestionSummary[] =
    sortBy === "default"
      ? filtered
      : [...filtered].sort((a, b) => {
          switch (sortBy) {
            case "az":        return a.title.localeCompare(b.title)
            case "za":        return b.title.localeCompare(a.title)
            case "diff-asc":  return (difficultyOrder[a.difficulty] ?? 2) - (difficultyOrder[b.difficulty] ?? 2)
            case "diff-desc": return (difficultyOrder[b.difficulty] ?? 2) - (difficultyOrder[a.difficulty] ?? 2)
            case "time-asc":  return (a.estimatedMins ?? 25) - (b.estimatedMins ?? 25)
            case "time-desc": return (b.estimatedMins ?? 25) - (a.estimatedMins ?? 25)
            default:          return 0
          }
        })

  const hasFilters = selectedDifficulties.size > 0 || selectedCategories.size > 0 || searchQuery !== ""
  // Hide featured when user is filtering or sorting — avoid competing list logic on the page
  const showFeatured = !hasFilters && sortBy === "default"

  // Stable daily featured: seed with today's date
  const todaySeed = new Date().toISOString().slice(0, 10)
  const featured = [...questions]
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

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  function clearAll() {
    setSelectedDifficulties(new Set())
    setSelectedCategories(new Set())
    setSearchQuery("")
    setSortBy("default")
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8" style={{ color: "var(--app-fg)" }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <LayoutGrid size={16} style={{ color: "var(--app-indigo)" }} />
          <span
            className="text-xs uppercase tracking-widest font-bold"
            style={{ color: "var(--app-indigo)", fontFamily: "'Space Grotesk', monospace" }}
          >
            Problem Library
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ letterSpacing: "-0.02em" }}>
          Architecture Challenges
        </h1>
        {/* Library-wide stats — shown once data loads */}
        {!isLoading && questions.length > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs" style={{ color: "var(--app-muted)" }}>{questions.length} problems</span>
            <span style={{ color: "var(--app-border)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--app-muted)" }}>{categories.length} categories</span>
          </div>
        )}
      </div>

      {/* ── Dashboard Metrics (logged in only) ─────────────────── */}
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

      {/* ── Unified Filter Bar ─────────────────────────────────── */}
      <div
        className="mb-6 rounded-xl overflow-hidden"
        style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}
      >
        {/* Row 1: Search + Sort */}
        <div className="flex gap-3 items-center p-4">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--app-subtle)" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, topic, or category…"
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: "var(--app-bg)",
                border: "1px solid var(--app-border)",
                color: "var(--app-fg)",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--app-indigo)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--app-border)" }}
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg text-sm cursor-pointer transition-all"
              style={{
                background: sortBy !== "default" ? "var(--app-indigo-15)" : "var(--app-bg)",
                border: `1px solid ${sortBy !== "default" ? "var(--app-indigo)" : "var(--app-border)"}`,
                color: sortBy !== "default" ? "var(--app-fg)" : "var(--app-subtle)",
                outline: "none",
              }}
            >
              <option value="default">Sort: Default</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="diff-asc">Easiest first</option>
              <option value="diff-desc">Hardest first</option>
              <option value="time-asc">Shortest first</option>
              <option value="time-desc">Longest first</option>
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--app-muted)" }}
            />
          </div>
        </div>

        {/* Row 2: Difficulty + Category pills — always visible */}
        <div
          className="px-4 pb-4 flex items-start gap-2 flex-wrap"
          style={{ borderTop: "1px solid var(--app-border)" }}
        >
          <span
            className="text-xs font-bold uppercase tracking-widest mt-4 mr-1 shrink-0"
            style={{ color: "var(--app-muted)" }}
          >
            Filter:
          </span>

          <div className="mt-3.5 flex items-center gap-1.5 flex-wrap">
            {/* Difficulty pills */}
            {DIFFICULTIES.map((d) => {
              const active = selectedDifficulties.has(d)
              const count = diffCount(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDifficulty(d)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
                  style={{
                    background: active ? `${difficultyColors[d]}22` : "var(--app-bg)",
                    border: `1px solid ${active ? difficultyColors[d] : "var(--app-border)"}`,
                    color: active ? difficultyColors[d] : "var(--app-subtle)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: difficultyColors[d] }} />
                  {d}
                  {count > 0 && <span style={{ opacity: 0.65 }}>({count})</span>}
                </button>
              )
            })}

            {/* Divider */}
            <div className="h-4 w-px mx-1 self-center" style={{ background: "var(--app-border)" }} />

            {/* Category pills */}
            {categories.map((cat) => {
              const active = selectedCategories.has(cat)
              const count = catCount(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: active ? "var(--app-indigo-15)" : "var(--app-bg)",
                    border: `1px solid ${active ? "var(--app-indigo)" : "var(--app-border)"}`,
                    color: active ? "var(--app-fg)" : "var(--app-subtle)",
                  }}
                >
                  {categoryLabels[cat] ?? cat}
                  {count > 0 && <span style={{ opacity: 0.65 }}>({count})</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 3: Active filter tags — shown only when filters applied */}
        {hasFilters && (
          <div
            className="px-4 py-2.5 flex items-center gap-2 flex-wrap"
            style={{ borderTop: "1px solid var(--app-border)" }}
          >
            <span className="text-xs shrink-0" style={{ color: "var(--app-muted)" }}>Active:</span>

            {searchQuery && (
              <FilterTag label={`"${searchQuery}"`} onRemove={() => setSearchQuery("")} />
            )}
            {[...selectedDifficulties].map((d) => (
              <FilterTag
                key={d}
                label={d}
                color={difficultyColors[d]}
                onRemove={() => toggleDifficulty(d)}
              />
            ))}
            {[...selectedCategories].map((cat) => (
              <FilterTag
                key={cat}
                label={categoryLabels[cat] ?? cat}
                onRemove={() => toggleCategory(cat)}
              />
            ))}

            <span className="ml-auto text-xs shrink-0" style={{ color: "var(--app-subtle)" }}>
              {sorted.length} result{sorted.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs transition-colors shrink-0"
              style={{ color: "var(--app-subtle)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--app-red)" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-subtle)" }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Featured ────────────────────────────────────────────── */}
      {showFeatured && featured.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--app-indigo)" }}>
              Featured
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {featured.map((q) => {
              const dot = difficultyColors[q.difficulty] ?? "var(--app-indigo)"
              return (
                <Link
                  key={q.id}
                  to="/questions/$questionId"
                  params={{ questionId: q.id }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 shrink-0 transition-all duration-150"
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
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--app-fg)", maxWidth: 180 }}>
                      {q.title}
                    </p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--app-muted)" }}>
                      {categoryLabels[q.category] ?? q.category} · {q.estimatedMins ? `${q.estimatedMins}m` : "25m"}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Question list ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader
              <div
                key={i}
                className="h-[74px] w-full rounded-lg animate-pulse"
                style={{ background: "var(--app-surface)" }}
              />
            ))}
          </>
        ) : isError ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
            style={{ border: "1px dashed var(--app-red-15)" }}
          >
            <p className="mb-3 text-sm" style={{ color: "var(--app-red)" }}>
              Could not load questions — is the API running?
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded text-xs font-semibold transition-all"
              style={{ background: "var(--app-red-10)", border: "1px solid var(--app-red-15)", color: "var(--app-red)" }}
            >
              Retry
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl py-16 text-center gap-2"
            style={{ border: "1px dashed var(--app-border)" }}
          >
            <Search size={28} style={{ color: "var(--app-muted)" }} />
            <p className="text-sm font-semibold mt-1" style={{ color: "var(--app-subtle)" }}>
              No results match your filters
            </p>
            <p className="text-xs" style={{ color: "var(--app-muted)" }}>
              Try adjusting difficulty, category, or search terms
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-2 text-sm transition-colors"
              style={{ color: "var(--app-indigo)" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75" }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            {sorted.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function FilterTag({
  label,
  color,
  onRemove,
}: {
  label: string
  color?: string
  onRemove: () => void
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-75"
      style={{
        background: color ? `${color}22` : "var(--app-surface-3)",
        border: `1px solid ${color ?? "var(--app-border)"}`,
        color: color ?? "var(--app-fg)",
      }}
    >
      {label}
      <X size={10} />
    </button>
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
          <p className="mt-0.5 text-xs line-clamp-2" style={{ color: "var(--app-subtle)" }}>
            {q.description}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-xs" style={{ color: "var(--app-muted)" }}>
            <Clock size={11} />
            {q.estimatedMins ? `${q.estimatedMins}m` : "25m"}
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
