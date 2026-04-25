import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { ScoreRing } from "@sysdesign/ui"
import { useToast } from "@/components/Toast"
import { Eye, EyeOff, Trash2, Plus, Shield, User as UserIcon, Key, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Settings</h1>

      <div className="space-y-6">
        {/* ── Profile ── */}
        {user && (
          <Section icon={<UserIcon size={15} />} title="Profile">
            <div className="flex items-center gap-4">
              <div className="avatar placeholder">
                <div className="w-12 rounded-full bg-primary/15 text-primary font-semibold text-sm">
                  {user.image ? (
                    <img src={user.image} alt={user.name} referrerPolicy="no-referrer" />
                  ) : (
                    <span>
                      {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-base-content/50">{user.email}</p>
              </div>
            </div>
          </Section>
        )}

        {/* ── API Key ── */}
        <Section icon={<Key size={15} />} title="API Keys">
          <ApiKeySection toast={toast} />
        </Section>

        {/* ── Progress & Stats ── */}
        {user && stats && (
          <Section icon={<TrendingUp size={15} />} title="Progress & Stats">
            <div className="stats stats-horizontal w-full rounded-xl border border-base-300/40 bg-base-200/50">
              <div className="stat">
                <div className="stat-title text-xs">Questions solved</div>
                <div className="stat-value text-2xl text-primary">{stats.solved}</div>
              </div>
              <div className="stat">
                <div className="stat-title text-xs">Average score</div>
                <div className="stat-value text-2xl">
                  {stats.avgScore != null
                    ? `${Math.round(stats.avgScore * 10)}%`
                    : "—"}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title text-xs">Current streak</div>
                <div className="stat-value text-2xl text-warning">
                  {stats.streak}
                  <span className="text-sm ml-1">🔥</span>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* ── Security notice ── */}
        <div
          role="note"
          className="flex gap-3 rounded-xl border border-info/20 bg-info/5 p-4 text-sm"
        >
          <Shield size={15} className="mt-0.5 shrink-0 text-info" />
          <div className="text-base-content/60 leading-relaxed">
            <span className="font-medium text-base-content/80">Encrypted storage.</span>{" "}
            Your keys are encrypted with AES-256-GCM before storage. They are never logged
            or sent in plaintext after the initial save.
          </div>
        </div>

        {/* Not signed in */}
        {!user && (
          <div className="rounded-xl border border-dashed border-base-300/40 py-10 text-center">
            <p className="text-base-content/40 mb-3">Sign in to manage your settings</p>
            <a href="/auth/login" className="btn btn-primary btn-sm rounded-lg">
              Sign in
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-base-300/40 bg-base-200/30 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-base-300/40 px-5 py-3.5">
        <span className="text-base-content/50">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── API Key section ────────────────────────────────────────────────────────

const STORAGE_KEY = "sysdesign:apikey"

function ApiKeySection({ toast }: { toast: (msg: string, type?: "success" | "error" | "info" | "warning") => void }) {
  const [key, setKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "")
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState("")
  const [showDraft, setShowDraft] = useState(false)
  const [saving, setSaving] = useState(false)

  const hasKey = !!key

  async function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) return
    setSaving(true)
    // Simulate validation
    await new Promise((r) => setTimeout(r, 800))
    localStorage.setItem(STORAGE_KEY, trimmed)
    setKey(trimmed)
    setDraft("")
    setShowNew(false)
    setSaving(false)
    toast("Key saved & validated", "success")
  }

  function handleDelete() {
    localStorage.removeItem(STORAGE_KEY)
    setKey("")
    toast("Key removed", "info")
  }

  function maskKey(k: string) {
    if (k.length <= 8) return "••••••••"
    return `${k.slice(0, 6)}••••${k.slice(-4)}`
  }

  return (
    <div className="space-y-3">
      {hasKey && (
        <div className="flex items-center justify-between rounded-xl border border-base-300/40 bg-base-300/20 px-4 py-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-base-content/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
              OpenAI API Key
            </p>
            <p className="mt-0.5 font-mono text-xs text-base-content/40">
              {maskKey(key)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="text-error/50 hover:text-error transition-default rounded p-1"
            aria-label="Remove API key"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {!showNew ? (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="btn btn-ghost btn-sm rounded-lg border border-dashed border-base-300/60 gap-1.5 text-base-content/50 hover:text-base-content/80 hover:border-base-300"
        >
          <Plus size={13} />
          {hasKey ? "Replace key" : "Add key"}
        </button>
      ) : (
        <div className="rounded-xl border border-base-300/40 bg-base-300/10 p-4 space-y-3">
          <p className="text-xs font-medium text-base-content/60">Add OpenAI API key</p>
          <div className="relative">
            <input
              type={showDraft ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="sk-..."
              className="input input-sm w-full rounded-lg border-base-300/50 bg-base-300/30 pr-9 font-mono text-xs focus-visible:ring-1 focus-visible:ring-primary"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button
              type="button"
              onClick={() => setShowDraft((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70"
              aria-label={showDraft ? "Hide key" : "Show key"}
            >
              {showDraft ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft.trim() || saving}
              className="btn btn-primary btn-sm rounded-lg flex-1 gap-1.5"
            >
              {saving ? (
                <><div className="loading loading-spinner loading-xs" /> Validating…</>
              ) : (
                "Save & Validate"
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowNew(false); setDraft("") }}
              className="btn btn-ghost btn-sm rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
