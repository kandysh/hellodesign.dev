import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useState, lazy, Suspense, useCallback } from "react"
import type { Question } from "@sysdesign/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RichTextEditor } from "@/components/RichTextEditor"

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw }))
)

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

const EDITOR_PLACEHOLDER = `Walk through your design step by step:

1. Requirements clarification
2. Capacity estimation
3. High-level architecture
4. Data model
5. API design
6. Scalability & trade-offs`

export const Route = createFileRoute("/questions/$questionId")({
  component: SolvePage,
})

function SolvePage() {
  const { questionId } = Route.useParams()
  const navigate = useNavigate()
  const [answerText, setAnswerText] = useState("")
  const [excalidrawData, setExcalidrawData] = useState<Record<string, unknown> | null>(null)

  const handleEditorChange = useCallback((markdown: string) => {
    setAnswerText(markdown)
  }, [])

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
      <div className="h-96 flex items-center justify-center text-base-content/60">
        Loading question...
      </div>
    )
  }

  if (!question) {
    return (
      <div className="h-96 flex items-center justify-center text-base-content/60">
        Question not found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Question header */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{question.title}</h1>
            <p className="text-sm text-base-content/60 mt-1">{question.description}</p>
          </div>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!answerText.trim()}
            loading={submitMutation.isPending}
            className="shrink-0"
          >
            Submit for Review
          </Button>
        </div>
        {submitMutation.isError && (
          <p className="text-sm text-error mt-2">
            {submitMutation.error.message}
          </p>
        )}
      </Card>

      {/* Split editor */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Diagram — left */}
        <Card className="flex-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-base-300 text-xs font-medium text-base-content/60">
            Architecture Diagram (Excalidraw)
          </div>
          <div className="h-[calc(100%-2.25rem)]">
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center text-base-content/60 text-sm">
                  Loading canvas...
                </div>
              }
            >
              <Excalidraw
                onChange={(elements, appState) => {
                  setExcalidrawData({ elements, appState })
                }}
              />
            </Suspense>
          </div>
        </Card>

        {/* Rich text answer — right */}
        <Card className="w-[420px] flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2 border-b border-base-300 text-xs font-medium text-base-content/60">
            Written Explanation
          </div>
          <RichTextEditor
            onChange={handleEditorChange}
            placeholder={EDITOR_PLACEHOLDER}
            className="flex-1 min-h-0"
          />
          <div className="px-3 py-2 border-t border-base-300 text-xs text-base-content/50 text-right">
            {answerText.length} chars
          </div>
        </Card>
      </div>
    </div>
  )
}
