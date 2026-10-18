import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Key,
  LogIn,
  Monitor,
  Moon,
  Plus,
  Shield,
  Sun,
  Trash2,
  User as UserIcon,
} from "lucide-react"
import { useState } from "react"
import { useToast } from "@/components/Toast"
import { apiJson } from "@/lib/api-client"
import { setTheme } from "@/lib/theme"

interface SessionUser {
  id: string
  name: string
  email: string
  image?: string
}

interface Stats {
  solved: number
  avgScore: number | null
  streak: number
}

export const Route = createFileRoute("/settings")({ component: SettingsPage })

function SettingsPage() {
  const { toast } = useToast()
  const [confirmEmail, setConfirmEmail] = useState("")
  const [dataActionBusy, setDataActionBusy] = useState(false)

  const { data: session } = useQuery<{ user: SessionUser } | null>({
    queryKey: ["session"],
    queryFn: () => apiJson<{ user: SessionUser } | null>("/api/auth/get-session").catch(() => null),
  })

  const { data: stats } = useQuery<Stats>({
    queryKey: ["me/stats"],
    queryFn: () => apiJson<Stats>("/api/me/stats"),
  })

  const user = session?.user ?? null

  function handleSignOut() {
    apiJson("/api/auth/sign-out", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        window.location.href = "/"
      })
  }

  async function clearGuestData() {
    if (
      !window.confirm("Clear all practice submissions and saved API keys from this guest session?")
    )
      return
    setDataActionBusy(true)
    try {
      await apiJson("/api/me/session-data", { method: "DELETE" })
      if (!user) localStorage.removeItem(STORAGE_KEY)
      toast("Guest session data cleared", "success")
      window.location.reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not clear guest data", "error")
    } finally {
      setDataActionBusy(false)
    }
  }

  async function deleteAccount() {
    if (
      !user ||
      confirmEmail !== user.email ||
      !window.confirm(
        "Permanently delete your account and its submissions, API keys, community posts, and comments?",
      )
    )
      return
    setDataActionBusy(true)
    try {
      await apiJson("/api/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      })
      localStorage.removeItem(STORAGE_KEY)
      window.location.href = "/"
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete account", "error")
    } finally {
      setDataActionBusy(false)
    }
  }

  return (
    <main className="page-shell max-w-3xl" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
      <p className="page-eyebrow mb-2">Workspace</p>
      <h1
        style={{ color: "var(--app-fg)", letterSpacing: "-0.02em" }}
        className="mb-2 text-3xl font-semibold"
      >
        Settings
      </h1>
      <p className="page-description mb-8">
        Manage your model provider, appearance, and account data.
      </p>

      <SectionCard
        icon={<AlertTriangle size={15} style={{ color: "var(--app-red)" }} />}
        title="Guest session data"
        subtitle="Guest activity is stored separately from your account, including on this browser"
      >
        <p className="mb-3 text-sm" style={{ color: "var(--app-subtle)" }}>
          Clear submissions, results, and saved API keys created before signing in on this browser.
        </p>
        <button
          type="button"
          disabled={dataActionBusy}
          onClick={() => void clearGuestData()}
          className="rounded border border-error/40 px-4 py-2 text-sm text-error disabled:opacity-50"
        >
          {dataActionBusy ? "Working…" : "Clear guest data"}
        </button>
      </SectionCard>

      {user ? (
        <>
          {/* ── Account Profile ── */}
          <SectionCard
            icon={<UserIcon size={15} style={{ color: "var(--app-indigo)" }} />}
            title="Account Profile"
            subtitle="Your identity and linked account"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-4 mb-5">
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: "rgba(192,193,255,0.1)",
                  border: "1px solid var(--app-indigo-20)",
                  color: "var(--app-indigo-pale)",
                }}
                className="rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
              >
                {user.image ? (
                  <img
                    src={user.image}
                    className="w-full h-full object-cover"
                    alt={user.name}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                )}
              </div>
              <div>
                <p style={{ color: "var(--app-fg)" }} className="font-semibold text-sm">
                  {user.name}
                </p>
                <p style={{ color: "var(--app-subtle)" }} className="text-xs">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Solved", val: stats?.solved },
                {
                  label: "Avg Score",
                  val: stats?.avgScore != null ? `${Math.round(stats.avgScore * 10)}%` : undefined,
                },
                { label: "Streak", val: stats?.streak },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "var(--app-surface)",
                    border: "1px solid var(--app-border)",
                  }}
                  className="rounded-lg px-4 py-3 text-center"
                >
                  <p
                    style={{
                      color: "var(--app-indigo-pale)",
                      fontFamily: "'Geist Mono Variable', monospace",
                    }}
                    className="text-xl font-bold"
                  >
                    {s.val ?? "—"}
                  </p>
                  <p style={{ color: "var(--app-muted)" }} className="text-xs mt-0.5">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── API Keys ── */}
          <SectionCard
            icon={<Key size={15} style={{ color: "var(--app-indigo)" }} />}
            title="API Keys"
            subtitle="Use your own OpenAI or OpenAI-compatible provider key"
          >
            <ApiKeySection toast={toast} />
          </SectionCard>

          {/* ── Workspace Preferences ── */}
          <SectionCard
            icon={<Moon size={15} style={{ color: "var(--app-indigo)" }} />}
            title="Workspace Preferences"
            subtitle="Appearance and interface settings"
          >
            <ThemeSelector />
          </SectionCard>

          {/* ── Security notice ── */}
          <div
            role="note"
            style={{
              background: "rgba(128,131,255,0.05)",
              border: "1px solid var(--app-indigo-15)",
            }}
            className="flex gap-3 rounded-xl p-4 text-sm mb-4"
          >
            <Shield size={15} className="mt-0.5 shrink-0" style={{ color: "var(--app-indigo)" }} />
            <div style={{ color: "var(--app-subtle)" }} className="leading-relaxed">
              <span style={{ color: "var(--app-body)" }} className="font-medium">
                Encrypted storage.
              </span>{" "}
              Your key is encrypted with AES-256-GCM at rest. The server decrypts it for each AI
              request and sends it to the provider you configured. Hello Design does not use a
              platform-owned AI key.
            </div>
          </div>

          {/* ── Danger Zone ── */}
          <div
            style={{
              background: "var(--app-surface-2)",
              border: "1px solid rgba(255,180,171,0.2)",
            }}
            className="rounded-xl overflow-hidden mb-4"
          >
            <div style={{ borderBottom: "1px solid rgba(255,180,171,0.15)" }} className="px-6 py-4">
              <h2
                style={{ color: "var(--app-red)" }}
                className="text-base font-bold flex items-center gap-2"
              >
                <AlertTriangle size={15} />
                Danger Zone
              </h2>
            </div>
            <div className="px-6 py-5 flex items-center justify-between">
              <div>
                <p style={{ color: "var(--app-fg)" }} className="text-sm font-medium">
                  Sign out everywhere
                </p>
                <p style={{ color: "var(--app-subtle)" }} className="text-xs mt-0.5">
                  Revoke all active sessions
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  color: "var(--app-red)",
                  background: "rgba(255,180,171,0.08)",
                  border: "1px solid rgba(255,180,171,0.3)",
                }}
                className="px-4 py-2 rounded text-sm font-medium hover:bg-red-900/20 transition-colors active:scale-95"
              >
                Sign Out
              </button>
            </div>
            <div className="px-6 pb-5">
              <p style={{ color: "var(--app-fg)" }} className="text-sm font-medium">
                Delete account and data
              </p>
              <p style={{ color: "var(--app-subtle)" }} className="text-xs mt-1">
                Deletes your account, API keys, private practice history, shared posts, and
                comments.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  aria-label="Confirm account email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={user.email}
                  className="min-w-56 flex-1 rounded border border-base-300 bg-base-200 px-3 py-2 text-sm text-base-content"
                />
                <button
                  type="button"
                  disabled={dataActionBusy || confirmEmail !== user.email}
                  onClick={() => void deleteAccount()}
                  className="rounded border border-error/40 px-4 py-2 text-sm text-error disabled:opacity-50"
                >
                  Delete account
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── Guest: Sync CTA ── */}
          <div
            style={{
              background: "var(--app-surface-2)",
              border: "1px solid var(--app-indigo-20)",
            }}
            className="rounded-xl p-10 text-center mb-4"
          >
            <div
              style={{
                background: "var(--app-indigo-10)",
                color: "var(--app-indigo)",
                width: 48,
                height: 48,
              }}
              className="rounded-full mx-auto mb-4 flex items-center justify-center"
            >
              <LogIn size={20} />
            </div>
            <h2 style={{ color: "var(--app-fg)" }} className="text-xl font-bold mb-2">
              Sync Your Workflow
            </h2>
            <p
              style={{ color: "var(--app-subtle)" }}
              className="text-sm mb-6 max-w-sm mx-auto leading-relaxed"
            >
              Create an account or sign in from this browser to move guest submissions and keys to
              your account and keep future practice activity across devices.
            </p>
            <Link
              to="/auth/login"
              style={{
                background: "#6366f1",
                color: "white",
                boxShadow: "0 0 12px var(--app-indigo-glow)",
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-semibold hover:brightness-110 transition-colors active:scale-95"
            >
              Sign In to Sync
            </Link>
          </div>

          {/* ── Guest Workspace Preferences ── */}
          <SectionCard
            icon={<Moon size={15} style={{ color: "var(--app-indigo)" }} />}
            title="Workspace Preferences"
            subtitle="Appearance and interface settings"
          >
            <ThemeSelector />
          </SectionCard>

          {/* ── Guest API Keys ── */}
          <SectionCard
            icon={<Key size={15} style={{ color: "var(--app-indigo)" }} />}
            title="API Keys"
            subtitle="Use your own OpenAI-compatible provider key"
          >
            <ApiKeySection toast={toast} />
          </SectionCard>

          {/* ── Security notice ── */}
          <div
            role="note"
            style={{
              background: "rgba(128,131,255,0.05)",
              border: "1px solid var(--app-indigo-15)",
            }}
            className="flex gap-3 rounded-xl p-4 text-sm"
          >
            <Shield size={15} className="mt-0.5 shrink-0" style={{ color: "var(--app-indigo)" }} />
            <div style={{ color: "var(--app-subtle)" }} className="leading-relaxed">
              <span style={{ color: "var(--app-body)" }} className="font-medium">
                Encrypted storage.
              </span>{" "}
              Your key is encrypted with AES-256-GCM at rest. The server decrypts it for each AI
              request and sends it to the provider you configured. Hello Design does not use a
              platform-owned AI key.
            </div>
          </div>
        </>
      )}
    </main>
  )
}

// ── Section card ────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)" }}
      className="rounded-xl overflow-hidden mb-4"
    >
      <div
        style={{ background: "var(--app-surface)", borderBottom: "1px solid var(--app-border)" }}
        className="px-6 py-4"
      >
        <h2
          style={{ color: "var(--app-fg)" }}
          className="text-base font-bold flex items-center gap-2"
        >
          {icon}
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: "var(--app-subtle)" }} className="text-xs mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ── API Key section ─────────────────────────────────────────────────────────

const STORAGE_KEY = "sysdesign:apikey"

interface StoredKey {
  id: string
  provider: string
  keyHint: string
  baseUrl?: string | null
  validatedAt: string | null
}

function ApiKeySection({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error" | "info" | "warning") => void
}) {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState("")
  const [draftBaseUrl, setDraftBaseUrl] = useState("https://openrouter.ai/api/v1")
  const [showDraft, setShowDraft] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: keys = [], isLoading: keysLoading } = useQuery<StoredKey[]>({
    queryKey: ["api-keys"],
    queryFn: () => apiJson<StoredKey[]>("/api/keys").catch(() => []),
  })

  const activeKey = keys[0] ?? null

  async function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await apiJson<{ id: string }>("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "openai",
          key: trimmed,
          baseUrl: draftBaseUrl.trim() || undefined,
          modelName: draftBaseUrl.trim() ? "openai/gpt-4o-mini" : "gpt-4o-mini",
          validate: true,
        }),
      })
      await qc.invalidateQueries({ queryKey: ["api-keys"] })
      setDraft("")
      setDraftBaseUrl("https://openrouter.ai/api/v1")
      setShowNew(false)
      toast("Key saved & validated", "success")
    } catch (err) {
      toast((err as Error).message, "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiJson(`/api/keys/${id}`, { method: "DELETE" })
      localStorage.removeItem(STORAGE_KEY)
      await qc.invalidateQueries({ queryKey: ["api-keys"] })
      toast("Key removed", "info")
    } catch (err) {
      toast((err as Error).message, "error")
    }
  }

  return (
    <div className="space-y-3">
      <p className="max-w-2xl text-sm leading-6" style={{ color: "var(--app-subtle)" }}>
        A key is only needed to request an AI review. You can explore questions and draft answers
        without one; model usage is billed by your provider under its account and pricing.
      </p>
      {keysLoading ? (
        <div
          className="animate-pulse h-12 rounded-lg"
          style={{ background: "var(--app-surface-3)" }}
        />
      ) : activeKey ? (
        <div
          style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}
          className="flex items-center justify-between rounded-lg px-4 py-3"
        >
          <div>
            <p
              className="flex items-center gap-2 text-xs font-medium"
              style={{ color: "var(--app-subtle)" }}
            >
              <span
                style={{ background: "var(--app-green)" }}
                className="inline-block h-1.5 w-1.5 rounded-full"
              />
              BYOK API Key
              {activeKey.validatedAt && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(78,222,163,0.1)", color: "var(--app-green)" }}
                >
                  Validated
                </span>
              )}
            </p>
            <p className="mt-0.5 font-mono text-xs" style={{ color: "var(--app-muted)" }}>
              ••••••••{activeKey.keyHint}
            </p>
            {activeKey.baseUrl && (
              <p className="mt-0.5 text-xs truncate max-w-xs" style={{ color: "var(--app-muted)" }}>
                {activeKey.baseUrl}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDelete(activeKey.id)}
            className="rounded p-1 transition-colors"
            style={{ color: "rgba(255,180,171,0.5)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--app-red)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,180,171,0.5)"
            }}
            aria-label="Remove API key"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : null}

      {!showNew ? (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          style={{
            color: "var(--app-indigo)",
            background: "transparent",
            border: "1px dashed rgba(128,131,255,0.3)",
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium transition-colors active:scale-95"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(128,131,255,0.06)"
            e.currentTarget.style.borderColor = "rgba(128,131,255,0.5)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.borderColor = "rgba(128,131,255,0.3)"
          }}
        >
          <Plus size={13} />
          {activeKey ? "Replace key" : "Add key"}
        </button>
      ) : (
        <div
          style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}
          className="rounded-lg p-4 space-y-3"
        >
          <p
            style={{ color: "var(--app-subtle)" }}
            className="text-xs font-bold uppercase tracking-widest"
          >
            Add BYOK API key
          </p>
          <div className="relative">
            <input
              type={showDraft ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded px-3 py-2.5 text-sm outline-none transition-all font-mono"
              style={{
                background: "var(--app-bg)",
                border: "1px solid var(--app-border)",
                color: "var(--app-fg)",
                paddingRight: "2.5rem",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--app-indigo)"
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--app-border)"
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button
              type="button"
              onClick={() => setShowDraft((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "var(--app-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--app-subtle)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--app-muted)"
              }}
              aria-label={showDraft ? "Hide key" : "Show key"}
            >
              {showDraft ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <div>
            <input
              type="url"
              value={draftBaseUrl}
              onChange={(e) => setDraftBaseUrl(e.target.value)}
              placeholder="OpenRouter URL (optional), e.g. https://openrouter.ai/api/v1"
              className="w-full rounded px-3 py-2.5 text-sm outline-none transition-all"
              style={{
                background: "var(--app-bg)",
                border: "1px solid var(--app-border)",
                color: "var(--app-fg)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--app-indigo)"
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--app-border)"
              }}
            />
            <p className="mt-1 text-[10px]" style={{ color: "var(--app-muted)" }}>
              Leave blank for OpenAI. For OpenRouter, use https://openrouter.ai/api/v1.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft.trim() || saving}
              style={{
                background: saving || !draft.trim() ? "rgba(99,102,241,0.4)" : "#6366f1",
                color: "white",
                border: "1px solid rgba(99,102,241,0.5)",
                boxShadow: "0 0 12px rgba(99,102,241,0.2)",
                opacity: !draft.trim() ? 0.6 : 1,
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg
                    aria-hidden="true"
                    className="animate-spin h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Validating…
                </>
              ) : (
                "Save & Validate"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNew(false)
                setDraft("")
                setDraftBaseUrl("https://openrouter.ai/api/v1")
              }}
              style={{
                color: "var(--app-subtle)",
                background: "transparent",
                border: "1px solid var(--app-border)",
              }}
              className="px-4 py-2.5 rounded text-sm font-medium transition-colors active:scale-95"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--app-fg)"
                e.currentTarget.style.borderColor = "var(--app-muted)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--app-subtle)"
                e.currentTarget.style.borderColor = "var(--app-border)"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type ThemeOption = "dark" | "light" | "system"

function ThemeSelector() {
  const [selected, setSelected] = useState<ThemeOption>(() => {
    const stored = localStorage.getItem("app-theme") as "dark" | "light" | null
    if (!stored) return "system"
    return stored
  })

  function pick(opt: ThemeOption) {
    setSelected(opt)
    if (opt === "system") {
      const osPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
      localStorage.removeItem("app-theme")
      setTheme(osPref)
    } else {
      setTheme(opt)
    }
  }

  const options: {
    value: ThemeOption
    label: string
    description: string
    icon: React.ReactNode
  }[] = [
    {
      value: "light",
      label: "Light",
      description: "Bright interface for daytime",
      icon: <Sun size={16} />,
    },
    {
      value: "dark",
      label: "Dark",
      description: "Dark interface for low light",
      icon: <Moon size={16} />,
    },
    {
      value: "system",
      label: "System",
      description: "Follow device settings",
      icon: <Monitor size={16} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p style={{ color: "var(--app-fg)" }} className="text-sm font-semibold">
          Theme
        </p>
        <p style={{ color: "var(--app-subtle)" }} className="text-xs mt-1">
          Interface appearance — changes apply immediately
        </p>
      </div>

      <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Theme">
        {options.map(({ value, label, description, icon }) => {
          const active = selected === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => pick(value)}
              className="relative group"
            >
              <div
                className="p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer"
                style={{
                  background: active ? "var(--app-indigo-10)" : "var(--app-surface)",
                  borderColor: active ? "var(--app-indigo)" : "var(--app-border)",
                  boxShadow: active ? "0 0 12px rgba(99, 102, 241, 0.2)" : "none",
                }}
              >
                {/* Icon */}
                <div
                  className="mb-3 flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200"
                  style={{
                    background: active ? "var(--app-indigo-20)" : "var(--app-surface-2)",
                    color: active ? "var(--app-indigo)" : "var(--app-muted)",
                  }}
                >
                  {icon}
                </div>

                {/* Label */}
                <h3 style={{ color: "var(--app-fg)" }} className="text-sm font-semibold text-left">
                  {label}
                </h3>

                {/* Description */}
                <p
                  style={{ color: "var(--app-subtle)" }}
                  className="text-xs mt-1 text-left leading-relaxed"
                >
                  {description}
                </p>

                {/* Active indicator */}
                {active && (
                  <div
                    className="absolute top-2 right-2 w-2 h-2 rounded-full"
                    style={{ background: "var(--app-indigo)" }}
                  />
                )}
              </div>
            </button>
          )
        })}
      </fieldset>

      {/* Preview card */}
      <div
        className="rounded-lg border p-4 mt-5"
        style={{
          background: "var(--app-surface-2)",
          border: "1px solid var(--app-border)",
        }}
      >
        <p
          style={{ color: "var(--app-muted)" }}
          className="text-xs font-medium uppercase tracking-wide"
        >
          Preview
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div
            className="h-20 rounded"
            style={{
              background: "var(--app-fg)",
              opacity: 0.15,
            }}
          />
          <div
            className="h-20 rounded"
            style={{
              background: "var(--app-indigo)",
              opacity: 0.15,
            }}
          />
          <div
            className="h-20 rounded"
            style={{
              background: "var(--app-fg)",
              opacity: 0.08,
            }}
          />
        </div>
      </div>
    </div>
  )
}
