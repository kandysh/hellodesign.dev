import { useQuery } from "@tanstack/react-query"
import { Check, ChevronDown, Cpu, Loader2, Search, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface OpenRouterModel {
  id: string
  name: string
}

const CATEGORIES = [
  { id: "intelligence-high-to-low", label: "Reasoning", detail: "Intelligence benchmark" },
  { id: "coding-high-to-low", label: "Coding", detail: "Coding benchmark" },
  { id: "agentic-high-to-low", label: "Agentic", detail: "Agentic benchmark" },
  { id: "design-arena-elo-high-to-low", label: "Arena", detail: "Design Arena ELO" },
  { id: "most-popular", label: "Popular", detail: "OpenRouter usage" },
] as const

type SortId = (typeof CATEGORIES)[number]["id"]
const API = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3001"

async function fetchModels(sort: SortId): Promise<OpenRouterModel[]> {
  const res = await fetch(`${API}/api/models?sort=${encodeURIComponent(sort)}`, { credentials: "include" })
  if (!res.ok) throw new Error("Model recommendations are unavailable")
  return res.json()
}

interface ModelComboboxProps {
  value: string
  onChange: (value: string) => void
}

export function ModelCombobox({ value, onChange }: ModelComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortId>(CATEGORIES[0].id)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const activeCategory = CATEGORIES.find((category) => category.id === sort) ?? CATEGORIES[0]

  const { data: models, isLoading, isError } = useQuery({
    queryKey: ["openrouter-models", sort],
    queryFn: () => fetchModels(sort),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!containerRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener("mousedown", closeOutside)
    return () => document.removeEventListener("mousedown", closeOutside)
  }, [open])

  const filtered = models?.filter((model) => {
    return `${model.name} ${model.id}`.toLowerCase().includes(query.trim().toLowerCase())
  }) ?? []

  function choose(modelId: string) {
    onChange(modelId)
    setQuery("")
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((current) => !current); setQuery("") }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`Model: ${value}`}
        className="flex h-9 max-w-[190px] items-center gap-2 rounded-xl border px-2.5 text-left transition hover:border-indigo-400/50"
        style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", color: "var(--app-text)" }}
      >
        <Cpu size={14} className="shrink-0" style={{ color: "var(--app-indigo)" }} />
        <span className="min-w-0 flex-1 truncate text-[11px]">{value || "Choose model"}</span>
        <ChevronDown size={13} className="shrink-0" style={{ color: "var(--app-muted)" }} />
      </button>

      {open && createPortal(
        <ModelPopover
          containerRef={containerRef}
          popoverRef={popoverRef}
          sort={sort}
          activeCategory={activeCategory}
          query={query}
          value={value}
          models={filtered}
          isLoading={isLoading}
          isError={isError}
          onSortChange={setSort}
          onQueryChange={setQuery}
          onChoose={choose}
        />,
        document.body,
      )}
    </div>
  )
}

interface ModelPopoverProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  popoverRef: React.RefObject<HTMLDivElement | null>
  sort: SortId
  activeCategory: (typeof CATEGORIES)[number]
  query: string
  value: string
  models: OpenRouterModel[]
  isLoading: boolean
  isError: boolean
  onSortChange: (sort: SortId) => void
  onQueryChange: (query: string) => void
  onChoose: (modelId: string) => void
}

function ModelPopover({ containerRef, popoverRef, sort, activeCategory, query, value, models, isLoading, isError, onSortChange, onQueryChange, onChoose }: ModelPopoverProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(360, window.innerWidth - 24)
      const height = 390
      const top = Math.max(12, rect.top > height + 12 ? rect.top - height - 8 : Math.min(rect.bottom + 8, window.innerHeight - height - 12))
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
      setPosition({ top, left })
    }
    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [containerRef])

  if (!position) return null

  const exactModel = models.find((model) => model.id.toLowerCase() === query.trim().toLowerCase())
  const canUseCustom = query.trim().length > 0 && !exactModel

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Choose a model"
      className="fixed z-[99999] flex max-h-[390px] flex-col overflow-hidden rounded-2xl border shadow-2xl"
      style={{ top: position.top, left: position.left, width: "min(360px, calc(100vw - 24px))", background: "var(--app-surface)", borderColor: "var(--app-border)", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}
    >
      <div className="border-b p-3" style={{ borderColor: "var(--app-border)" }}>
        <div className="flex items-center gap-2 rounded-xl border px-3" style={{ background: "var(--app-bg)", borderColor: "var(--app-border)" }}>
          <Search size={14} style={{ color: "var(--app-muted)" }} />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && query.trim()) onChoose(exactModel?.id ?? query.trim()) }}
            placeholder="Search recommendations or enter a model ID"
            aria-label="Search models or enter model ID"
            className="h-10 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:opacity-60"
            style={{ color: "var(--app-text)" }}
          />
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onSortChange(category.id)}
              aria-pressed={sort === category.id}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition"
              style={{ color: sort === category.id ? "white" : "var(--app-muted)", background: sort === category.id ? "var(--app-indigo)" : "transparent" }}
            >
              {category.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px]" style={{ color: "var(--app-muted)" }}>
          <Sparkles size={11} style={{ color: "var(--app-indigo)" }} />
          <span>Top 20 · {activeCategory.detail} · external benchmark</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {isLoading && <div className="flex items-center gap-2 px-3 py-5 text-xs" style={{ color: "var(--app-muted)" }}><Loader2 size={14} className="animate-spin" /> Loading top recommendations…</div>}
        {isError && <div className="px-3 py-4 text-xs leading-5" style={{ color: "var(--app-muted)" }}>Couldn’t load recommendations. Set an OpenRouter key in Settings, or enter a model ID above.</div>}
        {!isLoading && !isError && models.length === 0 && <div className="px-3 py-4 text-xs" style={{ color: "var(--app-muted)" }}>No recommendations match this search.</div>}
        {!isLoading && !isError && models.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onChoose(model.id)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            style={{ color: "var(--app-text)" }}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{model.name}</span>
              <span className="mt-0.5 block truncate font-mono text-[10px]" style={{ color: "var(--app-muted)" }}>{model.id}</span>
            </span>
            {model.id === value && <Check size={14} className="shrink-0" style={{ color: "var(--app-indigo)" }} />}
          </button>
        ))}
        {canUseCustom && (
          <button
            type="button"
            onClick={() => onChoose(query.trim())}
            className="mt-1 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition hover:bg-white/5"
            style={{ color: "var(--app-indigo)", borderColor: "var(--app-border)" }}
          >
            <Cpu size={14} className="shrink-0" /> <span className="shrink-0">Use custom model ID</span> <span className="min-w-0 flex-1 truncate font-mono">{query.trim()}</span>
          </button>
        )}
      </div>
    </div>
  )
}
