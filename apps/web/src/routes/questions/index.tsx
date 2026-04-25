import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { Question } from "@sysdesign/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

const difficultyVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  easy: "secondary",
  medium: "default",
  hard: "destructive",
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
        <p className="text-base-content/60">
          {questions.length} questions across all categories
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg border border-base-300 bg-base-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {questions.map((q) => (
            <Link
              key={q.id}
              to="/questions/$questionId"
              params={{ questionId: q.id }}
              className="block group"
            >
              <Card className="p-5 hover:border-primary/50 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold group-hover:text-primary transition-colors">
                      {q.title}
                    </h2>
                    <p className="text-sm text-base-content/60 mt-1 line-clamp-2">
                      {q.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={difficultyVariant[q.difficulty] ?? "default"} className="capitalize">
                      {q.difficulty}
                    </Badge>
                    <span className="text-xs text-base-content/50">
                      {categoryLabels[q.category] ?? q.category}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
