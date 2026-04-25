import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export const Route = createFileRoute("/me")({ component: MePage })

interface SubmissionRow {
  id: string
  questionId: string
  status: string
  createdAt: string
  overallScore: number | null
}

function MePage() {
  const { data: submissions = [], isLoading } = useQuery<SubmissionRow[]>({
    queryKey: ["me/submissions"],
    queryFn: () =>
      fetch(`${API}/api/me/submissions`, { credentials: "include" }).then((r) => r.json()),
  })

  const done = submissions.filter((s) => s.status === "done")
  const avgScore =
    done.length > 0
      ? done.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / done.length
      : null

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Submissions", value: submissions.length },
          { label: "Completed", value: done.length },
          { label: "Avg Score", value: avgScore !== null ? avgScore.toFixed(1) + " / 10" : "—" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Submission history */}
      <h2 className="font-semibold mb-3">Recent Submissions</h2>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p>No submissions yet.</p>
          <Link
            to="/questions"
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Browse questions →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {submissions.map((s) => (
            <Link
              key={s.id}
              to="/submissions/$submissionId"
              params={{ submissionId: s.id }}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:border-primary/50 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  Submission #{s.id.slice(0, 8)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {s.overallScore !== null && (
                  <span className="text-sm font-semibold">{s.overallScore.toFixed(1)}/10</span>
                )}
                <span
                  className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                    s.status === "done"
                      ? "bg-green-100 text-green-800"
                      : s.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {s.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
