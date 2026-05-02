import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Info,
  Layers,
  ListTodo,
  Lock,
  Map,
  Square,
  Unlock,
  X,
  Zap,
} from "lucide-react"
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AgentPanel, type AgentPanelState, type Message } from "@/components/AgentPanel"
import { useApiKey } from "@/components/ApiKeyInput"
import { CodeEditor } from "@/components/CodeEditor"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { ModelCombobox } from "@/components/ModelCombobox"
import { useToast } from "@/components/Toast"
import { useTheme } from "@/hooks/useTheme"
import { questionQueryOptions } from "@/lib/queries/questions"
import { cn } from "@/lib/utils"

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
)

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"
const WS_API = API.replace(/^http/, "ws")

const EXCALIDRAW_UI_OPTIONS = { canvasActions: { export: false } } as const

const EDITOR_PLACEHOLDER = `/*
 * Walk through your design step by step:
 *
 * 1. Clarify requirements (functional + non-functional)
 * 2. Capacity estimation (QPS, storage, bandwidth)
 * 3. High-level architecture
 * 4. Data model & database choice
 * 5. API design
 * 6. Scalability, caching, bottlenecks
 */
`

const CHECKLIST_ITEMS = [
  "Functional requirements",
  "Scale estimates",
  "Core components",
  "Data model",
  "API design",
  "Bottlenecks & trade-offs",
]

export const Route = createFileRoute("/questions/$questionId")({
  loader: ({ context: { queryClient }, params: { questionId } }) =>
    queryClient.prefetchQuery(questionQueryOptions(questionId)),
  component: WorkspacePage,
})

function useElapsedTimer() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function WorkspacePage() {
  const { questionId } = Route.useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { theme } = useTheme()
  const apiKey = useApiKey()
  const elapsed = useElapsedTimer()

  // Panel state
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<"overview" | "checklist">("overview")
  const [hintsOpen, setHintsOpen] = useState(false)
  const [checklist, setChecklist] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"diagram" | "code">("code")
  const [reviewMode, setReviewMode] = useState<"quick" | "deep">("quick")
  const [mood, setMood] = useState<"pragmatist" | "systems" | "sre" | "pm">("pragmatist")
  const [modelName, setModelName] = useState("openai/gpt-oss-20b:nitro")
  const [modelOverridden, setModelOverridden] = useState(false)
  const [apiBannerDismissed, setApiBannerDismissed] = useState(false)

  // Content state
  const [answerCode, setAnswerCode] = useState("")
  const [excalidrawData, setExcalidrawData] = useState<Record<string, unknown> | null>(null)
  const [hasExcalidrawElements, setHasExcalidrawElements] = useState(false)
  // Track if diagram tab has ever been visited so we mount Excalidraw lazily
  const [diagramMounted, setDiagramMounted] = useState(false)

  const handleExcalidrawChange = useCallback(
    (elements: unknown, appState: unknown) => {
      setExcalidrawData({ elements, appState })
      setHasExcalidrawElements(Array.isArray(elements) && elements.length > 0)
    },
    [],
  )

  // Agent panel state
  const [agentVisible, setAgentVisible] = useState(false)
  const [agentState, setAgentState] = useState<AgentPanelState>({ phase: "idle" })
  const [agentMessages, setAgentMessages] = useState<Message[]>([])
  const [riskFlags, setRiskFlags] = useState<Array<{ component: string; risk: string; severity: "critical" | "high" | "medium" }>>([])
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  // Buffer for accumulating rapid reasoning token chunks before flushing to trace
  const reasoningBufRef = useRef("")
  const reasoningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: question, isLoading } = useQuery(questionQueryOptions(questionId))

  // Word count derived from editor
  const wordCount = answerCode.trim() ? answerCode.trim().split(/\s+/).length : 0
  const checklistProgress = checklist.size
  const checklistTotal = CHECKLIST_ITEMS.length

  function toggleChecklist(item: string) {
    setChecklist((prev) => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          questionId,
          answerText: answerCode,
          excalidrawData: (excalidrawData as any)?.elements ?? [],
          agentType: reviewMode,
          mood,
          modelName,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to submit")
      }
      return res.json() as Promise<{ submissionId: string }>
    },
    onSuccess: ({ submissionId }) => {
      setCurrentSubmissionId(submissionId)
      setAgentVisible(true)
      setAgentState({ phase: "processing", trace: [] })
      setAgentMessages([])
      setRiskFlags([])
      toast("Submission received — agent is reading your answer", "success")

      // Open WebSocket stream
      const ws = new WebSocket(`${WS_API}/api/submissions/${submissionId}/ws`)
      wsRef.current = ws

      const cleanupReasoningBuf = () => {
        if (reasoningTimerRef.current) {
          clearTimeout(reasoningTimerRef.current)
          reasoningTimerRef.current = null
        }
        reasoningBufRef.current = ""
      }

      ws.onmessage = (e) => {
        const ev = JSON.parse(e.data)
        switch (ev.type) {
          case "ping":
          case "submission_status":
            break

          case "reasoning": {
            const content = ev.content ?? ev.line ?? ""
            if (!content) break
            // Accumulate rapid token chunks and flush after 100ms of silence
            reasoningBufRef.current += content
            if (reasoningTimerRef.current) clearTimeout(reasoningTimerRef.current)
            reasoningTimerRef.current = setTimeout(() => {
              const line = reasoningBufRef.current.trim()
              reasoningBufRef.current = ""
              if (!line) return
              setAgentState((prev) => {
                if (prev.phase === "processing" || prev.phase === "follow-up") {
                  return { ...prev, trace: [...(prev.trace ?? []), line] }
                }
                return prev
              })
            }, 100)
            break
          }

          case "agent_flow": {
            const flowLine = `→ ${ev.step ?? "Agent progress"}${ev.details ? ` (${JSON.stringify(ev.details)})` : ""}`
            setAgentState((prev) => {
              if (prev.phase === "processing" || prev.phase === "follow-up") {
                return { ...prev, trace: [...(prev.trace ?? []), flowLine] }
              }
              return prev
            })
            break
          }

          case "followup": {
            const q = ev.question ?? ev.content ?? ""
            setAgentState((prev) => ({
              phase: "follow-up",
              question: q,
              trace: prev.phase === "processing" || prev.phase === "follow-up" ? prev.trace : [],
            }))
            setAgentMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: "agent", content: q, timestamp: new Date() },
            ])
            break
          }

          case "user_reply":
            setAgentState((prev) => {
              if (prev.phase === "follow-up") {
                return { phase: "processing", trace: prev.trace ?? [] }
              }
              return prev
            })
            break

          case "eval_start":
            setAgentState({
              phase: "evaluating",
              agentResults: [],
              dimensionLabels: ev.dimensions?.map((id: string) => ev.dimensionLabels?.[id] ?? id) ?? [],
            })
            break

          case "eval_progress":
            setAgentState((prev) => {
              if (prev.phase === "evaluating") {
                return { phase: "evaluating", agentResults: [...prev.agentResults, ev], dimensionLabels: prev.dimensionLabels }
              }
              return prev
            })
            break

          case "eval_done":
            cleanupReasoningBuf()
            setAgentState((prev) => ({
              phase: "done",
              submissionId,
              agentResults: prev.phase === "evaluating" ? prev.agentResults : [],
              dimensionLabels: prev.phase === "evaluating" ? prev.dimensionLabels : [],
            }))
            ws.close()
            wsRef.current = null
            break

          case "risk_flag":
            setRiskFlags((prev) => [
              ...prev,
              { component: ev.component, risk: ev.risk, severity: ev.severity },
            ])
            break

          case "error":
            cleanupReasoningBuf()
            toast(ev.message ?? "Evaluation failed", "error")
            ws.close()
            wsRef.current = null
            setAgentState({ phase: "idle" })
            break
        }
      }

      ws.onclose = () => {
        wsRef.current = null
      }

      ws.onerror = () => {
        if (wsRef.current) {
          cleanupReasoningBuf()
          toast("Lost connection to agent", "error")
          setAgentState({ phase: "idle" })
        }
        ws.close()
        wsRef.current = null
      }
    },
    onError: (err: Error) => {
      toast(err.message, "error")
    },
  })

  // ── Draft auto-save ──────────────────────────────────────────
  const draftKey = `workspace_draft_${questionId}`
  const [draftRestored, setDraftRestored] = useState(false)

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const { code, checklist: savedChecklist, savedAt } = JSON.parse(raw)
      if (code) setAnswerCode(code)
      if (Array.isArray(savedChecklist)) setChecklist(new Set(savedChecklist))
      const mins = Math.round((Date.now() - savedAt) / 60000)
      if (code?.trim().length > 0) setDraftRestored(mins <= 10080) // show if < 1 week old
    } catch { /* ignore corrupt data */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  // Auto-save every 30s when there's content
  useEffect(() => {
    if (!answerCode.trim()) return
    const id = setInterval(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          code: answerCode,
          checklist: [...checklist],
          savedAt: Date.now(),
        }))
      } catch { /* ignore quota errors */ }
    }, 30_000)
    return () => clearInterval(id)
  }, [answerCode, checklist, draftKey])

  function clearDraft() {
    localStorage.removeItem(draftKey)
    setAnswerCode("")
    setChecklist(new Set())
    setDraftRestored(false)
  }

  // ── Cleanup WebSocket and buffering on unmount ───────────────
  useEffect(() => {
    return () => {
      wsRef.current?.close()
      if (reasoningTimerRef.current) clearTimeout(reasoningTimerRef.current)
    }
  }, [])

  const MODE_DEFAULTS: Record<"quick" | "deep", string> = {
    quick: "openai/gpt-oss-20b:nitro",
    deep: "deepseek/deepseek-v3.2",
  }

  // Auto-switch model to mode default unless user manually overrode it
  useEffect(() => {
    if (!modelOverridden) setModelName(MODE_DEFAULTS[reviewMode])
  }, [reviewMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // canSubmit must be declared before the keyboard shortcut useEffect
  // so the dep array can evaluate it without TDZ error
  const canSubmit = answerCode.trim().length > 20 && checklistProgress > 0

  // ── Keyboard shortcut: Cmd/Ctrl+Enter → submit ────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (canSubmit && !submitMutation.isPending && !submitMutation.isSuccess) {
          submitMutation.mutate()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, submitMutation.isPending, submitMutation.isSuccess])

  function handleSendAgentMessage(msg: string) {
    setAgentMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: msg, timestamp: new Date() },
    ])
    wsRef.current?.send(JSON.stringify({ type: "reply", content: msg }))
  }

  const handleViewFeedback = useCallback((submissionId: string) => {
    navigate({
      to: "/questions/$questionId/result/$submissionId",
      params: { questionId, submissionId },
    } as never)
  }, [navigate, questionId])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
        <div
          className="animate-pulse rounded-lg"
          style={{ background: "var(--app-surface)", height: 32, width: 256 }}
        />
        <div
          className="animate-pulse rounded"
          style={{ background: "var(--app-surface)", height: 16, width: 384, marginTop: 8 }}
        />
        <div
          className="animate-pulse rounded-xl"
          style={{ background: "var(--app-surface)", height: 500, width: "100%", marginTop: 16 }}
        />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex h-64 items-center justify-center" style={{ color: "var(--app-muted)" }}>
        Question not found.
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col transition-all duration-200 ease-in-out overflow-hidden shrink-0",
          leftCollapsed ? "w-10" : "w-72",
        )}
        style={{ background: "var(--app-bg-elevated)", borderRight: "1px solid var(--app-border-2)" }}
      >
        {/* Sidebar header with collapse + tabs */}
        <div className="shrink-0" style={{ borderBottom: "1px solid var(--app-border-2)" }}>
          {leftCollapsed ? (
            <button
              type="button"
              onClick={() => setLeftCollapsed(false)}
              className="flex w-full items-center justify-center py-3 transition-colors"
              style={{ color: "var(--app-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-muted)")}
              aria-label="Expand sidebar"
            >
              <ChevronRight size={14} />
            </button>
          ) : (
            <>
              {/* Tab row + collapse button */}
              <div className="flex items-center px-2 pt-2 gap-1">
                <SidebarTabBtn
                  active={sidebarTab === "overview"}
                  onClick={() => setSidebarTab("overview")}
                  icon={<BookOpen size={12} />}
                  label="Problem"
                />
                <SidebarTabBtn
                  active={sidebarTab === "checklist"}
                  onClick={() => setSidebarTab("checklist")}
                  icon={<ListTodo size={12} />}
                  label={
                    checklistProgress > 0
                      ? `Checklist ${checklistProgress}/${checklistTotal}`
                      : "Checklist"
                  }
                />
                <button
                  type="button"
                  onClick={() => setLeftCollapsed(true)}
                  className="ml-auto p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--app-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--app-subtle)"
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--app-muted)"
                    e.currentTarget.style.background = "transparent"
                  }}
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft size={13} />
                </button>
              </div>

              {/* Checklist progress bar */}
              {checklistProgress > 0 && (
                <div className="px-3 pb-2 pt-1.5">
                  <div
                    className="h-0.5 w-full rounded-full overflow-hidden"
                    style={{ background: "var(--app-border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(checklistProgress / checklistTotal) * 100}%`,
                        background: "var(--app-indigo)",
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!leftCollapsed && (
          <div className="flex-1 overflow-y-auto">
            {/* ── Overview tab ── */}
            {sidebarTab === "overview" && (
              <div className="p-4 space-y-5">
                {/* Question header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DifficultyBadge difficulty={question.difficulty} solid />
                    <span className="text-xs capitalize" style={{ color: "var(--app-muted)" }}>
                      {question.category.replace(/-/g, " ")}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold leading-snug" style={{ color: "var(--app-fg)" }}>
                    {question.title}
                  </h2>
                </div>

                {/* Description */}
                <div>
                  <p
                    className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--app-muted)" }}
                  >
                    Description
                  </p>
                  <div
                    className="max-w-none text-xs leading-relaxed [&_p]:mb-1.5"
                    style={{ color: "var(--app-subtle)" }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.prompt}</ReactMarkdown>
                  </div>
                </div>

                {/* Hints */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--app-border)", background: "rgba(255,255,255,0.02)" }}
                >
                  <button
                    type="button"
                    onClick={() => setHintsOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2">
                      {hintsOpen ? (
                        <Unlock size={12} style={{ color: "var(--app-indigo)" }} />
                      ) : (
                        <Lock size={12} style={{ color: "var(--app-muted)" }} />
                      )}
                      <span style={{ color: hintsOpen ? "var(--app-body)" : "var(--app-subtle)" }}>
                        {hintsOpen ? "Hide hints" : "Reveal hints"}
                      </span>
                    </span>
                    <ChevronRight
                      size={12}
                      className={cn("transition-transform duration-150", hintsOpen && "rotate-90")}
                      style={{ color: "var(--app-muted)" }}
                    />
                  </button>
                  {hintsOpen && (question.hints?.length ?? 0) > 0 && (
                    <div
                      className="px-3 py-2.5 space-y-2"
                      style={{ borderTop: "1px solid var(--app-border)" }}
                    >
                      {question.hints?.map((hint, i) => (
                        <p key={i} className="text-xs flex gap-1.5" style={{ color: "var(--app-subtle)" }}>
                          <span className="shrink-0" style={{ color: "rgba(128,131,255,0.5)" }}>
                            ›
                          </span>
                          {hint}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ── Checklist tab ── */}
            {sidebarTab === "checklist" && (
              <div className="p-4 space-y-5">
                <div>
                  <p
                    className="mb-1 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--app-muted)" }}
                  >
                    What to cover
                  </p>
                  <p className="text-xs mb-3" style={{ color: "var(--app-muted)" }}>
                    Mark each section as you complete it.
                  </p>
                  <div className="space-y-1">
                    {CHECKLIST_ITEMS.map((item) => {
                      const checked = checklist.has(item)
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleChecklist(item)}
                          className="flex items-center gap-2.5 w-full text-left rounded-lg px-2.5 py-2 transition-all"
                          style={{
                            background: checked ? "var(--app-indigo-10)" : "transparent",
                            color: checked ? "var(--app-body)" : "var(--app-subtle)",
                          }}
                          onMouseEnter={(e) => {
                            if (!checked)
                              e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = checked
                              ? "var(--app-indigo-10)"
                              : "transparent"
                          }}
                        >
                          {checked ? (
                            <CheckSquare
                              size={13}
                              style={{ color: "var(--app-indigo)" }}
                              className="shrink-0"
                            />
                          ) : (
                            <Square size={13} style={{ color: "var(--app-border)" }} className="shrink-0" />
                          )}
                          <span className="text-xs">{item}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Progress summary */}
                <div
                  className="rounded-xl p-3"
                  style={{ border: "1px solid var(--app-border)", background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: "var(--app-muted)" }}
                    >
                      Progress
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: checklistProgress === checklistTotal ? "var(--app-green)" : "var(--app-subtle)",
                      }}
                    >
                      {checklistProgress}/{checklistTotal}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full overflow-hidden"
                    style={{ background: "var(--app-border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(checklistProgress / checklistTotal) * 100}%`,
                        background: checklistProgress === checklistTotal ? "var(--app-green)" : "var(--app-indigo)",
                      }}
                    />
                  </div>
                  {checklistProgress === checklistTotal && (
                    <p className="mt-2 text-xs" style={{ color: "var(--app-green)" }}>
                      ✓ All sections covered — great work!
                    </p>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Center panel ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 relative">
        {/* Question context bar */}
        <div
          className="flex items-center gap-3 px-4 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--app-border-2)", background: "var(--app-bg)" }}
        >
          <Link
            to="/questions"
            className="flex items-center gap-1 text-xs transition-colors shrink-0"
            style={{ color: "var(--app-muted)" }}
          >
            <ArrowLeft size={11} />
            Questions
          </Link>
          <span className="text-xs" style={{ color: "var(--app-border)" }}>
            /
          </span>
          <span className="truncate text-xs font-medium min-w-0" style={{ color: "var(--app-subtle)" }}>
            {question.title}
          </span>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <DifficultyBadge difficulty={question.difficulty} />
            <span
              className="flex items-center gap-1 text-xs font-mono tabular-nums"
              style={{ color: "var(--app-muted)" }}
            >
              <Clock size={11} />
              {elapsed}
            </span>
          </div>
        </div>

        {/* Draft restored banner */}
        {draftRestored && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 shrink-0"
            style={{ background: "var(--app-indigo-10)", borderBottom: "1px solid var(--app-indigo-15)" }}
          >
            <span className="text-xs" style={{ color: "var(--app-indigo)" }}>
              Draft restored — your previous work is loaded.
            </span>
            <button
              type="button"
              onClick={clearDraft}
              className="text-xs underline underline-offset-2 transition-opacity hover:opacity-70 shrink-0"
              style={{ color: "var(--app-indigo)" }}
            >
              Clear draft
            </button>
          </div>
        )}

        {/* API Key Warning Banner */}
        {!apiKey && !apiBannerDismissed && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
            style={{ background: "var(--app-red-10)", borderBottom: "1px solid var(--app-red-15)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: "var(--app-red)" }} className="shrink-0" />
              <span style={{ color: "var(--app-red)" }} className="text-xs font-medium">
                No OpenAI API key set.{" "}
                <Link
                  to="/settings"
                  style={{ color: "var(--app-red)", textDecoration: "underline" }}
                  className="hover:opacity-80 transition-opacity"
                >
                  Add one in Settings
                </Link>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setApiBannerDismissed(true)}
              className="shrink-0 p-0.5 hover:opacity-80 transition-opacity"
              style={{ color: "var(--app-red)" }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div
          className="flex items-center px-4 gap-0"
          style={{ borderBottom: "1px solid var(--app-border-2)", background: "var(--app-bg)" }}
        >
          <TabButton
            active={activeTab === "diagram"}
            onClick={() => {
              setActiveTab("diagram")
              setDiagramMounted(true)
            }}
            icon={<Map size={13} />}
            label="Diagram"
          />
          <TabButton
            active={activeTab === "code"}
            onClick={() => setActiveTab("code")}
            icon={<Code2 size={13} />}
            label="Code"
          />
          {hasExcalidrawElements && activeTab !== "diagram" && (
            <span className="ml-auto text-xs flex items-center gap-1" style={{ color: "var(--app-muted)" }}>
              <Layers size={11} style={{ color: "rgba(128,131,255,0.6)" }} />
              Diagram will be included
            </span>
          )}
        </div>

        {/* Editor / Diagram content */}
        <div className="flex-1 overflow-hidden relative">
          {/* Code tab — always in the DOM, toggled via display. */}
          <div
            className="absolute inset-0 p-3"
            style={{ display: activeTab === "code" ? "flex" : "none" }}
          >
            <CodeEditor
              value={answerCode}
              onChange={setAnswerCode}
              className="w-full"
              height="100%"
              placeholder={EDITOR_PLACEHOLDER}
              theme={theme}
            />
          </div>

          {/* Diagram tab — mounted on first visit, then kept alive.
              Uses opacity (not display/visibility) so Excalidraw can measure its
              size AND opacity cannot be overridden by children (unlike visibility). */}
          {diagramMounted && (
            <div
              className="absolute inset-0"
              style={{
                opacity: activeTab === "diagram" ? 1 : 0,
                pointerEvents: activeTab === "diagram" ? "auto" : "none",
              }}
              aria-label="Architecture diagram canvas"
              aria-hidden={activeTab !== "diagram"}
            >
              <Suspense
                fallback={
                  <div
                    className="flex h-full items-center justify-center text-sm gap-2"
                    style={{ color: "var(--app-muted)" }}
                  >
                    <span
                      className="w-4 h-4 rounded-full border-2 animate-spin"
                      style={{ borderColor: "var(--app-border)", borderTopColor: "var(--app-indigo)" }}
                    />
                    Loading canvas…
                  </div>
                }
              >
                <Excalidraw
                  theme={theme}
                  UIOptions={EXCALIDRAW_UI_OPTIONS}
                  onChange={handleExcalidrawChange}
                />
              </Suspense>
            </div>
          )}
        </div>

        {/* Bottom action bar — clean, compact, modern */}
        <div
          className="flex items-center justify-between gap-6 shrink-0 px-6 py-3"
          style={{
            borderTop: "1px solid var(--app-border-2)",
            background: "var(--app-bg)",
          }}
        >
          {/* Left: Minimal status indicators */}
          <div className="flex items-center gap-4 text-xs min-w-fit">
            {/* Word count badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-full"
              style={{
                background: "var(--app-surface-2)",
                border: "1px solid var(--app-border)",
              }}
            >
              <span
                style={{
                  color: wordCount >= 300 ? "var(--app-green)" : wordCount >= 150 ? "var(--app-indigo)" : "var(--app-muted)",
                  fontWeight: 600,
                }}
              >
                {wordCount}
              </span>
              <span style={{ color: "var(--app-muted)" }}>words</span>
            </div>

            {/* Diagram indicator badge */}
            {hasExcalidrawElements && (
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-full"
                style={{
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid var(--app-indigo-15)",
                }}
              >
                <Layers size={11} style={{ color: "var(--app-indigo)" }} />
                <span style={{ color: "var(--app-indigo-pale)", fontWeight: 500 }}>Diagram</span>
              </div>
            )}
          </div>

          {/* Center: Primary submit button */}
          <button
            type="button"
            onClick={() => {
              if (!submitMutation.isSuccess) {
                submitMutation.mutate()
              }
            }}
            disabled={
              !canSubmit ||
              submitMutation.isPending ||
              submitMutation.isSuccess
            }
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-95 disabled:cursor-not-allowed whitespace-nowrap"
            style={
              submitMutation.isSuccess
                ? {
                    background: "var(--app-green-10)",
                    border: "1px solid var(--app-green-15)",
                    color: "var(--app-green)",
                  }
                : canSubmit
                  ? {
                      background: "var(--app-indigo)",
                      border: "1px solid var(--app-indigo-20)",
                      boxShadow: "0 0 16px var(--app-indigo-glow)",
                      color: "#fff",
                    }
                  : {
                      background: "var(--app-indigo-10)",
                      border: "1px solid var(--app-indigo-15)",
                      color: "rgba(128,131,255,0.4)",
                    }
            }
            title={
              !canSubmit && !submitMutation.isSuccess
                ? answerCode.trim().length <= 20
                  ? `Write at least 20 chars (${answerCode.trim().length}/20)`
                  : `Check ${checklistTotal - checklistProgress} checklist item${checklistTotal - checklistProgress > 1 ? "s" : ""}`
                : ""
            }
          >
            {submitMutation.isPending ? (
              <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : submitMutation.isSuccess ? (
              <Check size={14} />
            ) : (
              <Zap size={14} />
            )}
            <span>
              {submitMutation.isSuccess
                ? "Submitted"
                : reviewMode === "deep"
                  ? "Deep Review"
                  : "Submit"}
            </span>
            {canSubmit && !submitMutation.isSuccess && !submitMutation.isPending && (
              <span className="text-[10px] opacity-50 font-mono">⌘↵</span>
            )}
          </button>

          {/* Right: Controls (review + mood + model) */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Review mode toggle */}
            <div
              className="flex items-center gap-1"
              style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", borderRadius: "6px", padding: "2px" }}
            >
              {[
                { val: "quick" as const, label: "Quick", icon: null },
                { val: "deep" as const, label: "Deep", icon: null },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setReviewMode(val)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                  style={{
                    background: reviewMode === val ? "var(--app-indigo)" : "transparent",
                    color: reviewMode === val ? "white" : "var(--app-muted)",
                  }}
                  title={
                    val === "deep"
                      ? "Deep: agent asks 2–3 follow-up questions then evaluates"
                      : "Quick: instant structured feedback · ~5s"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Mood selector */}
            <div
              className="flex items-center gap-1"
              style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", borderRadius: "6px", padding: "2px" }}
            >
              {(["pragmatist", "systems", "sre", "pm"] as const).map((m) => {
                const labels: Record<string, string> = { pragmatist: "P", systems: "S", sre: "R", pm: "M" }
                const fullLabels: Record<string, string> = { pragmatist: "Pragmatist", systems: "Systems", sre: "SRE", pm: "PM" }
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    className="px-2 py-1 rounded text-xs font-semibold transition-all"
                    style={{
                      background: mood === m ? "var(--app-indigo)" : "transparent",
                      color: mood === m ? "white" : "var(--app-muted)",
                      minWidth: "24px",
                      textAlign: "center",
                    }}
                    title={fullLabels[m]}
                  >
                    {labels[m]}
                  </button>
                )
              })}
            </div>

            {/* Model selector */}
            <div className="flex items-center">
              <ModelCombobox
                value={modelName}
                onChange={(v) => { setModelName(v); setModelOverridden(true) }}
                providers={["openai", "google", "anthropic", "deepseek"]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Right agent panel ───────────────────────────────────── */}
      <div
        className={cn(
          "w-80 shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          agentVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 w-0",
        )}
      >
        <AgentPanel
          state={agentState}
          messages={agentMessages}
          riskFlags={riskFlags}
          onSendMessage={handleSendAgentMessage}
          onViewFeedback={handleViewFeedback}
          className="h-full"
        />
      </div>
    </div>
  )
}

// ── Tab button ─────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-inset"
      style={{
        borderBottomColor: active ? "var(--app-indigo)" : "transparent",
        color: active ? "var(--app-fg)" : "var(--app-subtle)",
        background: active ? "var(--app-indigo-10)" : "transparent",
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Sidebar tab button ─────────────────────────────────────────────────────

function SidebarTabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all"
      style={{
        background: active ? "var(--app-surface-3)" : "transparent",
        color: active ? "var(--app-fg)" : "var(--app-muted)",
      }}
    >
      {icon}
      {label}
    </button>
  )
}
