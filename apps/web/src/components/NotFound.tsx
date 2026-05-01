import { Link } from "@tanstack/react-router"
import { Search, Home } from "lucide-react"

export function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-8 text-center px-4"
      style={{ background: "#0b1326" }}
    >
      <div className="space-y-3">
        <div
          className="inline-flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}
        >
          <Search size={40} style={{ color: "#8083ff" }} />
        </div>

        <h1 className="text-4xl font-bold" style={{ color: "#dae2fd" }}>
          Not Found
        </h1>

        <p className="max-w-md mx-auto text-base" style={{ color: "#908fa0" }}>
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all"
          style={{ background: "#8083ff", color: "#fff" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#6f73e8"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#8083ff"
          }}
        >
          <Home size={16} />
          Back home
        </Link>

        <Link
          to="/questions"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all border"
          style={{ color: "#c0c1ff", borderColor: "#464554", background: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#8083ff"
            e.currentTarget.style.color = "#8083ff"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#464554"
            e.currentTarget.style.color = "#c0c1ff"
          }}
        >
          Browse problems
        </Link>
      </div>
    </div>
  )
}
