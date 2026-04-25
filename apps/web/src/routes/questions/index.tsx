import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { Question } from "@sysdesign/types"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

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

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
}

export const Route = createFileRoute("/questions/")({
  component: QuestionsPage,
})

function QuestionsPage() {
  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ["questions"],
    queryFn: () => fetch(`${API}/api/questions`).then((r) => r.json()),
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Question Bank</h1>
        <p className="text-muted-foreground">
          {questions.length} questions across all categories
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {questions.map((q) => (
            <Link
              key={q.id}
              to="/questions/$questionId"
              params={{ questionId: q.id }}
              className="block rounded-lg border bg-card p-5 hover:border-primary/50 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold group-hover:text-primary transition-colors">
                    {q.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {q.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${difficultyColors[q.difficulty]}`}
                  >
                    {q.difficulty}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {categoryLabels[q.category] ?? q.category}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
