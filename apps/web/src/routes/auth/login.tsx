import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Eye, EyeOff, Mail, Lock, Github, ArrowRight } from "lucide-react";
import { BrandingPanel, SocialButton, Divider, Field, GoogleIcon, AuthHeader } from "@/components/auth-shared";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const Route = createFileRoute("/auth/login")({ component: LoginPage });

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authError } = await authClient.signIn.email({ email, password });

    if (authError) {
      setError(authError.message ?? "Login failed");
      setLoading(false);
    } else if (data) {
      window.location.href = "/questions";
    }
  }

  const googleHref = `${API}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}/questions` : "/questions")}`;
  const githubHref = `${API}/api/auth/sign-in/social?provider=github&callbackURL=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}/questions` : "/questions")}`;

  return (
    <>
      <AuthHeader />
      <div className="min-h-screen flex pt-16" style={{ background: "#0b1326" }}>
        {/* ── Left branding panel ─────────────────────────────── */}
        <BrandingPanel />

      {/* ── Right form panel ────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 lg:px-16 py-16 relative">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-2xl font-bold mb-1.5"
              style={{ color: "#dae2fd", letterSpacing: "-0.01em" }}
            >
              Sign in
            </h1>
            <p className="text-sm" style={{ color: "#908fa0" }}>
              Access your system design workspace.
            </p>
          </div>

          {/* Social buttons */}
          <div className="flex gap-3 mb-6">
            <SocialButton href={googleHref} label="Google" icon={<GoogleIcon />} />
            <SocialButton href={githubHref} label="GitHub" icon={<Github size={15} />} />
          </div>

          {/* Divider */}
          <Divider />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Email Address"
              icon={<Mail size={15} style={{ color: "#464554" }} />}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="auth-input"
              />
            </Field>

            <Field
              label="Password"
              icon={<Lock size={15} style={{ color: "#464554" }} />}
              trailingAction={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
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
                autoComplete="current-password"
                placeholder="••••••••"
                className="auth-input"
              />
            </Field>

            {error && (
              <p
                className="text-sm rounded px-3 py-2"
                style={{ color: "#ffb4ab", background: "rgba(147,0,10,0.2)", border: "1px solid rgba(255,180,171,0.2)" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold text-sm transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: "#6366f1", color: "white", boxShadow: "0 0 12px rgba(99,102,241,0.3)" }}
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>Sign in <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: "#464554" }}>
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}

