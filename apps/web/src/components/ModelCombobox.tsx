import { useQuery } from "@tanstack/react-query"
import { ChevronDown, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface OpenRouterModel {
  id: string
  name: string
}

const STYLE = {
  bg: "#131b2e",
  border: "1px solid #2d3449",
  color: "#8083ff",
  hoverBg: "#1a2540",
  groupColor: "#4a5080",
} as const

const API = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3001"

async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const res = await fetch(`${API}/api/models`)
  if (!res.ok) throw new Error("Failed to fetch models")
  return res.json()
}

function groupByProvider(models: OpenRouterModel[]): Map<string, OpenRouterModel[]> {
  const groups = new Map<string, OpenRouterModel[]>()
  for (const m of models) {
    const provider = m.id.split("/")[0] ?? m.id
    if (!groups.has(provider)) groups.set(provider, [])
    groups.get(provider)!.push(m)
  }
  return groups
}

interface ModelComboboxProps {
  value: string
  onChange: (value: string) => void
  providers?: string[]
}

export function ModelCombobox({ value, onChange, providers }: ModelComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: models, isLoading } = useQuery({
    queryKey: ["openrouter-models"],
    queryFn: fetchOpenRouterModels,
    staleTime: 1000 * 60 * 30, // 30 min
    gcTime: 1000 * 60 * 60,
  })

  // Keep query in sync when value changes externally
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const filtered = models
    ? models.filter((m) => {
        const providerMatch = providers
          ? providers.some((p) => m.id.startsWith(p + "/"))
          : true
        const queryMatch =
          m.id.toLowerCase().includes(query.toLowerCase()) ||
          m.name.toLowerCase().includes(query.toLowerCase())
        return providerMatch && queryMatch
      })
    : []

  const grouped = groupByProvider(filtered)

  function select(modelId: string) {
    onChange(modelId)
    setQuery(modelId)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <input
        type="text"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        placeholder="provider/model-id"
        className="input input-xs rounded-lg text-xs pr-6"
        style={{
          background: STYLE.bg,
          border: STYLE.border,
          color: STYLE.color,
          width: 190,
          paddingRight: 24,
        }}
        title="Model"
      />
      <span
        style={{
          position: "absolute",
          right: 6,
          pointerEvents: "none",
          color: STYLE.groupColor,
          display: "flex",
          alignItems: "center",
        }}
      >
        {isLoading ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <ChevronDown size={11} />
        )}
      </span>

      {open && createPortal(
        <DropdownList
          containerRef={containerRef}
          isLoading={isLoading}
          filtered={filtered}
          grouped={grouped}
          value={value}
          query={query}
          onSelect={select}
          onClose={() => setOpen(false)}
        />,
        document.body,
      )}
    </div>
  )
}

interface DropdownListProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  isLoading: boolean
  filtered: OpenRouterModel[]
  grouped: Map<string, OpenRouterModel[]>
  value: string
  query: string
  onSelect: (id: string) => void
  onClose: () => void
}

function DropdownList({ containerRef, isLoading, filtered, grouped, value, query, onSelect, onClose }: DropdownListProps) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const dropdownHeight = 320
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow
    setPos({
      top: openUpward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [containerRef])

  if (!pos) return null

  return (
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 99999,
        background: STYLE.bg,
        border: STYLE.border,
        borderRadius: 8,
        width: 300,
        maxHeight: 320,
        overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      {isLoading && (
        <div style={{ padding: "10px 12px", color: STYLE.groupColor, fontSize: 11 }}>
          Loading models…
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <div style={{ padding: "10px 12px", color: STYLE.groupColor, fontSize: 11 }}>
          No matches — will use "{query}"
        </div>
      )}
      {Array.from(grouped.entries()).map(([provider, providerModels]) => (
        <div key={provider}>
          <div
            style={{
              padding: "6px 12px 2px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: STYLE.groupColor,
              borderTop: "1px solid #2d3449",
            }}
          >
            {provider}
          </div>
          {providerModels.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(m.id)
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "5px 12px",
                fontSize: 11,
                color: m.id === value ? "#fff" : STYLE.color,
                background: m.id === value ? "#1e2d50" : "transparent",
                cursor: "pointer",
                border: "none",
                outline: "none",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = STYLE.hoverBg)
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  m.id === value ? "#1e2d50" : "transparent")
              }
            >
              <span style={{ opacity: 0.8 }}>{m.id.split("/")[1] ?? m.id}</span>
              <span style={{ opacity: 0.45, fontSize: 10, marginLeft: 6 }}>
                {m.name.replace(/^[^:]+:\s*/, "")}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
