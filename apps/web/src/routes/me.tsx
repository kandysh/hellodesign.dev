import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, BarChart3, CheckCircle2, Layers } from "lucide-react"
import { useState } from "react"
import { MetricsCard } from "@/components/MetricsCard"
import { apiJson } from "@/lib/api-client"

export const Route = createFileRoute("/me")({ component: MePage })

interface SubmissionRow {
  id: string
  questionId: string
  questionTitle: string
  questionCategory: string
  status: string
  createdAt: string
  overallScore: number | null
}

interface SubmissionPage {
  items: SubmissionRow[]
  nextCursor: string | null
}

interface PracticeStats {
  solved: number
  attempted: number
  avgScore: number | null
  streak: number
  categories: Array<{
    category: string
    attempted: number
    solved: number
    avgScore: number | null
  }>
}

const categoryLabels: Record<string, string> = {
  "distributed-systems": "Distributed Systems",
  databases: "Databases",
  caching: "Caching",
  messaging: "Messaging",
  "api-design": "API Design",
  storage: "Storage",
  networking: "Networking",
  general: "General",
}

/** Pill badge for submission status */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    done: {
      label: "Done",
      color: "var(--app-green)",
      bg: "rgba(78,222,163,0.08)",
      border: "rgba(78,222,163,0.3)",
    },
    failed: {
      label: "Failed",
      color: "var(--app-red)",
      bg: "rgba(255,180,171,0.08)",
      border: "rgba(255,180,171,0.3)",
    },
    processing: {
      label: "Processing",
      color: "var(--app-indigo-pale)",
      bg: "rgba(192,193,255,0.08)",
      border: "rgba(192,193,255,0.3)",
    },
    pending: {
      label: "Pending",
      color: "var(--app-subtle)",
      bg: "rgba(144,143,160,0.08)",
      border: "rgba(144,143,160,0.3)",
    },
  }
  const s = map[status.toLowerCase()] ?? map.pending
  if (!s) return null
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  )
}

function MePage() {
  const queryClient = useQueryClient()
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState("")
  const submissionsQuery = useQuery<SubmissionPage>({
    queryKey: ["me/submissions"],
    queryFn: () => apiJson<SubmissionPage>("/api/me/submissions"),
  })
  const { data: stats } = useQuery<PracticeStats>({
    queryKey: ["me/stats"],
    queryFn: () => apiJson<PracticeStats>("/api/me/stats"),
  })
  const submissions = submissionsQuery.data?.items ?? []
  const isLoading = submissionsQuery.isLoading
  const avgScore = stats?.avgScore ?? null

  const masteryEntries = (stats?.categories ?? [])
    .map(
      (entry) =>
        [
          entry.category,
          {
            count: entry.solved,
            totalScore: (entry.avgScore ?? 0) * entry.solved,
            attempted: entry.attempted,
          },
        ] as const,
    )
    .sort((a, b) => (categoryLabels[a[0]] ?? a[0]).localeCompare(categoryLabels[b[0]] ?? b[0]))

  async function loadMoreSubmissions() {
    const cursor = submissionsQuery.data?.nextCursor
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    setLoadMoreError("")
    try {
      const nextPage = await apiJson<SubmissionPage>(
        `/api/me/submissions?cursor=${encodeURIComponent(cursor)}`,
      )
      queryClient.setQueryData<SubmissionPage>(["me/submissions"], (current) =>
        current
          ? { items: [...current.items, ...nextPage.items], nextCursor: nextPage.nextCursor }
          : nextPage,
      )
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error.message : "Could not load more submissions")
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <main className="page-shell max-w-7xl">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="mb-8">
        <p className="page-eyebrow mb-2">WORKSPACE</p>
        <h1 className="page-title mb-2">Practice history</h1>
        <p className="page-description text-sm">
          Review completed practice and feedback across your submissions.
        </p>
      </div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricsCard
          label="Problems Solved"
          value={String(stats?.solved ?? 0)}
          icon={<CheckCircle2 size={20} />}
          iconColor="var(--app-green)"
          accentColor="tertiary"
          progress={Math.min(
            100,
            Math.round(((stats?.solved ?? 0) / Math.max(stats?.attempted ?? 0, 1)) * 100),
          )}
          description={`${stats?.solved ?? 0} of ${stats?.attempted ?? 0} attempted`}
        />
        <MetricsCard
          label="Avg Score"
          value={avgScore != null ? avgScore.toFixed(1) : "—"}
          unit={avgScore != null ? "/ 100" : ""}
          icon={<BarChart3 size={20} />}
          iconColor="#b9c8de"
          accentColor="secondary"
          progress={avgScore ?? 0}
          description={
            avgScore != null
              ? avgScore >= 75
                ? "Excellent performance"
                : avgScore >= 50
                  ? "Good — keep improving"
                  : "Needs more practice"
              : "Submit your first answer"
          }
        />
        <MetricsCard
          label="Total Attempted"
          value={String(stats?.attempted ?? 0)}
          icon={<Layers size={20} />}
          iconColor="var(--app-indigo-pale)"
          accentColor="primary"
          description={
            (stats?.attempted ?? 0) === 0
              ? "Start practicing today"
              : `Across ${masteryEntries.length} categories`
          }
        />
      </div>

      {/* ── Mastery by category ──────────────────────────────── */}
      {masteryEntries.length > 0 && (
        <section className="mb-10">
          <h2
            className="text-sm font-bold uppercase tracking-widest mb-4"
            style={{ color: "var(--app-muted)" }}
          >
            Mastery by Category
          </h2>
          <div
            style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)" }}
            className="rounded-lg px-6 py-5 flex flex-col gap-4"
          >
            {masteryEntries.map(([cat, entry]) => {
              const pct =
                entry.count > 0 ? Math.round((entry.totalScore / entry.count / 100) * 100) : 0
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span
                    className="text-sm w-28 sm:w-36 shrink-0"
                    style={{ color: "var(--app-subtle)" }}
                  >
                    {categoryLabels[cat] ?? cat}
                  </span>
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--app-border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background:
                          pct >= 75
                            ? "var(--app-green)"
                            : pct >= 50
                              ? "var(--app-indigo-pale)"
                              : "var(--app-red)",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs w-8 text-right font-medium"
                    style={{
                      color: "var(--app-subtle)",
                      fontFamily: "'Geist Mono Variable', monospace",
                    }}
                  >
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Recent submissions ───────────────────────────────── */}
      <section>
        <h2
          className="text-sm font-bold uppercase tracking-widest mb-4"
          style={{ color: "var(--app-muted)" }}
        >
          Recent Submissions
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {["history-1", "history-2", "history-3", "history-4"].map((skeletonId) => (
              <div
                key={skeletonId}
                className="h-16 animate-pulse rounded-lg"
                style={{ background: "var(--app-surface)" }}
              />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div
            className="text-center py-16 rounded-lg"
            style={{ border: "1px dashed var(--app-border)" }}
          >
            <p className="text-sm mb-3" style={{ color: "var(--app-muted)" }}>
              No submissions yet
            </p>
            <Link
              to="/questions"
              className="text-sm text-primary hover:text-primary transition-colors"
            >
              Browse Questions →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => (
              <Link
                key={s.id}
                to="/questions/$questionId/result/$submissionId"
                params={{ questionId: s.questionId, submissionId: s.id }}
                style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}
                className="flex items-center justify-between px-5 py-4 rounded-lg hover:border-indigo-500/40 transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--app-fg)" }}>
                    {s.questionTitle}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--app-subtle)" }}>
                    {categoryLabels[s.questionCategory] ?? s.questionCategory} ·{" "}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {s.overallScore !== null && (
                    <span
                      className="text-sm font-bold font-mono"
                      style={{
                        color:
                          s.overallScore >= 75
                            ? "var(--app-green)"
                            : s.overallScore >= 50
                              ? "var(--app-indigo-pale)"
                              : "var(--app-red)",
                      }}
                    >
                      {s.overallScore.toFixed(0)}/100
                    </span>
                  )}
                  <StatusBadge status={s.status} />
                  <ArrowRight size={14} style={{ color: "var(--app-muted)" }} />
                </div>
              </Link>
            ))}
            {submissionsQuery.data?.nextCursor && (
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => void loadMoreSubmissions()}
                  disabled={loadingMore}
                  className="app-button app-button-ghost app-button-sm"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
                {loadMoreError && <p className="mt-2 text-xs text-error">{loadMoreError}</p>}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
