import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, CheckCircle2, BarChart3, Layers } from "lucide-react"
import { MetricsCard } from "@/components/MetricsCard"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

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
      color: "#4edea3",
      bg: "rgba(78,222,163,0.08)",
      border: "rgba(78,222,163,0.3)",
    },
    failed: {
      label: "Failed",
      color: "#ffb4ab",
      bg: "rgba(255,180,171,0.08)",
      border: "rgba(255,180,171,0.3)",
    },
    processing: {
      label: "Processing",
      color: "#c0c1ff",
      bg: "rgba(192,193,255,0.08)",
      border: "rgba(192,193,255,0.3)",
    },
    pending: {
      label: "Pending",
      color: "#908fa0",
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
  const { data: submissions = [], isLoading } = useQuery<SubmissionRow[]>({
    queryKey: ["me/submissions"],
    queryFn: () =>
      fetch(`${API}/api/me/submissions`, { credentials: "include" }).then((r) => r.json()),
  })

  const done = submissions.filter((s) => s.status === "done" && s.overallScore !== null)
  const avgScore =
    done.length > 0
      ? done.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / done.length
      : null

  // Group completed submissions by category for mastery view
  const masteryByCategory = done.reduce<
    Record<string, { count: number; totalScore: number; attempted: number }>
  >((acc, s) => {
    const cat = s.questionCategory
    if (!acc[cat]) acc[cat] = { count: 0, totalScore: 0, attempted: 0 }
    acc[cat].count += 1
    acc[cat].totalScore += s.overallScore ?? 0
    return acc
  }, {})

  // Count total attempted (any status) per category
  for (const s of submissions) {
    const cat = s.questionCategory
    if (!masteryByCategory[cat]) masteryByCategory[cat] = { count: 0, totalScore: 0, attempted: 0 }
    masteryByCategory[cat].attempted += 1
  }

  const masteryEntries = Object.entries(masteryByCategory).sort((a, b) =>
    (categoryLabels[a[0]] ?? a[0]).localeCompare(categoryLabels[b[0]] ?? b[0]),
  )

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8083ff" }}>
          WORKSPACE
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: "#dae2fd", letterSpacing: "-0.02em" }}>
          System Design Dashboard
        </h1>
        <p className="text-sm" style={{ color: "#908fa0" }}>
          Track your performance and mastery.
        </p>
      </div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <MetricsCard
          label="Problems Solved"
          value={String(submissions.filter((s) => s.status === "done").length)}
          icon={<CheckCircle2 size={20} />}
          iconColor="#4edea3"
          accentColor="tertiary"
          progress={Math.min(100, Math.round(submissions.filter((s) => s.status === "done").length / Math.max(submissions.length, 1) * 100))}
          description={`${submissions.filter((s) => s.status === "done").length} of ${submissions.length} attempted`}
        />
        <MetricsCard
          label="Avg Score"
          value={avgScore != null ? avgScore.toFixed(1) : "—"}
          unit={avgScore != null ? "/ 100" : ""}
          icon={<BarChart3 size={20} />}
          iconColor="#b9c8de"
          accentColor="secondary"
          progress={avgScore ?? 0}
          description={avgScore != null ? (avgScore >= 75 ? "Excellent performance" : avgScore >= 50 ? "Good — keep improving" : "Needs more practice") : "Submit your first answer"}
        />
        <MetricsCard
          label="Total Attempted"
          value={String(submissions.length)}
          icon={<Layers size={20} />}
          iconColor="#c0c1ff"
          accentColor="primary"
          description={submissions.length === 0 ? "Start practicing today" : `Across ${Object.keys(masteryByCategory).length} categories`}
        />
      </div>

      {/* ── Mastery by category ──────────────────────────────── */}
      {masteryEntries.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#464554" }}>
            Mastery by Category
          </h2>
          <div
            style={{ background: "#171f33", border: "1px solid #2d3449" }}
            className="rounded-lg px-6 py-5 flex flex-col gap-4"
          >
            {masteryEntries.map(([cat, entry]) => {
              const pct = entry.count > 0
                ? Math.round((entry.totalScore / entry.count) / 100 * 100)
                : 0
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm w-36 shrink-0" style={{ color: "#908fa0" }}>
                    {categoryLabels[cat] ?? cat}
                  </span>
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "#2d3449" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 75 ? "#4edea3" : pct >= 50 ? "#c0c1ff" : "#ffb4ab",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs w-8 text-right font-medium"
                    style={{ color: "#908fa0", fontFamily: "'Space Grotesk', monospace" }}
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
        <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#464554" }}>
          Recent Submissions
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => {
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader
              return (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg"
                  style={{ background: "#131b2e" }}
                />
              )
            })}
          </div>
        ) : submissions.length === 0 ? (
          <div
            className="text-center py-16 rounded-lg"
            style={{ border: "1px dashed #2d3449" }}
          >
            <p className="text-sm mb-3" style={{ color: "#464554" }}>
              No submissions yet
            </p>
            <Link
              to="/questions"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
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
                style={{ background: "#131b2e", border: "1px solid #2d3449" }}
                className="flex items-center justify-between px-5 py-4 rounded-lg hover:border-indigo-500/40 transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm" style={{ color: "#dae2fd" }}>
                    {s.questionTitle}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#908fa0" }}>
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
                            ? "#4edea3"
                            : s.overallScore >= 50
                              ? "#c0c1ff"
                              : "#ffb4ab",
                      }}
                    >
                      {s.overallScore.toFixed(0)}/100
                    </span>
                  )}
                  <StatusBadge status={s.status} />
                  <ArrowRight size={14} style={{ color: "#464554" }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
