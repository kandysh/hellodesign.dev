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
      style={{ background: "#0b1120" }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}
      >
        <Construction size={28} style={{ color: "#8083ff" }} />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold" style={{ color: "#dae2fd" }}>
          Live Interview Mode
        </h1>
        <p className="text-sm max-w-sm" style={{ color: "#908fa0" }}>
          We're rethinking the live interview flow. In the meantime, use the workspace's{" "}
          <span style={{ color: "#8083ff" }}>Deep</span> agent mode for multi-turn review.
        </p>
      </div>

      <Link
        to="/questions/$questionId"
        params={{ questionId }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#8083ff" }}
      >
        <ArrowLeft size={14} />
        Back to workspace
      </Link>
    </div>
  )
}
