import { createFileRoute } from "@tanstack/react-router";
import { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const Route = createFileRoute("/auth/register")({ component: RegisterPage });

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error: authError } = await authClient.signUp.email(
      { name, email, password },
      {
        onSuccess: () => { window.location.href = "/"; },
        onError: (ctx) => { setError(ctx.error.message ?? "Registration failed"); },
      },
    );

    if (authError) setError(authError.message ?? "Registration failed");
    setLoading(false);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-2">
          <h1 className="text-xl font-bold text-center">Create account</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Your full name"
              />
            </div>

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
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={confirmPasswordId}>Confirm password</Label>
              <Input
                id={confirmPasswordId}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>

          <div className="relative my-4 flex items-center gap-3">
            <div className="flex-1 border-t border-base-300/40" />
            <span className="text-xs text-base-content/40">or</span>
            <div className="flex-1 border-t border-base-300/40" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <a
                href={`${API}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`}
              >
                Google
              </a>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a
                href={`${API}/api/auth/sign-in/social?provider=github&callbackURL=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`}
              >
                GitHub
              </a>
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-base-content/50">
            Already have an account?{" "}
            <a href="/auth/login" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

