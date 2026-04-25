import { createFileRoute } from "@tanstack/react-router"
import { useState, useId } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardContent } from "@/components/ui/card"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export const Route = createFileRoute("/auth/login")({ component: LoginPage })

function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const emailId = useId()
  const passwordId = useId()

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
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-2">
          <h1 className="text-xl font-bold text-center">Sign in</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={passwordId}>Password</Label>
              <Input
                id={passwordId}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <a
                href={`${API}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(window.location.origin)}`}
              >
                Google
              </a>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a
                href={`${API}/api/auth/sign-in/social?provider=github&callbackURL=${encodeURIComponent(window.location.origin)}`}
              >
                GitHub
              </a>
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-base-content/50">
            Don't have an account?{" "}
            <a href="/auth/register" className="text-primary hover:underline">
              Register
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
