import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, Eye, EyeOff, Github, Lock, Mail, User } from "lucide-react"
import { useState } from "react"
import {
  AuthHeader,
  Divider,
  Field,
  GoogleIcon,
  RightPanel,
  SocialButton,
} from "@/components/auth-shared"
import { apiUrl } from "@/lib/api-client"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/auth/register")({ component: RegisterPage })

function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    const { error: authError } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: `${window.location.origin}/questions`,
    })

    if (authError) {
      setError(authError.message ?? "Registration failed")
      setLoading(false)
    } else {
      setNotice("Check your inbox for a verification link before signing in.")
      setLoading(false)
    }
  }

  const callbackURL = encodeURIComponent(
    typeof window !== "undefined" ? `${window.location.origin}/questions` : "/questions",
  )
  const googleHref = apiUrl(`/api/auth/sign-in/social?provider=google&callbackURL=${callbackURL}`)
  const githubHref = apiUrl(`/api/auth/sign-in/social?provider=github&callbackURL=${callbackURL}`)

  return (
    <>
      <AuthHeader />
      <div className="min-h-[100dvh] flex pt-16" style={{ background: "var(--app-bg)" }}>
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-5 sm:px-8 lg:px-16 py-12 sm:py-16">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1
                className="text-2xl font-bold mb-1.5"
                style={{ color: "var(--app-fg)", letterSpacing: "-0.01em" }}
              >
                Initialize Account
              </h1>
              <p className="text-sm" style={{ color: "var(--app-subtle)" }}>
                Deploy your workspace and join the Hello Design ecosystem.
              </p>
            </div>

            <div className="flex gap-3 mb-6">
              <SocialButton href={googleHref} label="Google" icon={<GoogleIcon />} />
              <SocialButton href={githubHref} label="GitHub" icon={<Github size={15} />} />
            </div>

            <Divider />

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                label="Full Name"
                icon={<User size={15} style={{ color: "var(--app-muted)" }} />}
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="System Admin"
                  className="auth-input"
                />
              </Field>

              <Field
                label="Email Address"
                icon={<Mail size={15} style={{ color: "var(--app-muted)" }} />}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@hellodesign.io"
                  className="auth-input"
                />
              </Field>

              <Field
                label="Password"
                icon={<Lock size={15} style={{ color: "var(--app-muted)" }} />}
                trailingAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/45 hover:text-base-content/80 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              >
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="auth-input"
                />
              </Field>

              <Field
                label="Confirm Password"
                icon={<Lock size={15} style={{ color: "var(--app-muted)" }} />}
              >
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="auth-input"
                />
              </Field>

              {error && (
                <p
                  className="text-sm rounded px-3 py-2"
                  style={{
                    color: "var(--app-red)",
                    background: "rgba(147,0,10,0.2)",
                    border: "1px solid rgba(255,180,171,0.2)",
                  }}
                >
                  {error}
                </p>
              )}

              {notice && (
                <output
                  className="rounded px-3 py-2 text-sm"
                  style={{
                    color: "var(--app-green)",
                    background: "rgba(78,222,163,0.08)",
                    border: "1px solid rgba(78,222,163,0.2)",
                  }}
                >
                  {notice}
                </output>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold text-sm transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                style={{
                  background: "#6366f1",
                  color: "white",
                  boxShadow: "0 0 12px var(--app-indigo-glow)",
                }}
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    Create Account <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs" style={{ color: "var(--app-muted)" }}>
              Already have an account?{" "}
              <Link to="/auth/login" className="text-primary hover:text-primary transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <RightPanel />
      </div>
    </>
  )
}
