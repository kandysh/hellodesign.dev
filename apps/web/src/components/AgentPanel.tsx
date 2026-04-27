import { Brain, CheckCircle2, ChevronDown, ChevronRight, Info, Loader2, Send } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────

/** Matches the `eval_progress` SSE event payload from the worker */
interface EvalProgressItem {
  dimensionId: string
  score: number
}

export type AgentPanelState =
  | { phase: "idle" }
  | { phase: "processing"; trace: string[] }
  | { phase: "follow-up"; question: string; trace: string[] }
  | { phase: "evaluating"; agentResults: EvalProgressItem[] }
  | { phase: "done"; submissionId: string; agentResults: EvalProgressItem[] }

export interface Message {
  id: string
  role: "agent" | "user"
  content: string
  timestamp: Date
}

interface AgentPanelProps {
  state: AgentPanelState
  messages: Message[]
  userInitials?: string
  userAvatar?: string
  onSendMessage?: (msg: string) => void
  onViewFeedback?: (submissionId: string) => void
  className?: string
}

// ── Dimension evaluation pills ─────────────────────────────────────────────

const EVAL_DIMENSIONS = [
  "Requirements",
  "Capacity",
  "Architecture",
  "Data Model",
  "API Design",
  "Scalability",
  "Diagrams",
]

// ── Main panel ─────────────────────────────────────────────────────────────

export function AgentPanel({
  state,
  messages,
  userInitials = "?",
  userAvatar,
  onSendMessage,
  onViewFeedback,
  className,
}: AgentPanelProps) {
  const [input, setInput] = useState("")
  const [showTrace, setShowTrace] = useState(false)
  const traceRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll trace
  // biome-ignore lint/correctness/useExhaustiveDependencies: traceRef is a stable ref, state is the trigger
  useEffect(() => {
    if (traceRef.current) {
      traceRef.current.scrollTop = traceRef.current.scrollHeight
    }
  }, [state])

  // Auto-scroll messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: messagesEndRef is a stable ref
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleSend() {
    const msg = input.trim()
    if (!msg || !onSendMessage) return
    onSendMessage(msg)
    setInput("")
  }

  const trace = state.phase === "processing" || state.phase === "follow-up" ? state.trace : []

  return (
    <div
      className={cn("flex h-full flex-col border-l border-base-300/40 bg-base-200/50", className)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-base-300/40 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Brain size={14} />
        </div>
        <span className="text-sm font-semibold text-base-content">Agent</span>
        <StatusPill phase={state.phase} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Processing phase ── */}
        {state.phase === "processing" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <Loader2 size={14} className="animate-spin text-primary" />
              Agent is reading your answer…
            </div>
            <ReasoningTrace trace={trace} ref={traceRef} />
          </div>
        )}

        {/* ── Follow-up phase ── */}
        {state.phase === "follow-up" && (
          <div className="p-4 space-y-4">
            {/* Collapsed trace toggle */}
            <button
              type="button"
              onClick={() => setShowTrace((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-base-content/40 hover:text-base-content/60 transition-default"
            >
              {showTrace ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              Show reasoning trace
            </button>
            {showTrace && <ReasoningTrace trace={trace} ref={traceRef} />}
          </div>
        )}

        {/* ── Evaluating phase ── */}
        {state.phase === "evaluating" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <Loader2 size={14} className="animate-spin text-primary" />
              Evaluating your answer…
            </div>
            <div className="flex flex-wrap gap-2">
              {EVAL_DIMENSIONS.map((dim, i) => {
                const lit = i < (state.agentResults?.length ?? 0)
                return (
                  <span
                    key={dim}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-300",
                      lit
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-base-300/30 text-base-content/30 border border-base-300/30",
                    )}
                  >
                    {dim}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Messages (follow-up chat + done) ── */}
        {(state.phase === "follow-up" || state.phase === "done") && messages.length > 0 && (
          <div className="space-y-3 px-4 pb-4">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                userInitials={userInitials}
                userAvatar={userAvatar}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* ── Done phase ── */}
        {state.phase === "done" && (
          <div className="p-4">
            <button
              type="button"
              onClick={() => onViewFeedback?.(state.submissionId)}
              className="btn btn-success btn-block rounded-xl gap-2"
            >
              <CheckCircle2 size={16} />
              View full feedback →
            </button>
          </div>
        )}

        {/* ── Idle ── */}
        {state.phase === "idle" && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-base-content/30">
            <Brain size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Submit your answer to start the agent review.</p>
          </div>
        )}
      </div>

      {/* Input (always shown when not idle) */}
      {state.phase !== "idle" && (
        <div className="border-t border-base-300/40 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask the agent anything about your design…"
              className="input input-sm flex-1 rounded-lg border-base-300/40 bg-base-300/20 text-sm placeholder:text-base-content/30 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || !onSendMessage}
              className="btn btn-primary btn-sm rounded-lg px-3"
              aria-label="Send"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Status pill ────────────────────────────────────────────────────────────

function StatusPill({ phase }: { phase: AgentPanelState["phase"] }) {
  const config: Record<string, { label: string; classes: string }> = {
    idle: { label: "Idle", classes: "bg-base-300/40 text-base-content/40" },
    processing: { label: "Processing", classes: "bg-primary/10 text-primary" },
    "follow-up": { label: "Follow-up", classes: "bg-warning/10 text-warning" },
    evaluating: { label: "Evaluating", classes: "bg-info/10 text-info" },
    done: { label: "Done", classes: "bg-success/10 text-success" },
  }
  const pill = config[phase as keyof typeof config] ?? config.idle
  const label = pill.label
  const classes = pill.classes
  return (
    <span
      className={cn(
        "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        classes,
      )}
    >
      {label}
    </span>
  )
}

// ── Reasoning trace ────────────────────────────────────────────────────────

const ReasoningTrace = ({
  trace,
  ref,
}: {
  trace: string[]
  ref: React.RefObject<HTMLDivElement | null>
}) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5 text-xs text-base-content/40">
      <span>Reasoning trace</span>
      <span
        className="tooltip tooltip-right cursor-default"
        data-tip="This shows what the agent is thinking — not the final feedback."
      >
        <Info size={11} className="text-base-content/30" />
      </span>
    </div>
    <div ref={ref} className="reasoning-trace max-h-48 overflow-y-auto">
      {trace.length === 0 ? (
        <span className="opacity-50">Initializing…</span>
      ) : (
        trace.map((line, i) => {
          // biome-ignore lint/suspicious/noArrayIndexKey: trace lines are append-only
          return <div key={i}>{line}</div>
        })
      )}
      {/* Blinking cursor */}
      <span
        className="inline-block h-3 w-1.5 bg-success/70 align-middle animate-pulse ml-0.5"
        aria-hidden="true"
      />
    </div>
  </div>
)

// ── Chat bubble ────────────────────────────────────────────────────────────

function ChatBubble({
  message,
  userInitials,
  userAvatar,
}: {
  message: Message
  userInitials: string
  userAvatar?: string
}) {
  const isAgent = message.role === "agent"
  const time = message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <div className={cn("chat", isAgent ? "chat-start" : "chat-end")}>
      <div className="chat-image avatar">
        <div
          className={cn(
            "w-7 rounded-full flex items-center justify-center text-xs font-semibold",
            isAgent ? "bg-primary/15 text-primary" : "bg-base-300/60 text-base-content/60",
          )}
        >
          {isAgent ? (
            <Brain size={13} />
          ) : userAvatar ? (
            <img src={userAvatar} alt="You" referrerPolicy="no-referrer" />
          ) : (
            userInitials
          )}
        </div>
      </div>
      <div
        className={cn(
          "chat-bubble text-sm leading-relaxed",
          isAgent ? "bg-base-300/50 text-base-content" : "bg-primary/15 text-base-content",
        )}
      >
        {message.content}
      </div>
      <div className="chat-footer text-[10px] text-base-content/30 mt-0.5">{time}</div>
    </div>
  )
}
