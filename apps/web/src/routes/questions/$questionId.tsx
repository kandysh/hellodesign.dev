import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  useState,
  lazy,
  Suspense,
  useCallback,
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
  Mic,
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

function WorkspacePage() {
  const { questionId } = Route.useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const apiKey = useApiKey()

  // Panel state
  const [leftCollapsed, setLeftCollapsed] = useState(false)
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
    // POST reply to backend
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
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setLeftCollapsed((v) => !v)}
          className="flex items-center justify-end gap-1 border-b border-base-300/40 px-2 py-2.5 text-base-content/40 hover:text-base-content/70 transition-default"
          aria-label={leftCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {leftCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!leftCollapsed && (
            <span className="text-xs text-base-content/40">Collapse</span>
          )}
        </button>

        {!leftCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Question header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DifficultyBadge difficulty={question.difficulty} solid />
                <span className="text-xs text-base-content/40">
                  {question.category.replace(/-/g, " ")}
                </span>
              </div>
              <h2 className="text-base font-semibold leading-snug text-base-content">
                {question.title}
              </h2>
            </div>

            {/* Description */}
            <div className="prose prose-sm prose-invert max-w-none text-xs text-base-content/60 leading-relaxed [&_p]:mb-1.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {question.description}
              </ReactMarkdown>
            </div>

            {/* Hints */}
            <div className="rounded-xl border border-base-300/40 bg-base-300/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setHintsOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium transition-default hover:bg-base-300/20"
              >
                <span className="flex items-center gap-2">
                  {hintsOpen ? (
                    <Unlock size={13} className="text-primary" />
                  ) : (
                    <Lock size={13} className="text-base-content/40" />
                  )}
                  Hints
                </span>
                {hintsOpen ? <ChevronLeft size={13} className="rotate-90" /> : <ChevronRight size={13} className="-rotate-90" />}
              </button>
              {hintsOpen && question.rubricHints?.length > 0 && (
                <div className="border-t border-base-300/40 px-3 py-2.5 space-y-1.5">
                  {question.rubricHints.map((hint, i) => (
                    <p key={i} className="text-xs text-base-content/60">
                      • {hint}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* What to cover checklist */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/40">
                What to cover
              </p>
              <div className="space-y-1.5">
                {CHECKLIST_ITEMS.map((item) => {
                  const checked = checklist.has(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleChecklist(item)}
                      className={cn(
                        "flex items-center gap-2 text-xs w-full text-left rounded-lg px-2 py-1.5 transition-default hover:bg-base-300/30",
                        checked ? "text-base-content/80" : "text-base-content/50",
                      )}
                    >
                      {checked ? (
                        <CheckSquare size={13} className="text-primary shrink-0" />
                      ) : (
                        <Square size={13} className="text-base-content/30 shrink-0" />
                      )}
                      {item}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* API Key */}
            <ApiKeyInput />
          </div>
        )}
      </aside>

      {/* ── Center panel ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 relative">
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
        <div className="flex items-center justify-between gap-4 border-t border-base-300/40 bg-base-200/40 px-4 py-2.5">
          {/* Left: counts */}
          <div className="flex items-center gap-3 text-xs text-base-content/40">
            <span>{wordCount} words</span>
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

          {/* Right: mode selector + interview mode */}
          <div className="flex items-center gap-2">
            <Link
              to="/questions/$questionId/interview"
              params={{ questionId }}
              className="btn btn-ghost btn-xs rounded-lg border border-base-300/40 gap-1 text-base-content/50 hover:text-base-content transition-default"
            >
              <Mic size={12} />
              Interview
            </Link>
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
