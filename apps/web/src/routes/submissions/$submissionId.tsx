import { createFileRoute, redirect } from "@tanstack/react-router"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export const Route = createFileRoute("/submissions/$submissionId")({
  // Fetch the submission to obtain its questionId, then redirect to the
  // canonical result page at /questions/:questionId/result/:submissionId.
  beforeLoad: async ({ params }) => {
    try {
      const res = await fetch(`${API}/api/submissions/${params.submissionId}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data: { questionId?: string } = await res.json()
        if (data.questionId) {
          throw redirect({
            to: "/questions/$questionId/result/$submissionId",
            params: {
              questionId: data.questionId,
              submissionId: params.submissionId,
            },
          })
        }
      }
    } catch (err) {
      // Re-throw redirects so TanStack Router handles them correctly
      if (err && typeof err === "object" && "$$redirect" in err) throw err
      // For other errors fall through to the fallback component below
    }
  },
  component: SubmissionRedirectFallback,
})

function SubmissionRedirectFallback() {
  return (
    <div className="flex h-64 items-center justify-center text-sm" style={{ color: "#908fa0" }}>
      Loading submission…
    </div>
  )
}
