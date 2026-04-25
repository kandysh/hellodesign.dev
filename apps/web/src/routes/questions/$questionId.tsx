import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useState, lazy, Suspense } from "react"
import type { Question } from "@sysdesign/types"

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw }))
)

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export const Route = createFileRoute("/questions/$questionId")({
  component: SolvePage,
})

function SolvePage() {
  const { questionId } = Route.useParams()
  const navigate = useNavigate()
  const [answerText, setAnswerText] = useState("")
  const [excalidrawData, setExcalidrawData] = useState<Record<string, unknown> | null>(null)

  const { data: question, isLoading } = useQuery<Question>({
    queryKey: ["question", questionId],
    queryFn: () => fetch(`${API}/api/questions/${questionId}`).then((r) => r.json()),
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          questionId,
          answerText,
          excalidrawJson: excalidrawData,
        }),
      })
      if (!res.ok) throw new Error("Failed to submit")
      return res.json() as Promise<{ submissionId: string }>
    },
    onSuccess: ({ submissionId }) => {
      navigate({ to: "/submissions/$submissionId", params: { submissionId } })
    },
  })

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        Loading question...
      </div>
    )
  }

  if (!question) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        Question not found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Question header */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{question.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{question.description}</p>
          </div>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={!answerText.trim() || submitMutation.isPending}
            className="shrink-0 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
          </button>
        </div>
        {submitMutation.isError && (
          <p className="text-sm text-destructive mt-2">
            {submitMutation.error.message}
          </p>
        )}
      </div>

      {/* Split editor */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Diagram — left */}
        <div className="flex-1 rounded-lg border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
            Architecture Diagram (Excalidraw)
          </div>
          <div className="h-[calc(100%-2.25rem)]">
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Loading canvas...
                </div>
              }
            >
              <Excalidraw
                onChange={(elements, appState, files) => {
                  setExcalidrawData({ elements, appState })
                }}
              />
            </Suspense>
          </div>
        </div>

        {/* Answer text — right */}
        <div className="w-[420px] flex flex-col rounded-lg border bg-card overflow-hidden shrink-0">
          <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
            Written Explanation
          </div>
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder={`Walk through your design step by step:\n\n1. Requirements clarification\n2. Capacity estimation\n3. High-level architecture\n4. Data model\n5. API design\n6. Scalability & trade-offs`}
            className="flex-1 resize-none p-3 text-sm bg-transparent focus:outline-none font-mono leading-relaxed"
          />
          <div className="px-3 py-2 border-t text-xs text-muted-foreground text-right">
            {answerText.length} chars
          </div>
        </div>
      </div>
    </div>
  )
}
