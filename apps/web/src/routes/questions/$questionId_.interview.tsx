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
        // Auto-navigate to results after a short delay
        setTimeout(() => {
          navigate({
            to: "/questions/$questionId/result/$submissionId",
            params: { questionId, submissionId: evt.submissionId },
          } as never)
        }, 2500)
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
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <span className="w-5 h-5 rounded-full border-2 animate-spin inline-block" style={{ borderColor: "#2d3449", borderTopColor: "#6366f1" }} />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center" style={{ color: "#464554" }}>
        Question not found.
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">

      {/* ─── Interview Header ──────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center gap-4 px-4" style={{ borderBottom: "1px solid #1e2a3d", background: "#0b1326" }}>

        {/* Left: title + live badge */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/questions/$questionId"
            params={{ questionId }}
            className="transition-colors"
            style={{ color: "#464554" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#908fa0" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#464554" }}
            aria-label="Back to workspace"
          >
            ←
          </Link>
          <h1 className="text-sm font-semibold truncate max-w-[300px]" style={{ color: "#dae2fd" }}>
            {question.title}
          </h1>
          {isLive && (
            <span className="flex items-center gap-1 shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: phase === "evaluating" ? "#fbbf24" : "#ffb4ab" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: phase === "evaluating" ? "#fbbf24" : "#ffb4ab" }} />
              {phase === "evaluating" ? "Evaluating" : "Live"}
            </span>
          )}
        </div>

        {/* Center: canvas controls */}
        <div className="flex items-center gap-1 ml-4">
          {[{ Icon: Undo2, title: "Undo" }, { Icon: Redo2, title: "Redo" }, null, { Icon: ZoomIn, title: "Zoom in" }, { Icon: ZoomOut, title: "Zoom out" }].map((item, idx) => {
            if (item === null) {
              // biome-ignore lint/suspicious/noArrayIndexKey: static list, separator uses index
              return <div key={idx} className="h-3.5 w-px mx-1" style={{ background: "#2d3449" }} />
            }
            return (
              <button
                key={item.title}
                type="button"
                className="flex items-center justify-center rounded px-1.5 py-1 transition-colors"
                style={{ color: "#464554", background: "transparent" }}
                disabled
                title={item.title}
              >
                <item.Icon size={13} />
              </button>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: timer + tabs + end session */}
        <div className="flex items-center gap-3 shrink-0">
          {isLive && (
            <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs" style={{ border: "1px solid #2d3449", background: "rgba(255,255,255,0.03)", color: "#908fa0" }}>
              <Clock size={12} />
              {elapsedStr}
            </div>
          )}

          {/* Right panel tabs */}
          <div className="flex items-center rounded-lg overflow-hidden text-[10px] font-bold tracking-wider uppercase" style={{ border: "1px solid #2d3449" }}>
            <button
              type="button"
              onClick={() => setRightTab("chat")}
              className="px-3 py-1.5 transition-all"
              style={{
                background: rightTab === "chat" ? "#6366f1" : "transparent",
                color: rightTab === "chat" ? "#fff" : "#908fa0",
              }}
            >
              Interview Chat
            </button>
            <button
              type="button"
              onClick={() => setRightTab("hints")}
              className="px-3 py-1.5 transition-all"
              style={{
                borderLeft: "1px solid #2d3449",
                background: rightTab === "hints" ? "#6366f1" : "transparent",
                color: rightTab === "hints" ? "#fff" : "#908fa0",
              }}
            >
              Hints &amp; Docs
            </button>
          </div>

          {isLive && phase !== "done" && (
            <button
              type="button"
              onClick={handleEndSession}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{ border: "1px solid rgba(255,180,171,0.3)", color: "#ffb4ab", background: "transparent" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,180,171,0.08)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
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
                <div className="flex h-full items-center justify-center gap-2 text-sm" style={{ color: "#464554" }}>
                  <span className="w-4 h-4 rounded-full border-2 animate-spin inline-block" style={{ borderColor: "#2d3449", borderTopColor: "#6366f1" }} />
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
              <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(11,19,38,0.7)", backdropFilter: "blur(2px)" }}>
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
        <div className="flex w-[380px] shrink-0 flex-col" style={{ borderLeft: "1px solid #1e2a3d", background: "#0b1326" }}>

          {/* ── INTERVIEW CHAT tab ── */}
          {rightTab === "chat" && (
            <>
              {/* Agent header */}
              {isLive && (
                <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #1e2a3d" }}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(99,102,241,0.15)", color: "#8083ff" }}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#dae2fd" }}>ArchMaster AI</p>
                    {agentStatus && (
                      <p className="flex items-center gap-1.5 text-[11px]" style={{ color: phase === "waiting" ? "#4edea3" : "#464554" }}>
                        <span
                          className={phase !== "waiting" ? "animate-pulse" : ""}
                          style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: phase === "waiting" ? "#4edea3" : "#464554" }}
                        />
                        {agentStatus}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {!isLive && (
                  <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "#464554" }}>
                    <Mic size={24} style={{ color: "rgba(128,131,255,0.4)" }} />
                    <p className="text-xs text-center">Start the interview to begin<br/>your design session</p>
                  </div>
                )}

                {messages.map((msg, i) => {
                  // biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only
                  return <ChatBubble key={i} message={msg} onChipClick={handleSendReply} phase={phase} />
                })}

                {/* Typing indicator */}
                {(phase === "thinking" || phase === "replying") && (
                  <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(99,102,241,0.15)", color: "#8083ff" }}>
                      <Sparkles size={12} />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-3 py-2.5" style={{ background: "#131b2e" }}>
                      <span className="text-[10px] italic" style={{ color: "#464554" }}>
                        {phase === "thinking" ? "Analyzing architecture…" : "Processing response…"}
                      </span>
                      <span className="flex gap-0.5 ml-1">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="h-1 w-1 rounded-full animate-bounce"
                            style={{ background: "#464554", animationDelay: `${delay}ms` }}
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
                <div className="shrink-0" style={{ borderTop: "1px solid #1e2a3d", background: "#0a1020" }}>
                  <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid #1e2a3d" }}>
                    <BarChart3 size={11} style={{ color: "#464554" }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#464554" }}>
                      Evaluation Stream
                    </span>
                    <div className="ml-auto flex gap-1">
                      {(["STRUCT", "LINK", "RISK"] as const).map((t) => (
                        <span key={t} className="h-1.5 w-1.5 rounded-sm" style={{ background: t === "STRUCT" ? "#8083ff" : t === "LINK" ? "#38bdf8" : "#ffb4ab" }} />
                      ))}
                    </div>
                  </div>
                  <div className="max-h-[120px] overflow-y-auto p-2 space-y-1 font-mono text-[10px]">
                    {evalLogs.slice(-20).map((entry, i) => {
                      // biome-ignore lint/suspicious/noArrayIndexKey: eval logs are append-only
                      return (
                        <div key={i} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="shrink-0" style={{ color: "#464554" }}>{entry.time}</span>
                          <span className="shrink-0 font-bold" style={{ color: entry.tag === "STRUCT" ? "#8083ff" : entry.tag === "LINK" ? "#38bdf8" : entry.tag === "RISK" ? "#ffb4ab" : "#464554" }}>
                            [{entry.tag}]
                          </span>
                          <span className="break-all" style={{ color: "#908fa0" }}>{entry.text}</span>
                        </div>
                      )
                    })}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}

              {/* Input */}
              {isLive && phase !== "done" && (
                <div className="shrink-0 p-3" style={{ borderTop: "1px solid #1e2a3d" }}>
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
                      className="flex-1 resize-none rounded-xl px-3 py-2 text-xs outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "#131b2e", border: "1px solid #2d3449", color: "#dae2fd" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(128,131,255,0.5)" }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449" }}
                    />
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                        style={{ border: "1px solid #2d3449", color: "#464554", background: "transparent" }}
                        title="Voice input (not available)"
                        disabled
                      >
                        <Mic size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendReply()}
                        disabled={!canSend}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-30 hover:brightness-110"
                        style={{ background: "#6366f1", color: "#fff" }}
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
    <div className="w-[420px] rounded-2xl p-8 text-center shadow-2xl" style={{ border: "1px solid #2d3449", background: "#131b2e", backdropFilter: "blur(12px)" }}>
      <div className="mb-5 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <Mic size={26} style={{ color: "#8083ff" }} />
        </div>
      </div>
      <h2 className="mb-1 text-lg font-bold" style={{ color: "#dae2fd" }}>Interview Mode</h2>
      <p className="mb-5 text-sm leading-relaxed" style={{ color: "#908fa0" }}>
        {questionTitle}
      </p>
      <div className="mb-6 space-y-2.5 text-left">
        {[
          "Draw your architecture on the canvas — the AI observes your diagram",
          "Answer the AI's probing questions to explain your design decisions",
          "Receive structured feedback across 7 evaluation dimensions",
        ].map((step, i) => {
          // biome-ignore lint/suspicious/noArrayIndexKey: static ordered list
          return (
            <div key={i} className="flex items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ border: "1px solid #2d3449", background: "rgba(255,255,255,0.02)" }}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "rgba(99,102,241,0.15)", color: "#8083ff" }}>
                {i + 1}
              </span>
              <p className="text-xs leading-relaxed" style={{ color: "#908fa0" }}>{step}</p>
            </div>
          )
        })}
      </div>
      {!apiKey && (
        <div className="mb-4 rounded-xl px-3 py-2.5 text-left" style={{ border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.05)" }}>
          <p className="text-xs" style={{ color: "#fbbf24" }}>⚠ Add your OpenAI API key in Settings before starting.</p>
        </div>
      )}
      <button
        type="button"
        onClick={onStart}
        disabled={!apiKey || isStarting}
        className="inline-flex items-center justify-center gap-2 w-full rounded-xl px-6 py-3 font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "#6366f1", border: "1px solid rgba(99,102,241,0.5)", boxShadow: "0 0 16px rgba(99,102,241,0.3)" }}
      >
        {isStarting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        Begin Interview
      </button>
      <p className="mt-3 text-[11px]" style={{ color: "#464554" }}>Typically 10–20 minutes</p>
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
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
        style={isAgent
          ? { background: "rgba(99,102,241,0.15)", color: "#8083ff" }
          : { background: "rgba(255,255,255,0.06)", color: "#908fa0" }
        }
      >
        {isAgent ? <Sparkles size={12} /> : "You"}
      </div>

      <div className={cn("flex flex-col gap-1 max-w-[82%]", !isAgent && "items-end")}>
        {/* Agent name */}
        {isAgent && (
          <span className="text-[10px] font-medium px-1" style={{ color: "#464554" }}>ArchMaster AI</span>
        )}

        <div
          className="rounded-2xl px-3 py-2.5 text-xs leading-relaxed"
          style={isAgent
            ? { background: "#131b2e", border: "1px solid rgba(128,131,255,0.12)", borderRadius: "16px 16px 16px 4px", color: "#c7c4d7" }
            : { background: "#1e2a42", border: "1px solid #2d3449", borderRadius: "16px 16px 4px 16px", color: "#c7c4d7" }
          }
        >
          {isAgent ? (
            <div className="max-w-none text-xs [&_code]:px-1 [&_code]:rounded" style={{ lineHeight: 1.6, color: "#c7c4d7" }}>
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
                className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-all"
                style={{ border: "1px solid #2d3449", background: "rgba(255,255,255,0.03)", color: "#908fa0" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.borderColor = "rgba(128,131,255,0.3)"; e.currentTarget.style.color = "#8083ff" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.color = "#908fa0" }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <span className="text-[9px] px-1" style={{ color: "#464554" }}>{time}</span>
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
    <div className="rounded-xl p-3" style={{ border: "1px solid #2d3449", background: "#0f1729" }}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <Loader2 size={11} className="animate-spin" style={{ color: "#8083ff" }} />
        <span className="text-xs font-medium" style={{ color: "#908fa0" }}>Evaluating dimensions…</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {dims.map((dim) => {
          const finished = done.includes(dim)
          return (
            <span
              key={dim}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-500"
              style={finished
                ? { border: "1px solid rgba(78,222,163,0.4)", background: "rgba(78,222,163,0.1)", color: "#4edea3" }
                : { border: "1px solid #2d3449", background: "rgba(255,255,255,0.02)", color: "#464554" }
              }
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
    <div className="rounded-2xl p-4 text-center" style={{ border: "1px solid rgba(78,222,163,0.25)", background: "rgba(78,222,163,0.06)" }}>
      <div className="flex justify-center mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(78,222,163,0.12)", color: "#4edea3" }}>
          <CheckCircle2 size={20} />
        </div>
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: "#dae2fd" }}>Interview Complete!</h3>
      <p className="text-xs mb-3" style={{ color: "#908fa0" }}>
        Your design has been fully evaluated. View your detailed scores and recommendations.
      </p>
      <button
        type="button"
        onClick={onViewFeedback}
        className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95"
        style={{ background: "#4edea3", color: "#0b1326", border: "none" }}
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
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#464554" }}>
          Problem
        </p>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "#dae2fd" }}>{question.title}</h3>
        <div className="max-w-none text-xs leading-relaxed" style={{ color: "#908fa0" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.prompt}</ReactMarkdown>
        </div>
      </div>

      {(question.hints?.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#464554" }}>
            Key Areas to Cover
          </p>
          <div className="space-y-1.5">
            {question.hints!.map((hint, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg px-3 py-2"
                style={{ border: "1px solid #2d3449", background: "rgba(255,255,255,0.02)" }}
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "rgba(128,131,255,0.5)" }} />
                <p className="text-xs" style={{ color: "#908fa0" }}>{hint}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
