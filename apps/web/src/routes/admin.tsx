import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { apiJson } from "@/lib/api-client"

export const Route = createFileRoute("/admin")({ component: ModerationPage })
interface Report {
  id: string
  reason: string
  details: string | null
  createdAt: string
  reporter: { name: string | null; email: string }
  post: { id: string; title: string; isHidden: boolean } | null
  comment: { id: string; content: string; isHidden: boolean; postId: string } | null
}
function ModerationPage() {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState("")
  const {
    data: reports,
    isLoading,
    error,
  } = useQuery<Report[]>({
    queryKey: ["admin/community/reports"],
    queryFn: () => apiJson<Report[]>("/api/admin/community/reports"),
  })
  async function act(id: string, action: "hide" | "dismiss") {
    setActionError("")
    try {
      await apiJson(`/api/admin/community/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      await queryClient.invalidateQueries({ queryKey: ["admin/community/reports"] })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Moderation action failed")
    }
  }
  return (
    <main className="page-shell max-w-4xl">
      <p className="page-eyebrow">Admin</p>
      <h1 className="page-title mt-2">Community moderation</h1>
      <p className="page-description mt-2">Review reports and hide content or dismiss reports.</p>
      {actionError && (
        <p role="alert" className="mt-4 rounded-xl border border-error/40 p-4 text-error">
          {actionError}
        </p>
      )}
      {isLoading ? (
        <p className="surface-panel mt-8 p-8 text-center text-sm text-base-content/60">
          Loading reports…
        </p>
      ) : error ? (
        <p role="alert" className="mt-8 rounded-xl border border-error/40 p-6 text-error">
          {error.message}
        </p>
      ) : reports?.length ? (
        <div className="mt-8 space-y-4">
          {reports.map((report) => (
            <article key={report.id} className="surface-card p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-5 sm:flex-row">
                <div className="min-w-0">
                  <p className="text-xs text-base-content/60">
                    Reported by {report.reporter.name ?? report.reporter.email} ·{" "}
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                  <h2 className="mt-2 font-semibold text-base-content">{report.reason}</h2>
                  {report.details && (
                    <p className="mt-1 text-sm text-base-content/80">{report.details}</p>
                  )}
                  <p className="mt-4 whitespace-pre-wrap rounded-lg bg-base-100 p-4 text-sm text-base-content/80">
                    {report.comment?.content ?? report.post?.title ?? "Content removed"}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <button
                    type="button"
                    onClick={() => void act(report.id, "hide")}
                    className="app-button app-button-outline app-button-sm border-error/40 text-error"
                  >
                    Hide content
                  </button>
                  <button
                    type="button"
                    onClick={() => void act(report.id, "dismiss")}
                    className="app-button app-button-ghost app-button-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="surface-panel mt-8 p-10 text-center text-sm text-base-content/60">
          No open reports.
        </p>
      )}
    </main>
  )
}
