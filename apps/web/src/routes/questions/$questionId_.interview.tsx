import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useState, useRef, useEffect, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Question } from "@sysdesign/types"
import { ApiKeyInput, useApiKey } from "@/components/ApiKeyInput"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { useToast } from "@/components/Toast"
import { cn } from "@/lib/utils"
import {
  Brain,
  Send,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  BarChart3,
  Mic,
  Sparkles,
  MessageSquare,
  ArrowLeft,
  Info,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

// ── SSE event shapes ────────────────────────────────────────────────────────

type SSEFollowupEvent   = { type: "followup";      question: string; submissionId: string }
type SSEEvalStartEvent  = { type: "eval_start";    dimensions: string[] }
type SSEEvalProgEvent   = { type: "eval_progress"; dimensionId: string; score: number }
type SSEEvalDoneEvent   = { type: "eval_done";     submissionId: string }
type SSEErrorEvent      = { type: "error";         message: string }

// ── Phase ───────────────────────────────────────────────────────────────────

type Phase =
  | "setup"       // Not started
  | "starting"    // POST in-flight
  | "thinking"    // AI is reasoning
  | "waiting"     // AI asked — user's turn
  | "replying"    // User reply in-flight
  | "evaluating"  // Dimension evaluation in progress
  | "done"        // Evaluation complete

// ── Message ─────────────────────────────────────────────────────────────────

interface Message {
  role: "agent" | "user" | "system"
  content: string
  timestamp: Date
}

// ── Dimension labels ────────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  requirements:   "Requirements",
  scalability:    "Scalability",
  db_design:      "Database Design",
  fault_tolerance:"Fault Tolerance",
  api_design:     "API Design",
  caching:        "Caching",
  trade_offs:     "Trade-offs",
}

// ── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/questions/$questionId_/interview")({
  component: InterviewPage,
})

// ── Page ────────────────────────────────────────────────────────────────────

function InterviewPage() {
  const { questionId } = Route.useParams() as { questionId: string }
  const navigate     = useNavigate()
  const { toast }    = useToast()
  const apiKey       = useApiKey()

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [phase,         setPhase]         = useState<Phase>("setup")
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState("")
  const [submissionId,  setSubmissionId]  = useState<string | null>(null)
  const [evalDims,      setEvalDims]      = useState<string[]>([])
  const [evalDone,      setEvalDone]      = useState<string[]>([])

  const phaseRef        = useRef<Phase>("setup")
  const sseRef          = useRef<EventSource | null>(null)
  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLTextAreaElement>(null)

  // keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase }, [phase])

  const { data: question, isLoading } = useQuery<Question>({
    queryKey: ["question", questionId],
    queryFn: () => fetch(`${API}/api/questions/${questionId}`).then((r) => r.json()),
  })

  // Auto-scroll
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll trigger when messages or phase change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, phase])

  // Focus textarea when it's the user's turn
  useEffect(() => {
    if (phase === "waiting") {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [phase])

  // Cleanup SSE on unmount
  useEffect(() => () => sseRef.current?.close(), [])

  // ── SSE ──────────────────────────────────────────────────────────────────

  const openSSE = useCallback(
    (sid: string) => {
      const es = new EventSource(`${API}/api/submissions/${sid}/events`, {
        withCredentials: true,
      } as EventSourceInit)
      sseRef.current = es

      es.addEventListener("reasoning", () => {
        // Only enter "thinking" if we're not already past it
        setPhase((p) =>
          p === "starting" || p === "thinking" || p === "waiting" || p === "replying"
            ? "thinking"
            : p,
        )
      })

      es.addEventListener("followup", (e) => {
        const evt = JSON.parse((e as MessageEvent).data) as SSEFollowupEvent
        setMessages((prev) => [
          ...prev,
          { role: "agent", content: evt.question, timestamp: new Date() },
        ])
        setPhase("waiting")
      })

      es.addEventListener("eval_start", (e) => {
        const evt = JSON.parse((e as MessageEvent).data) as SSEEvalStartEvent
        setEvalDims(evt.dimensions)
        setEvalDone([])
        setPhase("evaluating")
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: "Evaluating your design across all dimensions…",
            timestamp: new Date(),
          },
        ])
      })

      es.addEventListener("eval_progress", (e) => {
        const evt = JSON.parse((e as MessageEvent).data) as SSEEvalProgEvent
        setEvalDone((prev) => [...prev, evt.dimensionId])
      })

      es.addEventListener("eval_done", (e) => {
        const evt = JSON.parse((e as MessageEvent).data) as SSEEvalDoneEvent
        setSubmissionId(evt.submissionId)
        setPhase("done")
        es.close()
        sseRef.current = null
      })

      es.addEventListener("error", (e) => {
        try {
          const evt = JSON.parse((e as MessageEvent).data) as SSEErrorEvent
          toast(evt.message ?? "An error occurred", "error")
        } catch {
          toast("Lost connection to AI", "error")
        }
        if (phaseRef.current !== "done") setPhase("setup")
        es.close()
        sseRef.current = null
      })

      es.onerror = () => {
        if (sseRef.current && phaseRef.current !== "done") {
          toast("Connection to AI lost", "error")
          setPhase("setup")
        }
        es.close()
        sseRef.current = null
      }
    },
    [toast],
  )

  // ── Start interview mutation ──────────────────────────────────────────────

  const startMutation = useMutation({
    mutationFn: async () => {
      const emptyRoot = {
        root: {
          children: [],
          direction: null,
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      }
      const res = await fetch(`${API}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          questionId,
          lexicalState: emptyRoot,
          strategy: "agentic",
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Failed to start interview (HTTP ${res.status})`)
      }
      return res.json() as Promise<{ submissionId: string }>
    },
    onSuccess: ({ submissionId: sid }) => {
      setSubmissionId(sid)
      setPhase("thinking")
      setMessages([])
      openSSE(sid)
      toast("Interview started — AI is preparing your first question", "success")
    },
    onError: (err: Error) => {
      toast(err.message, "error")
      setPhase("setup")
    },
  })

  function handleStart() {
    if (!apiKey) { toast("Add your OpenAI API key first", "error"); return }
    setPhase("starting")
    startMutation.mutate()
  }

  // ── Send reply ────────────────────────────────────────────────────────────

  async function handleSendReply() {
    const msg = input.trim()
    if (!msg || !submissionId || phase !== "waiting") return

    setMessages((prev) => [
      ...prev,
      { role: "user", content: msg, timestamp: new Date() },
    ])
    setInput("")
    setPhase("replying")

    try {
      const res = await fetch(`${API}/api/submissions/${submissionId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: msg }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Failed to send reply (HTTP ${res.status})`)
      }
      setPhase("thinking")
    } catch (err) {
      toast((err as Error).message, "error")
      setPhase("waiting")
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendReply()
    }
  }

  function handleViewFeedback() {
    if (!submissionId) return
    navigate({
      to: "/questions/$questionId/result/$submissionId",
      params: { questionId, submissionId },
    } as never)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
        <div className="skeleton h-8 w-64 rounded-lg" />
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

  const canStart = !!apiKey && phase === "setup"
  const canSend  = input.trim().length > 0 && phase === "waiting"
  const showInput = phase === "waiting" || phase === "thinking" || phase === "replying"

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Left panel: Problem ─────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col border-r border-base-300/40 bg-base-200/30 transition-all duration-200 ease-in-out overflow-hidden shrink-0",
          leftCollapsed ? "w-10" : "w-80",
        )}
      >
        <button
          type="button"
          onClick={() => setLeftCollapsed((v) => !v)}
          className="flex items-center justify-end gap-1 border-b border-base-300/40 px-2 py-2.5 text-base-content/40 hover:text-base-content/70 transition-default"
          aria-label={leftCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {leftCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!leftCollapsed && <span className="text-xs text-base-content/40">Collapse</span>}
        </button>

        {!leftCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Back to workspace */}
            <Link
              to="/questions/$questionId"
              params={{ questionId }}
              className="flex items-center gap-1.5 text-xs text-base-content/40 hover:text-base-content/60 transition-default"
            >
              <ArrowLeft size={12} />
              Back to workspace
            </Link>

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

            {/* Key areas */}
            {question.rubricHints?.length > 0 && (
              <div className="rounded-xl border border-base-300/40 bg-base-300/10 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Info size={12} className="text-base-content/40" />
                  <span className="text-xs font-medium text-base-content/50">Key areas</span>
                </div>
                <div className="space-y-1">
                  {question.rubricHints.map((hint, i) => (
                    <p key={i} className="text-xs text-base-content/50">• {hint}</p>
                  ))}
                </div>
              </div>
            )}

            {/* API key */}
            <ApiKeyInput />
          </div>
        )}
      </aside>

      {/* ── Right panel: Chat ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-base-300/40 bg-base-200/30 px-5 py-3 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Brain size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none">AI System Design Interviewer</p>
            <p className="text-xs text-base-content/40 mt-0.5 truncate">{question.title}</p>
          </div>
          <InterviewStatusPill phase={phase} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Setup ── */}
          {phase === "setup" && (
            <SetupScreen
              question={question}
              apiKey={apiKey}
              canStart={canStart}
              isStarting={startMutation.isPending}
              onStart={handleStart}
            />
          )}

          {/* ── Starting spinner ── */}
          {phase === "starting" && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-base-content/40">
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-sm">Starting your interview…</p>
            </div>
          )}

          {/* ── Active chat ── */}
          {phase !== "setup" && phase !== "starting" && (
            <div className="p-4 space-y-4">

              {messages.map((msg, i) => (
                <InterviewBubble key={i} message={msg} />
              ))}

              {/* Typing indicator */}
              {(phase === "thinking" || phase === "replying") && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Brain size={14} />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-base-200/80 px-4 py-3">
                    <span className="flex gap-1">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="h-1.5 w-1.5 rounded-full bg-base-content/40 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </span>
                    <span className="text-xs text-base-content/40">Thinking…</span>
                  </div>
                </div>
              )}

              {/* Evaluation progress */}
              {phase === "evaluating" && evalDims.length > 0 && (
                <EvalProgressCard dims={evalDims} done={evalDone} />
              )}

              {/* Done card */}
              {phase === "done" && (
                <DoneCard onViewFeedback={handleViewFeedback} />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        {showInput && (
          <div className="shrink-0 border-t border-base-300/40 bg-base-200/20 p-4">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  phase === "waiting"
                    ? "Type your response… (Enter to send, Shift+Enter for new line)"
                    : "Waiting for AI…"
                }
                disabled={phase !== "waiting"}
                rows={3}
                className="flex-1 resize-none rounded-xl border border-base-300/40 bg-base-300/20 px-4 py-3 text-sm text-base-content placeholder:text-base-content/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-40 disabled:cursor-not-allowed transition-default"
              />
              <button
                type="button"
                onClick={handleSendReply}
                disabled={!canSend}
                className="btn btn-primary rounded-xl px-4 py-3 h-auto disabled:opacity-40"
                aria-label="Send reply"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="mt-1.5 text-xs text-base-content/30 text-right">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Setup screen ────────────────────────────────────────────────────────────

function SetupScreen({
  question,
  apiKey,
  canStart,
  isStarting,
  onStart,
}: {
  question: Question
  apiKey: string | null
  canStart: boolean
  isStarting: boolean
  onStart: () => void
}) {
  const steps = [
    {
      icon: MessageSquare,
      text: "The AI will guide you through the problem with probing questions",
    },
    {
      icon: Brain,
      text: "Answer conversationally — explain your reasoning as you'd do in a real interview",
    },
    {
      icon: BarChart3,
      text: "Receive structured scores across 7 dimensions when you're done",
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12">
      <div className="w-full max-w-lg text-center">

        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Mic size={28} className="text-primary" />
          </div>
        </div>

        {/* Title & subtitle */}
        <h2 className="mb-2 text-xl font-bold text-base-content">Interview Mode</h2>
        <p className="mb-2 text-sm font-medium text-base-content/60">{question.title}</p>
        <p className="mb-8 text-sm text-base-content/40 leading-relaxed">
          Practice your system design skills in a live interview format. The AI interviewer
          will ask follow-up questions and probe your architecture decisions.
        </p>

        {/* Steps */}
        <div className="mb-8 space-y-3 text-left">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-base-300/40 bg-base-200/50 px-4 py-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={14} />
                </div>
                <p className="text-sm text-base-content/70">{step.text}</p>
              </div>
            )
          })}
        </div>

        {/* API key warning */}
        {!apiKey && (
          <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-left">
            <p className="text-xs text-warning">
              ⚠ Add your OpenAI API key in the left panel before starting.
            </p>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart || isStarting}
          className="btn btn-primary btn-wide rounded-xl gap-2 text-base"
        >
          {isStarting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          Begin Interview
        </button>

        <p className="mt-3 text-xs text-base-content/30">
          Typically takes 10–20 minutes
        </p>
      </div>
    </div>
  )
}

// ── Interview bubble ─────────────────────────────────────────────────────────

function InterviewBubble({ message }: { message: Message }) {
  const isAgent  = message.role === "agent"
  const isSystem = message.role === "system"
  const time     = message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-base-content/30 bg-base-300/20 rounded-full px-3 py-1">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-start gap-3", !isAgent && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          isAgent
            ? "bg-primary/15 text-primary"
            : "bg-base-300/60 text-base-content/60",
        )}
      >
        {isAgent ? <Brain size={14} /> : "You"}
      </div>

      {/* Bubble + timestamp */}
      <div className={cn("flex flex-col gap-1 max-w-[75%]", !isAgent && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isAgent
              ? "rounded-tl-sm bg-base-200/80 text-base-content"
              : "rounded-tr-sm bg-primary/15 text-base-content",
          )}
        >
          {isAgent ? (
            <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        <span className="text-[10px] text-base-content/30 px-1">{time}</span>
      </div>
    </div>
  )
}

// ── Evaluation progress ───────────────────────────────────────────────────────

function EvalProgressCard({ dims, done }: { dims: string[]; done: string[] }) {
  return (
    <div className="rounded-2xl border border-base-300/40 bg-base-200/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Loader2 size={14} className="animate-spin text-primary" />
        <p className="text-sm font-medium text-base-content/70">Evaluating your design…</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {dims.map((dim) => {
          const finished = done.includes(dim)
          const label    = DIMENSION_LABELS[dim] ?? dim
          return (
            <span
              key={dim}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-all duration-500",
                finished
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-base-300/30 bg-base-300/20 text-base-content/30",
              )}
            >
              {finished && "✓ "}{label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Done card ────────────────────────────────────────────────────────────────

function DoneCard({ onViewFeedback }: { onViewFeedback: () => void }) {
  return (
    <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 size={24} />
        </div>
      </div>
      <h3 className="text-base font-semibold text-base-content mb-1">Interview Complete!</h3>
      <p className="text-sm text-base-content/50 mb-5">
        Your design has been evaluated across all dimensions. View your detailed scores and
        actionable recommendations below.
      </p>
      <button
        type="button"
        onClick={onViewFeedback}
        className="btn btn-success btn-wide rounded-xl gap-2"
      >
        <BarChart3 size={15} />
        View Full Feedback →
      </button>
    </div>
  )
}

// ── Status pill ──────────────────────────────────────────────────────────────

function InterviewStatusPill({ phase }: { phase: Phase }) {
  const cfg: Record<Phase, { label: string; cls: string }> = {
    setup:      { label: "Ready",      cls: "bg-base-300/40 text-base-content/40" },
    starting:   { label: "Starting",   cls: "bg-primary/10 text-primary" },
    thinking:   { label: "Thinking",   cls: "bg-primary/10 text-primary" },
    waiting:    { label: "Your turn",  cls: "bg-success/10 text-success" },
    replying:   { label: "Sending",    cls: "bg-primary/10 text-primary" },
    evaluating: { label: "Evaluating", cls: "bg-info/10 text-info" },
    done:       { label: "Complete",   cls: "bg-success/10 text-success" },
  }
  const { label, cls } = cfg[phase]
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        cls,
      )}
    >
      {label}
    </span>
  )
}
