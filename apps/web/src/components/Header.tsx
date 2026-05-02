import { useQuery } from "@tanstack/react-query"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  Activity,
  BookOpen,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  Users,
  X,
  Zap,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "../hooks/useTheme"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

interface SessionUser {
  id: string
  name: string
  email: string
  image?: string
}

const NAV_LINKS = [
  { to: "/questions", label: "Explore", icon: BookOpen },
  { to: "/community", label: "Community", icon: Users },
  { to: "/pricing", label: "Pricing", icon: Zap },
]

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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [currentPath])

  // Close user menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  async function handleSignOut() {
    await fetch(`${API}/api/auth/sign-out`, { method: "POST", credentials: "include" })
    window.location.href = "/"
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  const isActive = (to: string) =>
    to === "/" ? currentPath === "/" : currentPath.startsWith(to)

  return (
    <>
      <header
        className="fixed top-0 w-full z-50 border-b"
        style={{
          background: "var(--app-header-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "var(--app-header-border)",
          transition: "background 0.2s ease, border-color 0.2s ease",
        }}
      >
        <nav className="flex items-center justify-between h-14 px-4 sm:px-6 max-w-[1440px] mx-auto">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0 group"
            aria-label="Hello Design home"
          >
            <HdLogo />
            <span
              className="text-lg font-black tracking-tight transition-colors duration-150"
              style={{ color: "var(--app-fg)" }}
            >
              Hello Design
            </span>
          </Link>

          {/* Desktop nav links — centered */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} label={label} active={isActive(to)} />
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            {/* Settings */}
            <Link
              to="/settings"
              aria-label="Settings"
              className="w-8 h-8 rounded flex items-center justify-center transition-all duration-150"
              style={{ color: "var(--app-subtle)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--app-surface-3)"
                ;(e.currentTarget as HTMLElement).style.color = "var(--app-indigo)"
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent"
                ;(e.currentTarget as HTMLElement).style.color = "var(--app-subtle)"
              }}
            >
              <Settings size={15} />
            </Link>

            <div className="w-px h-5 mx-1" style={{ background: "var(--app-border)" }} />

            {/* User menu / sign in */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded px-2.5 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95"
                  style={{ color: "var(--app-body)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--app-surface-3)"
                    e.currentTarget.style.color = "var(--app-fg)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = "var(--app-body)"
                  }}
                >
                  <UserAvatar user={user} initials={initials} size={26} />
                  <span className="hidden sm:block max-w-[100px] truncate">{user.name.split(" ")[0]}</span>
                  <ChevronDown size={11} style={{ color: "var(--app-muted)" }} />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-lg border shadow-2xl py-1.5 text-sm z-50"
                    style={{
                      background: "var(--app-surface)",
                      borderColor: "var(--app-border)",
                      boxShadow: "0 16px 32px rgba(0,0,0,0.25), 0 4px 8px rgba(0,0,0,0.15)",
                    }}
                  >
                    <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--app-border)" }}>
                      <p className="font-semibold truncate" style={{ color: "var(--app-fg)" }}>
                        {user.name}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--app-subtle)" }}>
                        {user.email}
                      </p>
                    </div>
                    <DropdownItem to="/me" icon={<User size={13} />} label="Profile" onClick={() => setUserMenuOpen(false)} />
                    <DropdownItem to="/settings" icon={<Settings size={13} />} label="Settings" onClick={() => setUserMenuOpen(false)} />
                    <div className="my-1 border-t" style={{ borderColor: "var(--app-border)" }} />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 transition-colors duration-150 text-left"
                      style={{ color: "var(--app-red)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,100,100,0.08)" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth/login"
                className="text-sm font-medium px-3 py-1.5 rounded transition-all duration-150 active:scale-95"
                style={{ color: "var(--app-subtle)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--app-fg)"
                  ;(e.currentTarget as HTMLElement).style.background = "var(--app-surface-3)"
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--app-subtle)"
                  ;(e.currentTarget as HTMLElement).style.background = "transparent"
                }}
              >
                Sign in
              </Link>
            )}

            <Link
              to="/questions"
              className="inline-flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-1.5 rounded transition-all duration-150 active:scale-95"
              style={{
                background: "var(--app-indigo)",
                boxShadow: "0 0 12px var(--app-indigo-glow)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.filter = "none"
              }}
            >
              <Activity size={13} />
              Practice
            </Link>
          </div>

          {/* Mobile: hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ color: "var(--app-body)" }}
            >
              <Menu size={18} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="mobile-nav-overlay"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
            role="button"
            tabIndex={-1}
            aria-label="Close navigation"
          />

          {/* Drawer */}
          <div
            className="mobile-nav-drawer open"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--app-border)" }}>
              <span className="font-bold text-base" style={{ color: "var(--app-fg)" }}>Navigation</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="w-8 h-8 rounded flex items-center justify-center"
                style={{ color: "var(--app-subtle)" }}
              >
                <X size={18} />
              </button>
            </div>

            <nav className="px-3 py-4 flex flex-col gap-1">
              {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    color: isActive(to) ? "var(--app-indigo)" : "var(--app-body)",
                    background: isActive(to) ? "var(--app-indigo-10)" : "transparent",
                  }}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
              <Link
                to="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  color: isActive("/settings") ? "var(--app-indigo)" : "var(--app-body)",
                  background: isActive("/settings") ? "var(--app-indigo-10)" : "transparent",
                }}
              >
                <Settings size={16} /> Settings
              </Link>
            </nav>

            <div className="border-t px-3 py-4" style={{ borderColor: "var(--app-border)" }}>
              {user ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <UserAvatar user={user} initials={initials} size={32} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--app-fg)" }}>{user.name}</p>
                      <p className="text-xs truncate" style={{ color: "var(--app-subtle)" }}>{user.email}</p>
                    </div>
                  </div>
                  <Link
                    to="/me"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
                    style={{ color: "var(--app-body)" }}
                  >
                    <User size={16} /> Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left"
                    style={{ color: "var(--app-red)" }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-1">
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center py-2.5 rounded text-sm font-medium border transition-all duration-150"
                    style={{ color: "var(--app-body)", borderColor: "var(--app-border)" }}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/questions"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded text-sm font-semibold text-white transition-all duration-150"
                    style={{ background: "var(--app-indigo)" }}
                  >
                    <Activity size={14} /> Practice
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className="relative px-3 py-1.5 text-sm font-medium rounded transition-all duration-150"
      style={{ color: active ? "var(--app-indigo)" : "var(--app-subtle)" }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = "var(--app-body)"
          ;(e.currentTarget as HTMLElement).style.background = "var(--app-surface-3)"
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = active ? "var(--app-indigo)" : "var(--app-subtle)"
        ;(e.currentTarget as HTMLElement).style.background = "transparent"
      }}
    >
      {label}
      {active && (
        <span
          className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
          style={{ background: "var(--app-indigo)" }}
        />
      )}
    </Link>
  )
}

function DropdownItem({
  to,
  icon,
  label,
  onClick,
}: {
  to: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors duration-150"
      style={{ color: "var(--app-body)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--app-surface-3)"
        ;(e.currentTarget as HTMLElement).style.color = "var(--app-fg)"
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent"
        ;(e.currentTarget as HTMLElement).style.color = "var(--app-body)"
      }}
    >
      {icon}
      {label}
    </Link>
  )
}

function UserAvatar({ user, initials, size = 28 }: { user: SessionUser; initials: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-xs font-bold overflow-hidden shrink-0"
      style={{
        width: size,
        height: size,
        background: "var(--app-indigo-15)",
        color: "var(--app-indigo-pale)",
        border: "1px solid var(--app-indigo-20)",
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
      width="26"
      height="26"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="7" fill="var(--app-surface)" />
      <svg x="3" y="3" width="26" height="26" viewBox="0 -960 960 960">
        <path
          d="M600-80v-100L320-320H120v-240h172l108-124v-196h240v240H468L360-516v126l240 120v-50h240v240H600ZM480-720h80v-80h-80v80ZM200-400h80v-80h-80v80Zm480 240h80v-80h-80v80Z"
          fill="var(--app-indigo)"
        />
      </svg>
    </svg>
  )
}

