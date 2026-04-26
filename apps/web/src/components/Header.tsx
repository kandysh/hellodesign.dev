import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState, useRef, useEffect } from "react"
import {
  BookOpen,
  Settings,
  LogOut,
  User,
  Users,
  Zap,
  ChevronDown,
  Activity,
  Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  async function handleSignOut() {
    await fetch(`${API}/api/auth/sign-out`, { method: "POST", credentials: "include" })
    window.location.href = "/"
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  return (
    <header
      className="fixed top-0 w-full z-50 border-b"
      style={{
        background: "rgba(6, 8, 20, 0.9)",
        backdropFilter: "blur(12px)",
        borderColor: "#1e293b",
      }}
    >
      <nav className="flex items-center justify-between h-16 px-6 max-w-[1440px] mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-xl font-black tracking-tighter text-slate-50 hover:text-white transition-colors duration-150"
          >
            Hello Design
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/questions" label="Explore" icon={<BookOpen size={14} />} />
            <NavLink to="/community" label="Community" icon={<Users size={14} />} />
            <NavLink to="/pricing" label="Pricing" icon={<Zap size={14} />} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all duration-150 active:scale-95"
              >
                <Avatar user={user} initials={initials} />
                <span className="hidden sm:block max-w-[120px] truncate font-medium">{user.name}</span>
                <ChevronDown size={12} className="text-slate-500" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-48 rounded-lg border text-sm shadow-2xl py-1 z-50"
                  style={{ background: "#131b2e", borderColor: "#2d3449" }}
                >
                  <Link
                    to="/me"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors duration-150"
                  >
                    <User size={13} /> Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors duration-150"
                  >
                    <Settings size={13} /> Settings
                  </Link>
                  <div className="my-1 border-t" style={{ borderColor: "#2d3449" }} />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors duration-150"
                  >
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth/login"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150 active:scale-95 px-3 py-1.5"
            >
              Sign in
            </Link>
          )}

          <Link
            to="/questions"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded transition-all duration-150 active:scale-95 border border-indigo-400/50"
            style={{ boxShadow: "0 0 12px rgba(99,102,241,0.3)" }}
          >
            <Activity size={13} />
            Practice
          </Link>
        </div>
      </nav>
    </header>
  )
}

function NavLink({
  to,
  label,
  icon,
}: {
  to: string
  label: string
  icon?: React.ReactNode
}) {
  return (
    <Link
      to={to}
      activeProps={{
        className: "!text-indigo-400 !border-b-2 !border-indigo-500 !pb-1",
      }}
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium text-slate-400",
        "hover:text-indigo-400 transition-colors duration-150 active:scale-95 transition-transform",
        "pb-1 border-b-2 border-transparent",
      )}
    >
      {icon}
      {label}
    </Link>
  )
}

function Avatar({ user, initials }: { user: SessionUser; initials: string }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden shrink-0"
      style={{ background: "rgba(192,193,255,0.15)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.25)" }}
    >
      {user.image ? (
        <img src={user.image} alt={user.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}
