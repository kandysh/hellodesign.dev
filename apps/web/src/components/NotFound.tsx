import { Link } from "@tanstack/react-router"
import { Search, Home } from "lucide-react"

export function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-8 text-center px-4"
      style={{ background: "var(--app-bg)" }}
    >
      <div className="space-y-3">
        <div
          className="inline-flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{ background: "rgba(99,102,241,0.12)", border: "1px solid var(--app-indigo-glow)" }}
        >
          <Search size={40} style={{ color: "var(--app-indigo)" }} />
        </div>

        <h1 className="text-4xl font-bold" style={{ color: "var(--app-fg)" }}>
          Not Found
        </h1>

        <p className="max-w-md mx-auto text-base" style={{ color: "var(--app-subtle)" }}>
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all"
          style={{ background: "var(--app-indigo)", color: "#fff" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#6f73e8"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--app-indigo)"
          }}
        >
          <Home size={16} />
          Back home
        </Link>

        <Link
          to="/questions"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all border"
          style={{ color: "var(--app-indigo-pale)", borderColor: "var(--app-muted)", background: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--app-indigo)"
            e.currentTarget.style.color = "var(--app-indigo)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--app-muted)"
            e.currentTarget.style.color = "var(--app-indigo-pale)"
          }}
        >
          Browse problems
        </Link>
      </div>
    </div>
  )
}
