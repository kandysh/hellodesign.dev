import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  done: "secondary",
  failed: "destructive",
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

function scoreColor(score: number) {
  if (score >= 75) return "text-success"
  if (score >= 50) return "text-warning"
  return "text-error"
}

function scoreBg(score: number) {
  if (score >= 75) return "bg-success/10 border-success/30"
  if (score >= 50) return "bg-warning/10 border-warning/30"
  return "bg-error/10 border-error/30"
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>

      {/* ── Top stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Submissions", value: submissions.length },
          { label: "Completed", value: done.length },
          {
            label: "Avg Score",
            value: avgScore !== null ? `${avgScore.toFixed(1)} / 100` : "—",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-base-content/50 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* ── Mastery by category ──────────────────────────────── */}
      {masteryEntries.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold mb-3">Mastery by Category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {masteryEntries.map(([cat, data]) => {
              const avg = data.count > 0 ? data.totalScore / data.count : null
              return (
                <Link
                  key={cat}
                  to="/questions"
                  search={{ category: cat } as never}
                  className="group block"
                >
                  <Card
                    className={`p-4 border transition-colors hover:border-primary/40 ${avg !== null ? scoreBg(avg) : ""}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2 truncate">
                      {categoryLabels[cat] ?? cat}
                    </p>
                    {avg !== null ? (
                      <p className={`text-2xl font-bold ${scoreColor(avg)}`}>
                        {avg.toFixed(0)}
                        <span className="text-sm font-normal text-base-content/40">/100</span>
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-base-content/30">—</p>
                    )}
                    <p className="text-xs text-base-content/40 mt-1">
                      {data.count} done · {data.attempted} attempted
                    </p>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Submission history ───────────────────────────────── */}
      <h2 className="font-semibold mb-3">Recent Submissions</h2>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg border border-base-300 bg-base-200 animate-pulse" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-base-content/60">
          <p>No submissions yet.</p>
          <Button variant="link" asChild className="mt-2">
            <Link to="/questions">Browse questions →</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {submissions.map((s) => (
            <Link
              key={s.id}
              to="/submissions/$submissionId"
              params={{ submissionId: s.id }}
              className="block group"
            >
              <Card className="flex items-center justify-between px-4 py-3 hover:border-primary/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                    {s.questionTitle}
                  </p>
                  <p className="text-xs text-base-content/50">
                    {categoryLabels[s.questionCategory] ?? s.questionCategory} ·{" "}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  {s.overallScore !== null && (
                    <span className={`text-sm font-semibold ${scoreColor(s.overallScore)}`}>
                      {s.overallScore.toFixed(0)}/100
                    </span>
                  )}
                  <Badge variant={statusVariant[s.status] ?? "outline"} className="capitalize">
                    {s.status}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
