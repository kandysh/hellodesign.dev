import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Lock } from "lucide-react"
import { useState } from "react"
import { AuthHeader, Field } from "@/components/auth-shared"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (!token) {
      setError("This reset link is missing its token. Request a new one.")
      return
    }
    if (password !== confirmation) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token })
    setLoading(false)
    if (resetError) {
      setError(resetError.message ?? "This reset link is invalid or expired")
      return
    }
    window.location.href = "/auth/login?reset=success"
  }

  return (
    <>
      <AuthHeader />
      <main className="min-h-[100dvh] px-5 pt-28" style={{ background: "var(--app-bg)" }}>
        <section
          className="mx-auto w-full max-w-md rounded-2xl border p-7"
          style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
        >
          <h1 className="text-2xl font-bold" style={{ color: "var(--app-fg)" }}>
            Choose a new password
          </h1>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label="New password"
              icon={<Lock size={15} style={{ color: "var(--app-muted)" }} />}
            >
              <input
                className="auth-input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field
              label="Confirm password"
              icon={<Lock size={15} style={{ color: "var(--app-muted)" }} />}
            >
              <input
                className="auth-input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}
            <button
              className="app-button app-button-primary w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
          <Link
            to="/auth/login"
            className="mt-5 inline-flex items-center gap-2 text-sm text-primary"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </section>
      </main>
    </>
  )
}
