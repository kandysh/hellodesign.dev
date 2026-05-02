import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Construction } from "lucide-react"

export const Route = createFileRoute("/questions/$questionId_/interview")({
  component: InterviewComingSoon,
})

function InterviewComingSoon() {
  const { questionId } = Route.useParams()

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-6 text-center p-8"
      style={{ background: "var(--app-bg)" }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--app-indigo-10)", border: "1px solid var(--app-indigo-15)" }}
      >
        <Construction size={28} style={{ color: "var(--app-indigo)" }} />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold" style={{ color: "var(--app-fg)" }}>
          Live Interview Mode
        </h1>
        <p className="text-sm max-w-sm" style={{ color: "var(--app-subtle)" }}>
          We're rethinking the live interview flow. In the meantime, use the workspace's{" "}
          <span style={{ color: "var(--app-indigo)" }}>Deep</span> agent mode for multi-turn review.
        </p>
      </div>

      <Link
        to="/questions/$questionId"
        params={{ questionId }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        style={{ background: "var(--app-indigo-10)", border: "1px solid var(--app-indigo-15)", color: "var(--app-indigo)" }}
      >
        <ArrowLeft size={14} />
        Back to workspace
      </Link>
    </div>
  )
}
