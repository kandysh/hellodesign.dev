import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { useToast } from "@/components/Toast"
import {
  Eye, EyeOff, Trash2, Plus, Shield, User as UserIcon,
  Key, AlertTriangle, LogIn, Moon,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

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

  const { data: session } = useQuery<{ user: SessionUser } | null>({
    queryKey: ["session"],
    queryFn: () =>
      fetch(`${API}/api/auth/get-session`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
  })

  const { data: stats } = useQuery<Stats>({
    queryKey: ["me/stats"],
    queryFn: () =>
      fetch(`${API}/api/me/stats`, { credentials: "include" }).then((r) =>
        r.json(),
      ),
    enabled: !!session?.user,
  })

  const user = session?.user ?? null

  function handleSignOut() {
    fetch(`${API}/api/auth/sign-out`, { method: "POST", credentials: "include" })
      .finally(() => { window.location.href = "/" })
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1
        style={{ color: "#dae2fd", letterSpacing: "-0.02em" }}
        className="mb-8 text-2xl font-extrabold"
      >
        Settings
      </h1>

      {user ? (
        <>
          {/* ── Account Profile ── */}
          <SectionCard
            icon={<UserIcon size={15} style={{ color: "#8083ff" }} />}
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
                  border: "1px solid rgba(192,193,255,0.2)",
                  color: "#c0c1ff",
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
                <p style={{ color: "#dae2fd" }} className="font-semibold text-sm">
                  {user.name}
                </p>
                <p style={{ color: "#908fa0" }} className="text-xs">
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
                  val: stats?.avgScore != null
                    ? `${Math.round(stats.avgScore * 10)}%`
                    : undefined,
                },
                { label: "Streak", val: stats?.streak },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{ background: "#131b2e", border: "1px solid #2d3449" }}
                  className="rounded-lg px-4 py-3 text-center"
                >
                  <p
                    style={{ color: "#c0c1ff", fontFamily: "'Space Grotesk', monospace" }}
                    className="text-xl font-bold"
                  >
                    {s.val ?? "—"}
                  </p>
                  <p style={{ color: "#464554" }} className="text-xs mt-0.5">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── API Keys ── */}
          <SectionCard
            icon={<Key size={15} style={{ color: "#8083ff" }} />}
            title="API Keys"
            subtitle="Manage your OpenAI integration key"
          >
            <ApiKeySection toast={toast} />
          </SectionCard>

          {/* ── Workspace Preferences ── */}
          <SectionCard
            icon={<Moon size={15} style={{ color: "#8083ff" }} />}
            title="Workspace Preferences"
            subtitle="Appearance and interface settings"
          >
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: "#dae2fd" }} className="text-sm font-medium">
                  Theme
                </p>
                <p style={{ color: "#908fa0" }} className="text-xs mt-0.5">
                  Interface appearance
                </p>
              </div>
              <div
                style={{ background: "#131b2e", border: "1px solid #2d3449" }}
                className="flex items-center rounded-lg p-1 gap-1 text-xs"
              >
                <span
                  style={{ background: "#222a3d", color: "#dae2fd" }}
                  className="px-3 py-1.5 rounded font-medium"
                >
                  Dark
                </span>
                <span style={{ color: "#464554" }} className="px-3 py-1.5">
                  Light
                </span>
              </div>
            </div>
          </SectionCard>

          {/* ── Security notice ── */}
          <div
            role="note"
            style={{ background: "rgba(128,131,255,0.05)", border: "1px solid rgba(128,131,255,0.15)" }}
            className="flex gap-3 rounded-xl p-4 text-sm mb-4"
          >
            <Shield size={15} className="mt-0.5 shrink-0" style={{ color: "#8083ff" }} />
            <div style={{ color: "#908fa0" }} className="leading-relaxed">
              <span style={{ color: "#c7c4d7" }} className="font-medium">
                Encrypted storage.
              </span>{" "}
              Your keys are encrypted with AES-256-GCM before storage. They are never
              logged or sent in plaintext after the initial save.
            </div>
          </div>

          {/* ── Danger Zone ── */}
          <div
            style={{
              background: "#171f33",
              border: "1px solid rgba(255,180,171,0.2)",
            }}
            className="rounded-xl overflow-hidden mb-4"
          >
            <div
              style={{ borderBottom: "1px solid rgba(255,180,171,0.15)" }}
              className="px-6 py-4"
            >
              <h2
                style={{ color: "#ffb4ab" }}
                className="text-base font-bold flex items-center gap-2"
              >
                <AlertTriangle size={15} />
                Danger Zone
              </h2>
            </div>
            <div className="px-6 py-5 flex items-center justify-between">
              <div>
                <p style={{ color: "#dae2fd" }} className="text-sm font-medium">
                  Sign out everywhere
                </p>
                <p style={{ color: "#908fa0" }} className="text-xs mt-0.5">
                  Revoke all active sessions
                </p>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  color: "#ffb4ab",
                  background: "rgba(255,180,171,0.08)",
                  border: "1px solid rgba(255,180,171,0.3)",
                }}
                className="px-4 py-2 rounded text-sm font-medium hover:bg-red-900/20 transition-colors active:scale-95"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── Guest: Sync CTA ── */}
          <div
            style={{
              background: "#171f33",
              border: "1px solid rgba(128,131,255,0.2)",
            }}
            className="rounded-xl p-10 text-center mb-4"
          >
            <div
              style={{
                background: "rgba(128,131,255,0.1)",
                color: "#8083ff",
                width: 48,
                height: 48,
              }}
              className="rounded-full mx-auto mb-4 flex items-center justify-center"
            >
              <LogIn size={20} />
            </div>
            <h2 style={{ color: "#dae2fd" }} className="text-xl font-bold mb-2">
              Sync Your Workflow
            </h2>
            <p style={{ color: "#908fa0" }} className="text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Sign in to save your API keys, track progress, and access your submissions
              from any device.
            </p>
            <Link
              to="/auth/login"
              style={{
                background: "#6366f1",
                color: "white",
                boxShadow: "0 0 12px rgba(99,102,241,0.3)",
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-semibold hover:bg-indigo-500 transition-colors active:scale-95"
            >
              Sign In to Sync
            </Link>
          </div>

          {/* ── Guest API Keys ── */}
          <SectionCard
            icon={<Key size={15} style={{ color: "#8083ff" }} />}
            title="API Keys"
            subtitle="Your key is stored locally in this browser"
          >
            <ApiKeySection toast={toast} />
          </SectionCard>

          {/* ── Security notice ── */}
          <div
            role="note"
            style={{ background: "rgba(128,131,255,0.05)", border: "1px solid rgba(128,131,255,0.15)" }}
            className="flex gap-3 rounded-xl p-4 text-sm"
          >
            <Shield size={15} className="mt-0.5 shrink-0" style={{ color: "#8083ff" }} />
            <div style={{ color: "#908fa0" }} className="leading-relaxed">
              <span style={{ color: "#c7c4d7" }} className="font-medium">
                Encrypted storage.
              </span>{" "}
              Your keys are encrypted with AES-256-GCM before storage. They are never
              logged or sent in plaintext after the initial save.
            </div>
          </div>
        </>
      )}
    </div>
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
      style={{ background: "#171f33", border: "1px solid #2d3449" }}
      className="rounded-xl overflow-hidden mb-4"
    >
      <div
        style={{ background: "#131b2e", borderBottom: "1px solid #2d3449" }}
        className="px-6 py-4"
      >
        <h2
          style={{ color: "#dae2fd" }}
          className="text-base font-bold flex items-center gap-2"
        >
          {icon}
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: "#908fa0" }} className="text-xs mt-0.5">
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

interface StoredKey { id: string; provider: string; keyHint: string; baseUrl?: string | null; validatedAt: string | null }

function ApiKeySection({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error" | "info" | "warning") => void
}) {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState("")
  const [draftBaseUrl, setDraftBaseUrl] = useState("")
  const [showDraft, setShowDraft] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: keys = [], isLoading: keysLoading } = useQuery<StoredKey[]>({
    queryKey: ["api-keys"],
    queryFn: () =>
      fetch(`${API}/api/keys`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
  })

  const activeKey = keys[0] ?? null

  // Keep localStorage in sync so useApiKey() UI-gating works
  useEffect(() => {
    if (activeKey) {
      localStorage.setItem(STORAGE_KEY, `****${activeKey.keyHint}`)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [activeKey])

  async function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider: "openai",
          key: trimmed,
          baseUrl: draftBaseUrl.trim() || undefined,
          validate: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error((err as { error?: string }).error ?? "Failed to save key")
      }
      const saved = await res.json() as { keyHint: string }
      // Store only masked hint in localStorage for UI gating, not the actual key
      localStorage.setItem(STORAGE_KEY, `****${saved.keyHint}`)
      await qc.invalidateQueries({ queryKey: ["api-keys"] })
      setDraft("")
      setDraftBaseUrl("")
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
      const res = await fetch(`${API}/api/keys/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("Failed to delete key")
      localStorage.removeItem(STORAGE_KEY)
      await qc.invalidateQueries({ queryKey: ["api-keys"] })
      toast("Key removed", "info")
    } catch (err) {
      toast((err as Error).message, "error")
    }
  }

  return (
    <div className="space-y-3">
      {keysLoading ? (
        <div className="animate-pulse h-12 rounded-lg" style={{ background: "#1e2a3d" }} />
      ) : activeKey ? (
        <div
          style={{ background: "#131b2e", border: "1px solid #2d3449" }}
          className="flex items-center justify-between rounded-lg px-4 py-3"
        >
          <div>
            <p className="flex items-center gap-2 text-xs font-medium" style={{ color: "#908fa0" }}>
              <span style={{ background: "#4edea3" }} className="inline-block h-1.5 w-1.5 rounded-full" />
              OpenAI API Key
              {activeKey.validatedAt && (
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(78,222,163,0.1)", color: "#4edea3" }}>
                  Validated
                </span>
              )}
            </p>
            <p className="mt-0.5 font-mono text-xs" style={{ color: "#464554" }}>
              ••••••••{activeKey.keyHint}
            </p>
            {activeKey.baseUrl && (
              <p className="mt-0.5 text-xs truncate max-w-xs" style={{ color: "#464554" }}>
                {activeKey.baseUrl}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDelete(activeKey.id)}
            className="rounded p-1 transition-colors"
            style={{ color: "rgba(255,180,171,0.5)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ffb4ab" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,180,171,0.5)" }}
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
          style={{ color: "#8083ff", background: "transparent", border: "1px dashed rgba(128,131,255,0.3)" }}
          className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium transition-colors active:scale-95"
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(128,131,255,0.06)"; e.currentTarget.style.borderColor = "rgba(128,131,255,0.5)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(128,131,255,0.3)" }}
        >
          <Plus size={13} />
          {activeKey ? "Replace key" : "Add key"}
        </button>
      ) : (
        <div style={{ background: "#131b2e", border: "1px solid #2d3449" }} className="rounded-lg p-4 space-y-3">
          <p style={{ color: "#908fa0" }} className="text-xs font-bold uppercase tracking-widest">Add OpenAI API key</p>
          <div className="relative">
            <input
              type={showDraft ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded px-3 py-2.5 text-sm outline-none transition-all font-mono"
              style={{ background: "#0b1326", border: "1px solid #2d3449", color: "#dae2fd", paddingRight: "2.5rem" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#8083ff" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449" }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button
              type="button"
              onClick={() => setShowDraft((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "#464554" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#908fa0" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#464554" }}
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
              placeholder="API base URL (optional) — e.g. https://openrouter.ai/api/v1"
              className="w-full rounded px-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: "#0b1326", border: "1px solid #2d3449", color: "#dae2fd" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#8083ff" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449" }}
            />
            <p className="mt-1 text-[10px]" style={{ color: "#464554" }}>
              Leave blank to use the default OpenAI endpoint.
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
                  <svg aria-label="Validating" className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Validating…
                </>
              ) : "Save & Validate"}
            </button>
            <button
              type="button"
              onClick={() => { setShowNew(false); setDraft(""); setDraftBaseUrl("") }}
              style={{ color: "#908fa0", background: "transparent", border: "1px solid #2d3449" }}
              className="px-4 py-2.5 rounded text-sm font-medium transition-colors active:scale-95"
              onMouseEnter={(e) => { e.currentTarget.style.color = "#dae2fd"; e.currentTarget.style.borderColor = "#464554" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#908fa0"; e.currentTarget.style.borderColor = "#2d3449" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
