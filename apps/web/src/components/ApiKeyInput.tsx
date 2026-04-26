import { useState, useEffect, useCallback } from "react"
import { Eye, EyeOff, Pencil, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "sysdesign:apikey"

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••"
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

interface ApiKeyInputProps {
  className?: string
  onKeyChange?: (key: string | null) => void
}

export function ApiKeyInput({ className, onKeyChange }: ApiKeyInputProps) {
  const [key, setKey] = useState<string>("")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [showValue, setShowValue] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? ""
    setKey(stored)
    onKeyChange?.(stored || null)
  }, [onKeyChange])

  const handleSave = useCallback(() => {
    const trimmed = draft.trim()
    setKey(trimmed)
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    onKeyChange?.(trimmed || null)
    setEditing(false)
    setShowValue(false)
  }, [draft, onKeyChange])

  const handleEdit = () => {
    setDraft(key)
    setEditing(true)
  }

  const isSet = !!key

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-base-content/60 uppercase tracking-wide">
          OpenAI API Key
        </p>
        {isSet && (
          <span className="flex items-center gap-1 text-xs text-success">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
            Ready
          </span>
        )}
      </div>

      {editing ? (
        <div className="flex gap-1">
          <div className="relative flex-1">
            <input
              type={showValue ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="sk-..."
              className="input input-sm w-full rounded-lg border-base-300/50 bg-base-300/30 pr-8 font-mono text-xs focus-visible:ring-1 focus-visible:ring-primary"
              // biome-ignore lint/a11y/noAutofocus: intentional focus on edit
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowValue((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
              aria-label={showValue ? "Hide key" : "Show key"}
            >
              {showValue ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-xs btn-primary rounded-lg"
            aria-label="Save key"
          >
            <Check size={12} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-base-300/50 bg-base-300/20 px-3 py-2">
          {isSet ? (
            <>
              <span className="flex-1 font-mono text-xs text-base-content/60">
                {maskKey(key)}
              </span>
              <button
                type="button"
                onClick={handleEdit}
                className="text-base-content/40 hover:text-base-content transition-default"
                aria-label="Edit API key"
              >
                <Pencil size={11} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEdit}
              className="flex-1 text-left text-xs text-base-content/40 hover:text-base-content/60 transition-default"
            >
              Click to add your OpenAI API key…
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function useApiKey(): string | null {
  const [key, setKey] = useState<string | null>(null)
  useEffect(() => {
    setKey(localStorage.getItem(STORAGE_KEY))
  }, [])
  return key
}
