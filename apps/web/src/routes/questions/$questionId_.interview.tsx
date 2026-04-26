import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  useState,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useCallback,
} from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { QuestionDetail } from "@sysdesign/types"
import { useApiKey } from "@/components/ApiKeyInput"
import { useToast } from "@/components/Toast"
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Send,
  Mic,
  Loader2,
  Sparkles,
  BarChart3,
  CheckCircle2,
  X,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
)

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

// ── SSE event types ──────────────────────────────────────────────────────────

type SSEFollowupEvent  = { type: "followup";      question: string; submissionId: string }
type SSEEvalStartEvent = { type: "eval_start";    dimensions: string[] }
type SSEEvalProgEvent  = { type: "eval_progress"; dimensionId: string; score: number }
type SSEEvalDoneEvent  = { type: "eval_done";     submissionId: string }
type SSEErrorEvent     = { type: "error";         message: string }

// ── Evaluation log entry ─────────────────────────────────────────────────────

interface EvalLogEntry {
  time: string
  tag: "STRUCT" | "LINK" | "RISK" | "AUDIO" | "INFO"
  text: string
}

// ── Phase ────────────────────────────────────────────────────────────────────

type Phase =
  | "setup"
  | "starting"
  | "thinking"
  | "waiting"
  | "replying"
  | "evaluating"
  | "done"

// ── Message ──────────────────────────────────────────────────────────────────

interface Message {
  role: "agent" | "user"
  content: string
  timestamp: Date
  chips?: string[]
}

// ── Active right-panel tab ────────────────────────────────────────────────────

type RightTab = "chat" | "hints"

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/questions/$questionId_/interview")({
  component: InterviewPage,
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowHHMM() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function parseReasoningToLog(content: string): EvalLogEntry {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const lower = content.toLowerCase()
  if (lower.includes("risk") || lower.includes("bottleneck") || lower.includes("single point"))
    return { time: now, tag: "RISK", text: content }
  if (lower.includes("connection") || lower.includes("link") || lower.includes("->"))
    return { time: now, tag: "LINK", text: content }
  if (lower.includes("component") || lower.includes("added") || lower.includes("struct"))
    return { time: now, tag: "STRUCT", text: content }
  return { time: now, tag: "INFO", text: content }
}

// ── Page ─────────────────────────────────────────────────────────────────────

function InterviewPage() {
  const { questionId } = Route.useParams() as { questionId: string }
  const navigate       = useNavigate()
  const { toast }      = useToast()
  const apiKey         = useApiKey()

  const [phase,        setPhase]        = useState<Phase>("setup")
  const [rightTab,     setRightTab]     = useState<RightTab>("chat")
  const [messages,     setMessages]     = useState<Message[]>([])
  const [evalLogs,     setEvalLogs]     = useState<EvalLogEntry[]>([])
  const [evalDims,     setEvalDims]     = useState<string[]>([])
  const [evalDone,     setEvalDone]     = useState<string[]>([])
  const [input,        setInput]        = useState("")
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [elapsed,      setElapsed]      = useState(0)

  const phaseRef       = useRef<Phase>("setup")
  const sseRef         = useRef<EventSource | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const logsEndRef     = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { phaseRef.current = phase }, [phase])

  const { data: question, isLoading } = useQuery<QuestionDetail>({
    queryKey: ["question", questionId],
    queryFn: () => fetch(`${API}/api/questions/${questionId}`).then((r) => r.json()),
  })

  // Elapsed timer — starts on interview begin
  useEffect(() => {
    if (phase === "thinking" || phase === "waiting" || phase === "replying" || phase === "evaluating") {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
      }
    }
    if (phase === "done" || phase === "setup") {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => {}
  }, [phase])

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    sseRef.current?.close()
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, phase])

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever logs change
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [evalLogs])

  useEffect(() => {
    if (phase === "waiting") {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [phase])

  const elapsedStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, "0")}`

  // ── SSE ───────────────────────────────────────────────────────────────────

  const openSSE = useCallback(
    (sid: string) => {
      const es = new EventSource(`${API}/api/submissions/${sid}/events`, {
        withCredentials: true,
      } as EventSourceInit)
      sseRef.current = es

      es.addEventListener("reasoning", (e) => {
        const data = JSON.parse((e as MessageEvent).data) as { type: string; content: string }
        const entry = parseReasoningToLog(data.content)
        setEvalLogs((prev) => [...prev, entry])
        setPhase((p) =>
          p === "starting" || p === "thinking" || p === "waiting" || p === "replying"
            ? "thinking"
            : p,
        )
      })

      es.addEventListener("followup", (e) => {
        const evt = JSON.parse((e as MessageEvent).data) as SSEFollowupEvent
        // Detect quick-reply chips from common patterns
        const chips: string[] = []
        const q = evt.question.toLowerCase()
        if (q.includes("shard") || q.includes("partition")) chips.push("Suggest Sharding")
        if (q.includes("nosql") || q.includes("database") || q.includes("datastore")) chips.push("Propose NoSQL")
        if (q.includes("cach")) chips.push("Add Redis Cache")
        if (q.includes("hint")) chips.push("Request Hint")
        setMessages((prev) => [
          ...prev,
          { role: "agent", content: evt.question, timestamp: new Date(), chips: chips.length ? chips : undefined },
        ])
        setEvalLogs((prev) => [
          ...prev,
          { time: nowHHMM(), tag: "INFO", text: "AI asked follow-up question" },
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
            role: "agent",
            content: "Great discussion! I'm now evaluating your overall design across all dimensions…",
            timestamp: new Date(),
          },
        ])
      })

      es.addEventListener("eval_progress", (e) => {
        const evt = JSON.parse((e as MessageEvent).data) as SSEEvalProgEvent
        setEvalDone((prev) => [...prev, evt.dimensionId])
        setEvalLogs((prev) => [
          ...prev,
          { time: nowHHMM(), tag: "STRUCT", text: `Scored ${evt.dimensionId}: ${evt.score}/100` },
        ])
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

  // ── Start interview ───────────────────────────────────────────────────────

  async function handleStart() {
    if (!apiKey) { toast("Add your OpenAI API key in Settings first", "error"); return }
    setPhase("starting")

    const emptyRoot = {
      root: { children: [], direction: null, format: "", indent: 0, type: "root", version: 1 },
    }

    try {
      const res = await fetch(`${API}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questionId, lexicalState: emptyRoot, strategy: "agentic" }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Failed to start interview (HTTP ${res.status})`)
      }
      const { submissionId: sid } = await res.json() as { submissionId: string }
      setSubmissionId(sid)
      setPhase("thinking")
      setMessages([])
      setEvalLogs([{ time: nowHHMM(), tag: "INFO", text: "Interview session started" }])
      openSSE(sid)
    } catch (err) {
      toast((err as Error).message, "error")
      setPhase("setup")
    }
  }

  // ── End session ───────────────────────────────────────────────────────────

  function handleEndSession() {
    sseRef.current?.close()
    sseRef.current = null
    setPhase("setup")
    setMessages([])
    setEvalLogs([])
    setElapsed(0)
    setSubmissionId(null)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  // ── Send reply ────────────────────────────────────────────────────────────

  async function handleSendReply(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || !submissionId || phase !== "waiting") return

    setMessages((prev) => [
      ...prev,
      { role: "user", content: msg, timestamp: new Date() },
    ])
    setInput("")
    setPhase("replying")
    setEvalLogs((prev) => [
      ...prev,
      { time: nowHHMM(), tag: "AUDIO", text: "User responded" },
    ])

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

  // ── Derived ───────────────────────────────────────────────────────────────

  const isLive  = phase !== "setup" && phase !== "starting"
  const canSend = input.trim().length > 0 && phase === "waiting"
  const agentStatus =
    phase === "thinking"   ? "Analyzing Architecture…"  :
    phase === "waiting"    ? "Listening"                 :
    phase === "replying"   ? "Processing…"               :
    phase === "evaluating" ? "Evaluating Design…"        :
    phase === "done"       ? "Complete"                  : ""

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <div className="loading loading-spinner loading-md text-primary" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center text-base-content/40">
        Question not found.
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

      {/* ─── Interview Header ──────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-base-300/40 bg-base-200/40 px-4">

        {/* Left: title + live badge */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/questions/$questionId"
            params={{ questionId }}
            className="text-base-content/30 hover:text-base-content/60 transition-default"
            aria-label="Back to workspace"
          >
            ←
          </Link>
          <h1 className="text-sm font-semibold text-base-content truncate max-w-[300px]">
            {question.title}
          </h1>
          {isLive && (
            <span className="flex items-center gap-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-error">
              <span className="h-1.5 w-1.5 rounded-full bg-error animate-pulse" />
              {phase === "evaluating" ? "Evaluating" : "Live"}
            </span>
          )}
        </div>

        {/* Center: canvas controls */}
        <div className="flex items-center gap-1 ml-4">
          <button type="button" className="btn btn-ghost btn-xs rounded px-1.5" disabled title="Undo">
            <Undo2 size={13} />
          </button>
          <button type="button" className="btn btn-ghost btn-xs rounded px-1.5" disabled title="Redo">
            <Redo2 size={13} />
          </button>
          <div className="h-3.5 w-px bg-base-300/50 mx-1" />
          <button type="button" className="btn btn-ghost btn-xs rounded px-1.5" disabled title="Zoom in">
            <ZoomIn size={13} />
          </button>
          <button type="button" className="btn btn-ghost btn-xs rounded px-1.5" disabled title="Zoom out">
            <ZoomOut size={13} />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: timer + tabs + end session */}
        <div className="flex items-center gap-3 shrink-0">
          {isLive && (
            <div className="flex items-center gap-1.5 rounded-lg border border-base-300/50 bg-base-300/20 px-2.5 py-1 font-mono text-xs text-base-content/50">
              <Clock size={12} />
              {elapsedStr}
            </div>
          )}

          {/* Right panel tabs */}
          <div className="flex items-center rounded-lg border border-base-300/40 overflow-hidden text-[10px] font-bold tracking-wider uppercase">
            <button
              type="button"
              onClick={() => setRightTab("chat")}
              className={cn(
                "px-3 py-1.5 transition-default",
                rightTab === "chat"
                  ? "bg-primary text-primary-content"
                  : "text-base-content/40 hover:text-base-content/70 hover:bg-base-300/30",
              )}
            >
              Interview Chat
            </button>
            <button
              type="button"
              onClick={() => setRightTab("hints")}
              className={cn(
                "px-3 py-1.5 border-l border-base-300/40 transition-default",
                rightTab === "hints"
                  ? "bg-primary text-primary-content"
                  : "text-base-content/40 hover:text-base-content/70 hover:bg-base-300/30",
              )}
            >
              Hints &amp; Docs
            </button>
          </div>

          {isLive && phase !== "done" && (
            <button
              type="button"
              onClick={handleEndSession}
              className="btn btn-ghost btn-xs rounded-lg border border-error/40 text-error hover:bg-error/10 gap-1.5"
            >
              <X size={12} />
              End Session
            </button>
          )}
        </div>
      </header>

      {/* ─── Main 2-pane layout ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Canvas ─────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden relative">

          {/* Excalidraw */}
          <div className="relative flex-1 overflow-hidden" role="region" aria-label="Architecture diagram canvas">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center gap-2 text-sm text-base-content/30">
                  <div className="loading loading-spinner loading-sm text-primary" />
                  Loading canvas…
                </div>
              }
            >
              <Excalidraw
                theme="dark"
                UIOptions={{ canvasActions: { export: false } }}
                onChange={() => {
                  // Diagram changes tracked by Excalidraw internally
                }}
              />
            </Suspense>

            {/* Setup overlay — shown before interview starts */}
            {(phase === "setup" || phase === "starting") && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-base-300/5 backdrop-blur-[1px]">
                <SetupCard
                  apiKey={apiKey}
                  isStarting={phase === "starting"}
                  onStart={handleStart}
                  questionTitle={question.title}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel ──────────────────────────────────────────── */}
        <div className="flex w-[380px] shrink-0 flex-col border-l border-base-300/40 bg-base-200/20">

          {/* ── INTERVIEW CHAT tab ── */}
          {rightTab === "chat" && (
            <>
              {/* Agent header */}
              {isLive && (
                <div className="flex items-center gap-3 border-b border-base-300/30 px-4 py-3 shrink-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-base-content">ArchMaster AI</p>
                    {agentStatus && (
                      <p className={cn(
                        "flex items-center gap-1.5 text-[11px]",
                        phase === "waiting" ? "text-success" : "text-base-content/40",
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          phase === "waiting" ? "bg-success" : "bg-base-content/30 animate-pulse",
                        )} />
                        {agentStatus}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {!isLive && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-base-content/30">
                    <Mic size={24} className="text-primary/50" />
                    <p className="text-xs text-center">Start the interview to begin<br/>your design session</p>
                  </div>
                )}

                {/* biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only */}
                {messages.map((msg, i) => (
                  <ChatBubble key={i} message={msg} onChipClick={handleSendReply} phase={phase} />
                ))}

                {/* Typing indicator */}
                {(phase === "thinking" || phase === "replying") && (
                  <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Sparkles size={12} />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-base-200 px-3 py-2.5">
                      <span className="text-[10px] text-base-content/30 italic">
                        {phase === "thinking" ? "Analyzing architecture…" : "Processing response…"}
                      </span>
                      <span className="flex gap-0.5 ml-1">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="h-1 w-1 rounded-full bg-base-content/30 animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Evaluation progress */}
                {phase === "evaluating" && evalDims.length > 0 && (
                  <EvalProgressRow dims={evalDims} done={evalDone} />
                )}

                {/* Done */}
                {phase === "done" && (
                  <DoneCard onViewFeedback={handleViewFeedback} />
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Evaluation Stream */}
              {isLive && evalLogs.length > 0 && (
                <div className="shrink-0 border-t border-base-300/30 bg-base-300/10">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-base-300/20">
                    <BarChart3 size={11} className="text-base-content/30" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-base-content/30">
                      Evaluation Stream
                    </span>
                    <div className="ml-auto flex gap-1">
                      {(["STRUCT", "LINK", "RISK"] as const).map((t) => (
                        <span key={t} className={cn("h-1.5 w-1.5 rounded-sm", tagColor(t, "dot"))} />
                      ))}
                    </div>
                  </div>
                  <div className="max-h-[120px] overflow-y-auto p-2 space-y-1 font-mono text-[10px]">
                    {/* biome-ignore lint/suspicious/noArrayIndexKey: eval logs are append-only */}
                    {evalLogs.slice(-20).map((entry, i) => (
                      <div key={i} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="shrink-0 text-base-content/25">{entry.time}</span>
                        <span className={cn("shrink-0 font-bold", tagColor(entry.tag, "text"))}>
                          [{entry.tag}]
                        </span>
                        <span className="text-base-content/50 break-all">{entry.text}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}

              {/* Input */}
              {isLive && phase !== "done" && (
                <div className="shrink-0 border-t border-base-300/30 p-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        phase === "waiting"
                          ? "Explain your approach…"
                          : "Waiting for AI…"
                      }
                      disabled={phase !== "waiting"}
                      rows={2}
                      className="flex-1 resize-none rounded-xl border border-base-300/40 bg-base-300/20 px-3 py-2 text-xs text-base-content placeholder:text-base-content/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-40 disabled:cursor-not-allowed transition-default"
                    />
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-base-300/40 text-base-content/30 hover:text-base-content/60 transition-default"
                        title="Voice input (not available)"
                        disabled
                      >
                        <Mic size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendReply()}
                        disabled={!canSend}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-content disabled:opacity-30 transition-default hover:brightness-110"
                        aria-label="Send"
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── HINTS & DOCS tab ── */}
          {rightTab === "hints" && (
            <HintsTab question={question} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Setup card overlay ────────────────────────────────────────────────────────

function SetupCard({
  apiKey,
  isStarting,
  onStart,
  questionTitle,
}: {
  apiKey: string | null
  isStarting: boolean
  onStart: () => void
  questionTitle: string
}) {
  return (
    <div className="w-[420px] rounded-2xl border border-base-300/40 bg-base-200/90 p-8 text-center shadow-2xl backdrop-blur-md">
      <div className="mb-5 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <Mic size={26} className="text-primary" />
        </div>
      </div>
      <h2 className="mb-1 text-lg font-bold">Interview Mode</h2>
      <p className="mb-5 text-sm text-base-content/50 leading-relaxed">
        {questionTitle}
      </p>
      <div className="mb-6 space-y-2.5 text-left">
        {[
          "Draw your architecture on the canvas — the AI observes your diagram",
          "Answer the AI's probing questions to explain your design decisions",
          "Receive structured feedback across 7 evaluation dimensions",
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-xl border border-base-300/30 bg-base-300/20 px-3 py-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              {i + 1}
            </span>
            <p className="text-xs text-base-content/60 leading-relaxed">{step}</p>
          </div>
        ))}
      </div>
      {!apiKey && (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2.5 text-left">
          <p className="text-xs text-warning">⚠ Add your OpenAI API key in Settings before starting.</p>
        </div>
      )}
      <button
        type="button"
        onClick={onStart}
        disabled={!apiKey || isStarting}
        className="btn btn-primary btn-wide rounded-xl gap-2"
      >
        {isStarting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        Begin Interview
      </button>
      <p className="mt-3 text-[11px] text-base-content/25">Typically 10–20 minutes</p>
    </div>
  )
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

function ChatBubble({
  message,
  onChipClick,
  phase,
}: {
  message: Message
  onChipClick: (text: string) => void
  phase: Phase
}) {
  const isAgent = message.role === "agent"
  const time    = message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <div className={cn("flex items-start gap-2", !isAgent && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
        isAgent ? "bg-primary/15 text-primary" : "bg-base-300/60 text-base-content/50",
      )}>
        {isAgent ? <Sparkles size={12} /> : "You"}
      </div>

      <div className={cn("flex flex-col gap-1 max-w-[82%]", !isAgent && "items-end")}>
        {/* Agent name */}
        {isAgent && (
          <span className="text-[10px] font-medium text-base-content/40 px-1">ArchMaster AI</span>
        )}

        <div className={cn(
          "rounded-2xl px-3 py-2.5 text-xs leading-relaxed",
          isAgent
            ? "rounded-tl-sm bg-base-200 text-base-content"
            : "rounded-tr-sm bg-primary/15 text-base-content",
        )}>
          {isAgent ? (
            <div className="prose prose-sm prose-invert max-w-none text-xs [&_code]:bg-base-300/60 [&_code]:px-1 [&_code]:rounded [&_code]:text-accent">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Quick-reply chips */}
        {isAgent && message.chips && message.chips.length > 0 && phase === "waiting" && (
          <div className="flex flex-wrap gap-1.5 mt-1 px-1">
            {message.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onChipClick(chip)}
                className="rounded-full border border-base-300/50 bg-base-300/20 px-2.5 py-1 text-[10px] font-medium text-base-content/60 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-default"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <span className="text-[9px] text-base-content/20 px-1">{time}</span>
      </div>
    </div>
  )
}

// ── Eval progress row ─────────────────────────────────────────────────────────

const DIM_LABELS: Record<string, string> = {
  requirements:    "Requirements",
  scalability:     "Scalability",
  db_design:       "DB Design",
  fault_tolerance: "Fault Tolerance",
  api_design:      "API Design",
  caching:         "Caching",
  trade_offs:      "Trade-offs",
}

function EvalProgressRow({ dims, done }: { dims: string[]; done: string[] }) {
  return (
    <div className="rounded-xl border border-base-300/30 bg-base-200/60 p-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Loader2 size={11} className="animate-spin text-primary" />
        <span className="text-xs font-medium text-base-content/50">Evaluating dimensions…</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {dims.map((dim) => {
          const finished = done.includes(dim)
          return (
            <span
              key={dim}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all duration-500",
                finished
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-base-300/30 bg-base-300/10 text-base-content/25",
              )}
            >
              {finished ? "✓ " : ""}{DIM_LABELS[dim] ?? dim}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Done card ─────────────────────────────────────────────────────────────────

function DoneCard({ onViewFeedback }: { onViewFeedback: () => void }) {
  return (
    <div className="rounded-2xl border border-success/30 bg-success/5 p-4 text-center">
      <div className="flex justify-center mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 size={20} />
        </div>
      </div>
      <h3 className="text-sm font-semibold mb-1">Interview Complete!</h3>
      <p className="text-xs text-base-content/40 mb-3">
        Your design has been fully evaluated. View your detailed scores and recommendations.
      </p>
      <button
        type="button"
        onClick={onViewFeedback}
        className="btn btn-success btn-sm rounded-xl gap-1.5 w-full"
      >
        <BarChart3 size={13} />
        View Full Feedback →
      </button>
    </div>
  )
}

// ── Hints & Docs tab ──────────────────────────────────────────────────────────

function HintsTab({ question }: { question: QuestionDetail }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-base-content/30">
          Problem
        </p>
        <h3 className="text-sm font-semibold mb-2">{question.title}</h3>
        <div className="prose prose-sm prose-invert max-w-none text-xs text-base-content/50 leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.prompt}</ReactMarkdown>
        </div>
      </div>

      {(question.hints?.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-base-content/30">
            Key Areas to Cover
          </p>
          <div className="space-y-1.5">
            {question.hints!.map((hint, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-base-300/30 bg-base-300/10 px-3 py-2"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                <p className="text-xs text-base-content/50">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tag color helper ──────────────────────────────────────────────────────────

function tagColor(tag: EvalLogEntry["tag"], mode: "text" | "dot"): string {
  if (mode === "dot") {
    const map: Record<EvalLogEntry["tag"], string> = {
      STRUCT: "bg-primary",
      LINK:   "bg-info",
      RISK:   "bg-error",
      AUDIO:  "bg-base-content/40",
      INFO:   "bg-base-content/20",
    }
    return map[tag] ?? "bg-base-content/20"
  }
  const map: Record<EvalLogEntry["tag"], string> = {
    STRUCT: "text-primary",
    LINK:   "text-info",
    RISK:   "text-error",
    AUDIO:  "text-base-content/40",
    INFO:   "text-base-content/30",
  }
  return map[tag] ?? "text-base-content/30"
}
