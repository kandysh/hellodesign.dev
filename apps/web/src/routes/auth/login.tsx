import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export const Route = createFileRoute("/auth/login")({ component: LoginPage })

function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch(`${API}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })

    setLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.message ?? "Login failed")
    } else {
      window.location.href = "/"
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-bold mb-6 text-center">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex gap-2">
          <a
            href={`${API}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(window.location.origin)}`}
            className="flex-1 rounded-lg border py-2 text-center text-sm font-medium hover:bg-accent transition-colors"
          >
            Google
          </a>
          <a
            href={`${API}/api/auth/sign-in/social?provider=github&callbackURL=${encodeURIComponent(window.location.origin)}`}
            className="flex-1 rounded-lg border py-2 text-center text-sm font-medium hover:bg-accent transition-colors"
          >
            GitHub
          </a>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Don't have an account?{" "}
          <a href="/auth/register" className="text-primary hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  )
}
