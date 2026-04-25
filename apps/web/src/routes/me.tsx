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
  status: string
  createdAt: string
  overallScore: number | null
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  done: "secondary",
  failed: "destructive",
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
          { label: "Avg Score", value: avgScore !== null ? `${avgScore.toFixed(1)} / 10` : "—" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-base-content/50 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Submission history */}
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
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    Submission #{s.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-base-content/50">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.overallScore !== null && (
                    <span className="text-sm font-semibold">{s.overallScore.toFixed(1)}/10</span>
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
