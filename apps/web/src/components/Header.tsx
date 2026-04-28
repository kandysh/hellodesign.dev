import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  Activity,
  BookOpen,
  ChevronDown,
  LogOut,
  Search,
  Settings,
  User,
  Users,
  Zap,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

interface SessionUser {
  id: string
  name: string
  email: string
  image?: string
}

export default function Header() {
  const navigate = useNavigate()
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
  const [search, setSearch] = useState("")
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

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    if (q) {
      navigate({ to: "/questions", search: { q } as never })
      setSearch("")
    }
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
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
        {/* Brand + search */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-black tracking-tighter text-slate-50 hover:text-white transition-colors duration-150 shrink-0"
          >
            <HdLogo />
            Hello Design
          </Link>

          {/* Search bar (hidden on small screens) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center gap-2 rounded border px-3 py-1.5 h-9 transition-all"
            style={{
              background: "#222a3d",
              borderColor: "#2d3449",
            }}
            onFocusCapture={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = "#c0c1ff"
              ;(e.currentTarget as HTMLElement).style.boxShadow = "0 0 8px rgba(192,193,255,0.2)"
            }}
            onBlurCapture={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = "#2d3449"
              ;(e.currentTarget as HTMLElement).style.boxShadow = "none"
            }}
          >
            <Search size={14} style={{ color: "#908fa0" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions…"
              className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-slate-600"
              style={{ color: "#dae2fd" }}
            />
          </form>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/questions" label="Explore" icon={<BookOpen size={14} />} />
            <NavLink to="/community" label="Community" icon={<Users size={14} />} />
            <NavLink to="/pricing" label="Pricing" icon={<Zap size={14} />} />
            <NavLink to="/settings" label="Settings" icon={<Settings size={14} />} />
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
                <span className="hidden sm:block max-w-[120px] truncate font-medium">
                  {user.name}
                </span>
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

function NavLink({ to, label, icon }: { to: string; label: string; icon?: React.ReactNode }) {
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
      style={{
        background: "rgba(192,193,255,0.15)",
        color: "#c0c1ff",
        border: "1px solid rgba(192,193,255,0.25)",
      }}
    >
      {user.image ? (
        <img
          src={user.image}
          alt={user.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  )
}

function HdLogo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Dark rounded background */}
      <rect width="32" height="32" rx="7" fill="#0b1326" />
      {/* Teal accent dot */}
      <circle cx="26" cy="6" r="3" fill="#4edea3" />
      {/* H — left bar */}
      <rect x="4" y="8" width="3" height="16" rx="1" fill="#8083ff" />
      {/* H — right bar */}
      <rect x="13" y="8" width="3" height="16" rx="1" fill="#8083ff" />
      {/* H — crossbar */}
      <rect x="4" y="15" width="12" height="2.5" rx="1" fill="#8083ff" />
      {/* D — vertical bar */}
      <rect x="19" y="8" width="3" height="16" rx="1" fill="#8083ff" />
      {/* D — top cap */}
      <rect x="19" y="8" width="7" height="2.5" rx="1" fill="#8083ff" />
      {/* D — bottom cap */}
      <rect x="19" y="21.5" width="7" height="2.5" rx="1" fill="#8083ff" />
      {/* D — right curve (two rects to fake bow) */}
      <rect x="25" y="10" width="3" height="12" rx="1.5" fill="#8083ff" />
    </svg>
  )
}
