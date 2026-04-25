import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { BookOpen, Settings, LogOut, User, ChevronDown } from "lucide-react"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

interface SessionUser {
  id: string
  name: string
  email: string
  image?: string
}

export default function Header() {
  const { data: session } = useQuery<{ user: SessionUser } | null>({
    queryKey: ["session"],
    queryFn: () =>
      fetch(`${API}/api/auth/get-session`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    staleTime: 1000 * 60 * 5,
  })

  const user = session?.user ?? null

  async function handleSignOut() {
    await fetch(`${API}/api/auth/sign-out`, { method: "POST", credentials: "include" })
    window.location.href = "/"
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  return (
    <header className="sticky top-0 z-50 border-b border-base-300/40 glass-panel">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-1 font-mono text-base font-semibold tracking-tight transition-default hover:opacity-80"
        >
          <span className="text-primary">sys</span>
          <span className="text-base-content/90">design</span>
          <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link
            to="/questions"
            activeProps={{ className: "!bg-base-300/60 !text-base-content" }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-base-content/70 transition-default hover:bg-base-300/40 hover:text-base-content focus-visible:ring-2 focus-visible:ring-primary"
          >
            <BookOpen size={14} />
            Questions
          </Link>

          {user ? (
            <div className="dropdown dropdown-end ml-2">
              <button
                type="button"
                tabIndex={0}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-default hover:bg-base-300/40 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="avatar placeholder">
                  <div className="w-7 rounded-full bg-primary/20 text-primary">
                    {user.image ? (
                      <img src={user.image} alt={user.name} referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xs font-semibold">{initials}</span>
                    )}
                  </div>
                </div>
                <span className="max-w-[120px] truncate text-base-content/80">{user.name}</span>
                <ChevronDown size={12} className="text-base-content/50" />
              </button>
              {/* biome-ignore lint/a11y/useSemanticElements: DaisyUI dropdown requires ul/tabIndex */}
              <ul
                tabIndex={0}
                className="dropdown-content menu z-50 mt-1 w-44 rounded-xl border border-base-300/50 bg-base-200 p-1.5 shadow-lg shadow-indigo-950/40 text-sm"
              >
                <li>
                  <Link to="/me" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-base-300/60">
                    <User size={14} /> Profile
                  </Link>
                </li>
                <li>
                  <Link to="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-base-300/60">
                    <Settings size={14} /> Settings
                  </Link>
                </li>
                <li className="mt-1 border-t border-base-300/40 pt-1">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-error hover:bg-error/10"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <Link
              to="/auth/login"
              className="btn btn-ghost btn-sm rounded-lg border border-base-300/50 text-base-content/60 transition-default hover:text-base-content"
            >
              Sign in to save progress
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
