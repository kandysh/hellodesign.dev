import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Info,
  Layers,
  ListTodo,
  Lock,
  Map,
  Mic,
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
import { useToast } from "@/components/Toast"
import { questionQueryOptions } from "@/lib/queries/questions"
import { cn } from "@/lib/utils"

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
)

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

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
  const apiKey = useApiKey()
  const elapsed = useElapsedTimer()

  // Panel state
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<"overview" | "checklist">("overview")
  const [hintsOpen, setHintsOpen] = useState(false)
  const [checklist, setChecklist] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"diagram" | "code">("code")
  const [reviewMode, setReviewMode] = useState<"quick" | "deep">("quick")
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
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null)
  const sseRef = useRef<EventSource | null>(null)

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
          strategy: reviewMode === "deep" ? "agentic" : "quick",
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
      toast("Submission received — agent is reading your answer", "success")

      // Open SSE stream
      const es = new EventSource(`${API}/api/submissions/${submissionId}/events`, {
        withCredentials: true,
      } as EventSourceInit)
      sseRef.current = es
      
      // Track if we've seen a terminal event to avoid double-toasting
      let hasTerminated = false

      es.addEventListener("reasoning", (e) => {
        const ev = JSON.parse(e.data)
        const line = ev.content ?? ev.line ?? JSON.stringify(ev)
        setAgentState((prev) => {
          // Accumulate trace in both processing and follow-up phases
          if (prev.phase === "processing" || prev.phase === "follow-up") {
            return { ...prev, trace: [...(prev.trace ?? []), line] }
          }
          return prev
        })
      })

      es.addEventListener("agent_flow", (e) => {
        const ev = JSON.parse(e.data)
        const flowStep = ev.step ?? "Agent progress"
        const details = ev.details ? ` (${JSON.stringify(ev.details)})` : ""
        const flowLine = `→ ${flowStep}${details}`
        
        setAgentState((prev) => {
          if (prev.phase === "processing" || prev.phase === "follow-up") {
            return { ...prev, trace: [...(prev.trace ?? []), flowLine] }
          }
          return prev
        })
      })

      es.addEventListener("followup", (e) => {
        const ev = JSON.parse(e.data)
        const q = ev.question ?? ev.content ?? ""
        setAgentState((prev) => ({
          phase: "follow-up",
          question: q,
          trace: prev.phase === "processing" ? prev.trace : (prev.phase === "follow-up" ? prev.trace : []),
        }))
        setAgentMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "agent", content: q, timestamp: new Date() },
        ])
      })

      es.addEventListener("eval_start", () => {
        setAgentState((_prev) => ({
          phase: "evaluating",
          agentResults: [],
        }))
      })

      es.addEventListener("eval_progress", (e) => {
        const ev = JSON.parse(e.data)
        setAgentState((prev) => {
          if (prev.phase === "evaluating") {
            return { phase: "evaluating", agentResults: [...prev.agentResults, ev] }
          }
          return prev
        })
      })

      es.addEventListener("eval_done", () => {
        hasTerminated = true
        setAgentState({
          phase: "done",
          submissionId,
          agentResults: [],
        })
        es.close()
        sseRef.current = null
      })

      es.addEventListener("error", (e) => {
        hasTerminated = true
        let errMsg = "Evaluation failed"
        try {
          errMsg = JSON.parse((e as MessageEvent).data)?.message ?? errMsg
        } catch {}
        toast(errMsg, "error")
        es.close()
        sseRef.current = null
        setAgentState({ phase: "idle" })
      })

      es.onerror = () => {
        // Only show connection error if we haven't already seen a terminal event
        if (sseRef.current && !hasTerminated) {
          toast("Lost connection to agent", "error")
          setAgentState({ phase: "idle" })
        }
        es.close()
        sseRef.current = null
      }
    },
    onError: (err: Error) => {
      toast(err.message, "error")
    },
  })

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      sseRef.current?.close()
    }
  }, [])

  function handleSendAgentMessage(msg: string) {
    setAgentMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: msg, timestamp: new Date() },
    ])
    fetch(`${API}/api/submissions/${currentSubmissionId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: msg }),
    }).catch(console.error)
  }

  function handleViewFeedback(submissionId: string) {
    navigate({
      to: "/questions/$questionId/result/$submissionId",
      params: { questionId, submissionId },
    } as never)
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
        <div
          className="animate-pulse rounded-lg"
          style={{ background: "#1e2a3d", height: 32, width: 256 }}
        />
        <div
          className="animate-pulse rounded"
          style={{ background: "#1e2a3d", height: 16, width: 384, marginTop: 8 }}
        />
        <div
          className="animate-pulse rounded-xl"
          style={{ background: "#1e2a3d", height: 500, width: "100%", marginTop: 16 }}
        />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex h-64 items-center justify-center" style={{ color: "#464554" }}>
        Question not found.
      </div>
    )
  }

  const canSubmit = answerCode.trim().length > 20 && checklistProgress > 0

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col transition-all duration-200 ease-in-out overflow-hidden shrink-0",
          leftCollapsed ? "w-10" : "w-72",
        )}
        style={{ background: "#0f1729", borderRight: "1px solid #1e2a3d" }}
      >
        {/* Sidebar header with collapse + tabs */}
        <div className="shrink-0" style={{ borderBottom: "1px solid #1e2a3d" }}>
          {leftCollapsed ? (
            <button
              type="button"
              onClick={() => setLeftCollapsed(false)}
              className="flex w-full items-center justify-center py-3 transition-colors"
              style={{ color: "#464554" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#908fa0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#464554")}
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
                  style={{ color: "#464554" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#908fa0"
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#464554"
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
                    style={{ background: "#2d3449" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(checklistProgress / checklistTotal) * 100}%`,
                        background: "#8083ff",
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
                    <span className="text-xs capitalize" style={{ color: "#464554" }}>
                      {question.category.replace(/-/g, " ")}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold leading-snug" style={{ color: "#dae2fd" }}>
                    {question.title}
                  </h2>
                </div>

                {/* Description */}
                <div>
                  <p
                    className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "#464554" }}
                  >
                    Description
                  </p>
                  <div
                    className="max-w-none text-xs leading-relaxed [&_p]:mb-1.5"
                    style={{ color: "#908fa0" }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.prompt}</ReactMarkdown>
                  </div>
                </div>

                {/* Hints */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid #2d3449", background: "rgba(255,255,255,0.02)" }}
                >
                  <button
                    type="button"
                    onClick={() => setHintsOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2">
                      {hintsOpen ? (
                        <Unlock size={12} style={{ color: "#8083ff" }} />
                      ) : (
                        <Lock size={12} style={{ color: "#464554" }} />
                      )}
                      <span style={{ color: hintsOpen ? "#c7c4d7" : "#908fa0" }}>
                        {hintsOpen ? "Hide hints" : "Reveal hints"}
                      </span>
                    </span>
                    <ChevronRight
                      size={12}
                      className={cn("transition-transform duration-150", hintsOpen && "rotate-90")}
                      style={{ color: "#464554" }}
                    />
                  </button>
                  {hintsOpen && (question.hints?.length ?? 0) > 0 && (
                    <div
                      className="px-3 py-2.5 space-y-2"
                      style={{ borderTop: "1px solid #2d3449" }}
                    >
                      {question.hints?.map((hint, i) => (
                        <p key={i} className="text-xs flex gap-1.5" style={{ color: "#908fa0" }}>
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
                    style={{ color: "#464554" }}
                  >
                    What to cover
                  </p>
                  <p className="text-xs mb-3" style={{ color: "#464554" }}>
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
                            background: checked ? "rgba(99,102,241,0.08)" : "transparent",
                            color: checked ? "#c7c4d7" : "#908fa0",
                          }}
                          onMouseEnter={(e) => {
                            if (!checked)
                              e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = checked
                              ? "rgba(99,102,241,0.08)"
                              : "transparent"
                          }}
                        >
                          {checked ? (
                            <CheckSquare
                              size={13}
                              style={{ color: "#8083ff" }}
                              className="shrink-0"
                            />
                          ) : (
                            <Square size={13} style={{ color: "#2d3449" }} className="shrink-0" />
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
                  style={{ border: "1px solid #2d3449", background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: "#464554" }}
                    >
                      Progress
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: checklistProgress === checklistTotal ? "#4edea3" : "#908fa0",
                      }}
                    >
                      {checklistProgress}/{checklistTotal}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full overflow-hidden"
                    style={{ background: "#2d3449" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(checklistProgress / checklistTotal) * 100}%`,
                        background: checklistProgress === checklistTotal ? "#4edea3" : "#8083ff",
                      }}
                    />
                  </div>
                  {checklistProgress === checklistTotal && (
                    <p className="mt-2 text-xs" style={{ color: "#4edea3" }}>
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
          style={{ borderBottom: "1px solid #1e2a3d", background: "#0b1326" }}
        >
          <Link
            to="/questions"
            className="flex items-center gap-1 text-xs transition-colors shrink-0"
            style={{ color: "#464554" }}
          >
            <ArrowLeft size={11} />
            Questions
          </Link>
          <span className="text-xs" style={{ color: "#2d3449" }}>
            /
          </span>
          <span className="truncate text-xs font-medium min-w-0" style={{ color: "#908fa0" }}>
            {question.title}
          </span>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <DifficultyBadge difficulty={question.difficulty} />
            <span
              className="flex items-center gap-1 text-xs font-mono tabular-nums"
              style={{ color: "#464554" }}
            >
              <Clock size={11} />
              {elapsed}
            </span>
          </div>
        </div>

        {/* API Key Warning Banner */}
        {!apiKey && !apiBannerDismissed && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
            style={{ background: "rgba(255,180,171,0.08)", borderBottom: "1px solid rgba(255,180,171,0.15)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: "#ffb4ab" }} className="shrink-0" />
              <span style={{ color: "#ffb4ab" }} className="text-xs font-medium">
                No OpenAI API key set.{" "}
                <Link
                  to="/settings"
                  style={{ color: "#ffb4ab", textDecoration: "underline" }}
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
              style={{ color: "#ffb4ab" }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div
          className="flex items-center px-4 gap-0"
          style={{ borderBottom: "1px solid #1e2a3d", background: "#0b1326" }}
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
            <span className="ml-auto text-xs flex items-center gap-1" style={{ color: "#464554" }}>
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
                    style={{ color: "#464554" }}
                  >
                    <span
                      className="w-4 h-4 rounded-full border-2 animate-spin"
                      style={{ borderColor: "#2d3449", borderTopColor: "#6366f1" }}
                    />
                    Loading canvas…
                  </div>
                }
              >
                <Excalidraw
                  theme="dark"
                  UIOptions={{ canvasActions: { export: false } }}
                  onChange={handleExcalidrawChange}
                />
              </Suspense>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 shrink-0"
          style={{ borderTop: "1px solid #1e2a3d", background: "#0b1326" }}
        >
          {/* Left: word count + diagram indicator */}
          <div className="flex items-center gap-3 text-xs shrink-0" style={{ color: "#464554" }}>
            <span style={{ color: wordCount > 0 ? "#908fa0" : "#464554" }}>{wordCount} words</span>
            {hasExcalidrawElements && (
              <span className="flex items-center gap-1">
                <Layers size={10} style={{ color: "rgba(128,131,255,0.6)" }} />
                Diagram
              </span>
            )}
          </div>

          <div className="flex-1" />

          {/* Submit button + inline validation hint */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (reviewMode === "deep") {
                  // Deep AI = interview mode — pass content to interview page via sessionStorage
                  sessionStorage.setItem(
                    `hd:prefill:${questionId}`,
                    JSON.stringify({
                      answerText: answerCode,
                      elements: (excalidrawData as any)?.elements ?? [],
                    }),
                  )
                  navigate({
                    to: "/questions/$questionId/interview",
                    params: { questionId },
                  } as never)
                } else if (!submitMutation.isSuccess) {
                  submitMutation.mutate()
                }
              }}
              disabled={
                !canSubmit ||
                submitMutation.isPending ||
                (reviewMode === "quick" && submitMutation.isSuccess)
              }
              className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all active:scale-95 disabled:cursor-not-allowed"
              style={
                reviewMode === "quick" && submitMutation.isSuccess
                  ? {
                      background: "rgba(78,222,163,0.12)",
                      border: "1px solid rgba(78,222,163,0.3)",
                      color: "#4edea3",
                    }
                  : canSubmit
                    ? {
                        background: "#6366f1",
                        border: "1px solid rgba(99,102,241,0.5)",
                        boxShadow: "0 0 12px rgba(99,102,241,0.25)",
                        color: "#fff",
                      }
                    : {
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.2)",
                        color: "rgba(99,102,241,0.5)",
                      }
              }
            >
              {submitMutation.isPending ? (
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : reviewMode === "quick" && submitMutation.isSuccess ? (
                <Check size={14} />
              ) : reviewMode === "deep" ? (
                <Mic size={14} />
              ) : (
                <Zap size={14} />
              )}
              {reviewMode === "deep"
                ? "Start AI Interview"
                : submitMutation.isSuccess
                  ? "Submitted"
                  : "Submit for Review"}
            </button>

            {/* Inline validation hint — shown when disabled and not yet submitted */}
            {!canSubmit && !submitMutation.isSuccess && (
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: "rgba(255,180,171,0.7)" }}
              >
                <AlertTriangle size={11} />
                {answerCode.trim().length <= 20
                  ? "Write more first"
                  : "Check one item"}
              </span>
            )}
          </div>

          <div className="flex-1" />

          {/* Right: mode toggle + interview link + info */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Interview link — hidden when deep agentic review is selected */}
            {reviewMode !== "deep" && (
              <Link
                to="/questions/$questionId/interview"
                params={{ questionId }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ color: "#908fa0", border: "1px solid #2d3449" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#dae2fd"
                  e.currentTarget.style.borderColor = "#464554"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#908fa0"
                  e.currentTarget.style.borderColor = "#2d3449"
                }}
              >
                <Mic size={12} />
                Interview
              </Link>
            )}

            {/* Review mode pill toggle */}
            <div
              className="flex items-center rounded-lg p-0.5 gap-0.5"
              style={{ background: "#131b2e", border: "1px solid #2d3449" }}
            >
              <button
                type="button"
                onClick={() => setReviewMode("quick")}
                className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                style={
                  reviewMode === "quick"
                    ? { background: "#1e2a3d", color: "#dae2fd" }
                    : { background: "transparent", color: "#464554" }
                }
              >
                Quick
              </button>
              <button
                type="button"
                onClick={() => setReviewMode("deep")}
                className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                style={
                  reviewMode === "deep"
                    ? { background: "#1e2a3d", color: "#8083ff" }
                    : { background: "transparent", color: "#464554" }
                }
              >
                Deep AI
              </button>
            </div>

            <span
              className="tooltip tooltip-left cursor-default"
              data-tip={
                reviewMode === "deep"
                  ? "Deep AI: agent asks follow-up questions · ~30s"
                  : "Quick: instant structured feedback · ~5s"
              }
            >
              <Info size={13} style={{ color: "#464554" }} />
            </span>
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
        borderBottomColor: active ? "#8083ff" : "transparent",
        color: active ? "#dae2fd" : "#908fa0",
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
      className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-all"
      style={{
        borderBottom: active ? "2px solid #8083ff" : "2px solid transparent",
        color: active ? "#dae2fd" : "#464554",
      }}
    >
      {icon}
      {label}
    </button>
  )
}
