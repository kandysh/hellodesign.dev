import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  useState,
  lazy,
  Suspense,
  useEffect,
  useRef,
} from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Question, AgentResult } from "@sysdesign/types"
import { RichTextEditor } from "@/components/RichTextEditor"
import { ApiKeyInput, useApiKey } from "@/components/ApiKeyInput"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { AgentPanel, type AgentPanelState } from "@/components/AgentPanel"
import { useToast } from "@/components/Toast"
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Lock,
  Unlock,
  PenLine,
  Map,
  Zap,
  Layers,
  Info,
  Clock,
  ListTodo,
  BookOpen,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
)

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

const EDITOR_PLACEHOLDER = `Walk through your design step by step:

1. Clarify requirements (functional + non-functional)
2. Capacity estimation (QPS, storage, bandwidth)
3. High-level architecture
4. Data model & database choice
5. API design
6. Scalability, caching, bottlenecks`

const CHECKLIST_ITEMS = [
  "Functional requirements",
  "Scale estimates",
  "Core components",
  "Data model",
  "API design",
  "Bottlenecks & trade-offs",
]

interface Message {
  role: "agent" | "user"
  content: string
  timestamp: Date
}

export const Route = createFileRoute("/questions/$questionId")({
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
  const [activeTab, setActiveTab] = useState<"write" | "diagram">("write")
  const [reviewMode, setReviewMode] = useState<"quick" | "deep">("quick")

  // Content state
  const [answerText, setAnswerText] = useState("")
  const [excalidrawData, setExcalidrawData] = useState<Record<string, unknown> | null>(null)
  const [hasExcalidrawElements, setHasExcalidrawElements] = useState(false)

  // Agent panel state
  const [agentVisible, setAgentVisible] = useState(false)
  const [agentState, setAgentState] = useState<AgentPanelState>({ phase: "idle" })
  const [agentMessages, setAgentMessages] = useState<Message[]>([])
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null)
  const sseRef = useRef<EventSource | null>(null)

  const { data: question, isLoading } = useQuery<Question>({
    queryKey: ["question", questionId],
    queryFn: () => fetch(`${API}/api/questions/${questionId}`).then((r) => r.json()),
  })

  // Word count derived from editor
  const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0
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
          answerText,
          excalidrawJson: excalidrawData,
          apiKey: apiKey ?? undefined,
          reviewMode,
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
      const es = new EventSource(`${API}/api/submissions/${submissionId}/stream`, {
        withCredentials: true,
      } as EventSourceInit)
      sseRef.current = es

      es.addEventListener("agent:trace", (e) => {
        const { line } = JSON.parse(e.data)
        setAgentState((prev) => {
          if (prev.phase === "processing") {
            return { phase: "processing", trace: [...prev.trace, line] }
          }
          return prev
        })
      })

      es.addEventListener("agent:followup", (e) => {
        const { question: q } = JSON.parse(e.data)
        setAgentState((prev) => ({
          phase: "follow-up",
          question: q,
          trace: prev.phase === "processing" ? prev.trace : [],
        }))
        setAgentMessages((prev) => [
          ...prev,
          { role: "agent", content: q, timestamp: new Date() },
        ])
      })

      es.addEventListener("agent:result", (e) => {
        const result: AgentResult = JSON.parse(e.data)
        setAgentState((prev) => ({
          phase: "evaluating",
          agentResults: prev.phase === "evaluating" ? [...prev.agentResults, result] : [result],
        }))
      })

      es.addEventListener("evaluation:complete", () => {
        setAgentState({
          phase: "done",
          submissionId,
          agentResults: [],
        })
        es.close()
        sseRef.current = null
      })

      es.addEventListener("evaluation:error", (e) => {
        const { message: errMsg } = JSON.parse(e.data)
        toast(errMsg ?? "Evaluation failed", "error")
        es.close()
        sseRef.current = null
        setAgentState({ phase: "idle" })
      })

      es.onerror = () => {
        if (sseRef.current) {
          toast("Lost connection to agent", "error")
          es.close()
          sseRef.current = null
        }
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
    setAgentMessages((prev) => [...prev, { role: "user", content: msg, timestamp: new Date() }])
    fetch(`${API}/api/submissions/${currentSubmissionId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: msg }),
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
        <div className="skeleton h-8 w-64 rounded-lg" />
        <div className="skeleton h-4 w-96 rounded" />
        <div className="skeleton h-[500px] w-full rounded-xl" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex h-64 items-center justify-center text-base-content/40">
        Question not found.
      </div>
    )
  }

  const canSubmit = !!apiKey && answerText.trim().length > 20

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col border-r border-base-300/40 bg-base-200/30 transition-all duration-200 ease-in-out overflow-hidden shrink-0",
          leftCollapsed ? "w-10" : "w-72",
        )}
      >
        {/* Sidebar header with collapse + tabs */}
        <div className="shrink-0 border-b border-base-300/40">
          {leftCollapsed ? (
            <button
              type="button"
              onClick={() => setLeftCollapsed(false)}
              className="flex w-full items-center justify-center py-3 text-base-content/40 hover:text-base-content/70 transition-default"
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
                  label={checklistProgress > 0 ? `Checklist ${checklistProgress}/${checklistTotal}` : "Checklist"}
                />
                <button
                  type="button"
                  onClick={() => setLeftCollapsed(true)}
                  className="ml-auto p-1.5 rounded-lg text-base-content/30 hover:text-base-content/60 hover:bg-base-300/30 transition-default"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft size={13} />
                </button>
              </div>

              {/* Checklist progress bar */}
              {checklistProgress > 0 && (
                <div className="px-3 pb-2 pt-1.5">
                  <div className="h-0.5 w-full rounded-full bg-base-300/40 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(checklistProgress / checklistTotal) * 100}%` }}
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
                    <span className="text-xs text-base-content/40 capitalize">
                      {question.category.replace(/-/g, " ")}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold leading-snug text-base-content">
                    {question.title}
                  </h2>
                </div>

                {/* Description */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-base-content/30">
                    Description
                  </p>
                  <div className="prose prose-sm prose-invert max-w-none text-xs text-base-content/60 leading-relaxed [&_p]:mb-1.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {question.description}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Hints */}
                <div className="rounded-xl border border-base-300/40 bg-base-300/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setHintsOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium transition-default hover:bg-base-300/20"
                  >
                    <span className="flex items-center gap-2">
                      {hintsOpen ? (
                        <Unlock size={12} className="text-primary" />
                      ) : (
                        <Lock size={12} className="text-base-content/40" />
                      )}
                      <span className={hintsOpen ? "text-base-content/70" : "text-base-content/50"}>
                        {hintsOpen ? "Hide hints" : "Reveal hints"}
                      </span>
                    </span>
                    <ChevronRight
                      size={12}
                      className={cn(
                        "text-base-content/30 transition-transform duration-150",
                        hintsOpen && "rotate-90",
                      )}
                    />
                  </button>
                  {hintsOpen && question.rubricHints?.length > 0 && (
                    <div className="border-t border-base-300/40 px-3 py-2.5 space-y-2">
                      {question.rubricHints.map((hint, i) => (
                        <p key={i} className="text-xs text-base-content/60 flex gap-1.5">
                          <span className="text-primary/50 shrink-0">›</span>
                          {hint}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* API Key at bottom of overview */}
                <div className="pt-1">
                  <ApiKeyInput />
                </div>
              </div>
            )}

            {/* ── Checklist tab ── */}
            {sidebarTab === "checklist" && (
              <div className="p-4 space-y-5">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-base-content/30">
                    What to cover
                  </p>
                  <p className="text-xs text-base-content/40 mb-3">
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
                          className={cn(
                            "flex items-center gap-2.5 w-full text-left rounded-lg px-2.5 py-2 transition-default",
                            checked
                              ? "bg-primary/8 text-base-content/80 hover:bg-primary/12"
                              : "text-base-content/50 hover:bg-base-300/30 hover:text-base-content/70",
                          )}
                        >
                          {checked ? (
                            <CheckSquare size={13} className="text-primary shrink-0" />
                          ) : (
                            <Square size={13} className="text-base-content/25 shrink-0" />
                          )}
                          <span className="text-xs">{item}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Progress summary */}
                <div className="rounded-xl border border-base-300/40 bg-base-300/10 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-base-content/30">
                      Progress
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        checklistProgress === checklistTotal
                          ? "text-success"
                          : "text-base-content/50",
                      )}
                    >
                      {checklistProgress}/{checklistTotal}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-base-300/40 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        checklistProgress === checklistTotal ? "bg-success" : "bg-primary",
                      )}
                      style={{ width: `${(checklistProgress / checklistTotal) * 100}%` }}
                    />
                  </div>
                  {checklistProgress === checklistTotal && (
                    <p className="mt-2 text-xs text-success/80">
                      ✓ All sections covered — great work!
                    </p>
                  )}
                </div>

                {/* API Key */}
                <ApiKeyInput />
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Center panel ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 relative">
        {/* Question context bar */}
        <div className="flex items-center gap-3 border-b border-base-300/40 bg-base-200/30 px-4 py-2 shrink-0">
          <Link
            to="/questions"
            className="flex items-center gap-1 text-xs text-base-content/35 hover:text-base-content/60 transition-default shrink-0"
          >
            <ArrowLeft size={11} />
            Questions
          </Link>
          <span className="text-base-content/20 text-xs">/</span>
          <span className="truncate text-xs font-medium text-base-content/70 min-w-0">
            {question.title}
          </span>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <DifficultyBadge difficulty={question.difficulty} />
            <span className="flex items-center gap-1 text-xs text-base-content/35 font-mono tabular-nums">
              <Clock size={11} />
              {elapsed}
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center border-b border-base-300/40 bg-base-200/20 px-4 gap-0">
          <TabButton
            active={activeTab === "write"}
            onClick={() => setActiveTab("write")}
            icon={<PenLine size={13} />}
            label="Write"
          />
          <TabButton
            active={activeTab === "diagram"}
            onClick={() => setActiveTab("diagram")}
            icon={<Map size={13} />}
            label="Diagram"
          />
          {hasExcalidrawElements && activeTab !== "diagram" && (
            <span className="ml-auto text-xs text-base-content/40 flex items-center gap-1">
              <Layers size={11} className="text-primary/60" />
              Diagram will be included
            </span>
          )}
        </div>

        {/* Editor / Diagram content */}
        <div className="flex-1 overflow-hidden">
          {/* Write tab */}
          <div className={cn("h-full", activeTab !== "write" && "hidden")}>
            <RichTextEditor
              onChange={setAnswerText}
              placeholder={EDITOR_PLACEHOLDER}
              className="h-full"
            />
          </div>

          {/* Diagram tab */}
          <div
            className={cn("h-full", activeTab !== "diagram" && "hidden")}
            aria-label="Architecture diagram canvas"
          >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-base-content/40 text-sm gap-2">
                  <div className="loading loading-spinner loading-sm text-primary" />
                  Loading canvas…
                </div>
              }
            >
              <Excalidraw
                theme="dark"
                UIOptions={{ canvasActions: { export: false } }}
                onChange={(elements, appState) => {
                  setExcalidrawData({ elements, appState })
                  setHasExcalidrawElements(
                    Array.isArray(elements) && elements.length > 0,
                  )
                }}
              />
            </Suspense>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between gap-4 border-t border-base-300/40 bg-base-200/40 px-4 py-2.5 shrink-0">
          {/* Left: word count + diagram indicator */}
          <div className="flex items-center gap-3 text-xs text-base-content/40 min-w-0">
            <span className={cn(wordCount > 0 && "text-base-content/60")}>{wordCount} words</span>
            {hasExcalidrawElements && (
              <span className="flex items-center gap-1">
                <Layers size={10} className="text-primary/60" />
                Diagram
              </span>
            )}
          </div>

          {/* Center: submit */}
          <div className="flex-1 flex justify-center">
            <div
              className={cn(
                "tooltip",
                !canSubmit && "tooltip-open tooltip-top",
              )}
              data-tip={
                !apiKey
                  ? "Add your OpenAI API key in the left panel"
                  : answerText.trim().length <= 20
                    ? "Write at least a few sentences before submitting"
                    : undefined
              }
            >
              <button
                type="button"
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmit || submitMutation.isPending}
                className="btn btn-primary btn-wide rounded-xl gap-2 transition-default"
              >
                {submitMutation.isPending ? (
                  <div className="loading loading-spinner loading-xs" />
                ) : (
                  <Zap size={15} />
                )}
                Submit for Review
              </button>
            </div>
          </div>

          {/* Right: mode selector */}
          <div className="flex items-center gap-2">
            <select
              value={reviewMode}
              onChange={(e) => setReviewMode(e.target.value as "quick" | "deep")}
              className="select select-xs rounded-lg border-base-300/40 bg-base-300/20 text-xs focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Review mode"
            >
              <option value="quick">Quick Review</option>
              <option value="deep">Deep Agentic Review</option>
            </select>
            <span
              className="tooltip tooltip-left cursor-default"
              data-tip="Deep review takes ~30s — the agent may ask follow-up questions"
            >
              <Info size={13} className="text-base-content/30 hover:text-base-content/60 transition-default" />
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
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-default focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        active
          ? "border-primary text-base-content"
          : "border-transparent text-base-content/50 hover:text-base-content/80",
      )}
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
      className={cn(
        "flex items-center gap-1.5 flex-1 justify-center rounded-lg px-2 py-1.5 text-[11px] font-medium transition-default",
        active
          ? "bg-base-300/50 text-base-content"
          : "text-base-content/40 hover:text-base-content/70 hover:bg-base-300/20",
      )}
    >
      {icon}
      {label}
    </button>
  )
}
