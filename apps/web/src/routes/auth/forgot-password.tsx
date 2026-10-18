import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Mail } from "lucide-react"
import { useState } from "react"
import { AuthHeader, Field } from "@/components/auth-shared"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/auth/forgot-password")({ component: ForgotPasswordPage })

function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setNotice("")
    setLoading(true)
    const { error: requestError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (requestError) {
      setError(requestError.message ?? "Could not request a password reset")
      return
    }
    setNotice("If an account uses that address, a password reset link is on its way.")
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
            Reset your password
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--app-subtle)" }}>
            We will email you a secure reset link.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label="Email address"
              icon={<Mail size={15} style={{ color: "var(--app-muted)" }} />}
            >
              <input
                className="auth-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}
            {notice && <output className="text-sm text-success">{notice}</output>}
            <button
              className="app-button app-button-primary w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending…" : "Send reset link"}
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
