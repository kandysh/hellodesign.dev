import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  MessageSquare,
  Send,
  ShieldAlert,
} from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────

/** Payload shape of the `eval_progress` SSE event sent by the worker */
interface EvalProgressItem {
  dimensionId: string
  score: number
}

export type AgentPanelState =
  | { phase: "idle" }
  | { phase: "processing"; trace: string[] }
  | { phase: "follow-up"; question: string; trace: string[] }
  | { phase: "evaluating"; agentResults: EvalProgressItem[]; dimensionLabels: string[] }
  | { phase: "done"; submissionId: string; agentResults: EvalProgressItem[]; dimensionLabels: string[] }

export interface Message {
  id: string
  role: "agent" | "user"
  content: string
  timestamp: Date
}

export interface RiskFlagItem {
  component: string
  risk: string
  severity: "critical" | "high" | "medium"
}

interface AgentPanelProps {
  state: AgentPanelState
  messages: Message[]
  riskFlags?: RiskFlagItem[]
  userInitials?: string
  userAvatar?: string
  onSendMessage?: (msg: string) => void
  onViewFeedback?: (submissionId: string) => void
  className?: string
}

// ── Score colors ───────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 85) return { hex: "#4edea3", label: "Excellent" }
  if (score >= 70) return { hex: "#8083ff", label: "Solid" }
  if (score >= 50) return { hex: "#f5a623", label: "Adequate" }
  return { hex: "#ff6b6b", label: "Needs work" }
}

function severityConfig(severity: RiskFlagItem["severity"]) {
  if (severity === "critical") return { hex: "#ff6b6b", label: "Critical", icon: ShieldAlert }
  if (severity === "high") return { hex: "#f5a623", label: "High", icon: AlertTriangle }
  return { hex: "#f5c542", label: "Medium", icon: Info }
}

// ── Main panel ─────────────────────────────────────────────────────────────

export const AgentPanel = memo(function AgentPanel({
  state,
  messages,
  riskFlags = [],
  userInitials = "?",
  userAvatar,
  onSendMessage,
  onViewFeedback,
  className,
}: AgentPanelProps) {
  const [input, setInput] = useState("")
  const [showTrace, setShowTrace] = useState(false)
  const [showRisks, setShowRisks] = useState(true)
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

  // Open trace automatically when processing starts
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only fire when phase changes to processing
  useEffect(() => {
    if (state.phase === "processing") setShowTrace(true)
    if (state.phase === "follow-up") setShowTrace(false)
  }, [state.phase])

  function handleSend() {
    const msg = input.trim()
    if (!msg || !onSendMessage) return
    onSendMessage(msg)
    setInput("")
  }

  const trace = state.phase === "processing" || state.phase === "follow-up" ? state.trace : []
  const isFollowUp = state.phase === "follow-up"

  return (
    <div className={cn("flex h-full flex-col bg-base-200/50 border-l border-base-300/40", className)}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PanelHeader phase={state.phase} riskCount={riskFlags.length} />

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* ── Idle ── */}
        {state.phase === "idle" && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Brain size={26} />
            </div>
            <div>
              <p className="text-sm font-semibold text-base-content">AI Interviewer</p>
              <p className="mt-1 text-xs text-base-content/40 leading-relaxed max-w-[200px]">
                Submit your answer and the agent will review your design, ask follow-up questions, and score your work.
              </p>
            </div>
          </div>
        )}

        {/* ── Processing ── */}
        {state.phase === "processing" && (
          <div className="flex flex-col gap-0">
            {/* Status banner */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-base-300/30">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <div>
                <p className="text-sm font-medium text-base-content">Reading your design…</p>
                <p className="text-[11px] text-base-content/40 mt-0.5">Agent is analysing your answer and diagram</p>
              </div>
            </div>

            {/* Reasoning trace — always expanded during processing */}
            <div className="px-5 py-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-base-content/40 uppercase tracking-wider">
                Thinking
                <span className="tooltip tooltip-right cursor-default" data-tip="Live reasoning trace — what the agent is thinking, not the final feedback.">
                  <Info size={10} className="text-base-content/30" />
                </span>
              </div>
              <div
                ref={traceRef}
                className="reasoning-trace min-h-[80px] max-h-[calc(100vh-260px)] overflow-y-auto"
              >
                {trace.length === 0 ? (
                  <span className="opacity-40">Initializing…</span>
                ) : (
                  trace.map((line, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: append-only
                    <div key={i}>{line}</div>
                  ))
                )}
                <span className="inline-block h-3 w-1.5 bg-success/70 align-middle animate-pulse ml-0.5" aria-hidden="true" />
              </div>
            </div>
          </div>
        )}

        {/* ── Follow-up ── */}
        {state.phase === "follow-up" && (
          <div className="flex flex-col gap-0">
            {/* Prominent question card */}
            <div className="mx-4 mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning mt-0.5">
                  <MessageSquare size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-warning/80 uppercase tracking-wider mb-1.5">
                    Agent question
                  </p>
                  <p className="text-sm text-base-content leading-relaxed">
                    {state.question}
                  </p>
                </div>
              </div>
            </div>

            {/* Collapsible trace */}
            <div className="px-4 pt-3">
              <button
                type="button"
                onClick={() => setShowTrace((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] text-base-content/35 hover:text-base-content/55 transition-colors"
              >
                {showTrace ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                Reasoning trace
              </button>
              {showTrace && (
                <div className="mt-2">
                  <div ref={traceRef} className="reasoning-trace max-h-40 overflow-y-auto">
                    {trace.map((line, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: append-only
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat history */}
            {messages.length > 0 && (
              <div className="space-y-3 px-4 pt-4 pb-2">
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
          </div>
        )}

        {/* ── Evaluating ── */}
        {state.phase === "evaluating" && (
          <div className="flex flex-col gap-0">
            {/* Status banner */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-base-300/30">
              <Loader2 size={15} className="shrink-0 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-base-content">Scoring your design…</p>
                <p className="text-[11px] text-base-content/40 mt-0.5">
                  {state.agentResults.length} of {state.dimensionLabels.length} dimensions scored
                </p>
              </div>
            </div>

            {/* Score rows */}
            <div className="px-5 py-4 flex flex-col gap-3">
              {state.dimensionLabels.map((label, i) => {
                const result = state.agentResults[i]
                const scored = result !== undefined
                const { hex } = scored ? scoreColor(result.score) : { hex: "#4edea3" }
                return (
                  <ScoreRow
                    key={label}
                    label={label}
                    score={result?.score}
                    scored={scored}
                    hex={hex}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {state.phase === "done" && (
          <div className="flex flex-col gap-0">
            {/* Completion banner */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-base-300/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-base-content">Review complete</p>
                <p className="text-[11px] text-base-content/40 mt-0.5">All dimensions scored</p>
              </div>
            </div>

            {/* Scores */}
            {state.agentResults.length > 0 && (
              <div className="px-5 py-4 flex flex-col gap-3">
                {state.agentResults.map((r, i) => {
                  const label = state.dimensionLabels[i] ?? r.dimensionId
                  const { hex } = scoreColor(r.score)
                  return (
                    <ScoreRow
                      key={r.dimensionId}
                      label={label}
                      score={r.score}
                      scored
                      hex={hex}
                    />
                  )
                })}
              </div>
            )}

            {/* Previous Q&A if any */}
            {messages.length > 0 && (
              <div className="border-t border-base-300/30 px-4 py-3 space-y-3">
                <p className="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider">
                  Interview transcript
                </p>
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    userInitials={userInitials}
                    userAvatar={userAvatar}
                  />
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="px-5 py-4">
              <button
                type="button"
                onClick={() => onViewFeedback?.(state.submissionId)}
                className="btn btn-success btn-block rounded-xl gap-2"
              >
                <CheckCircle2 size={16} />
                View full feedback →
              </button>
            </div>
          </div>
        )}

        {/* ── Risk flags (persistent, collapsible) ── */}
        {riskFlags.length > 0 && state.phase !== "idle" && (
          <div className="border-t border-base-300/30 px-5 py-3">
            <button
              type="button"
              onClick={() => setShowRisks((v) => !v)}
              className="flex w-full items-center gap-2 text-[11px] font-semibold text-base-content/50 uppercase tracking-wider hover:text-base-content/70 transition-colors"
            >
              {showRisks ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <ShieldAlert size={11} />
              Risk flags
              <span className="ml-auto rounded-full bg-error/15 text-error px-1.5 py-0.5 text-[10px] font-bold">
                {riskFlags.length}
              </span>
            </button>

            {showRisks && (
              <div className="mt-3 flex flex-col gap-2">
                {riskFlags.map((flag, i) => {
                  const cfg = severityConfig(flag.severity)
                  const Icon = cfg.icon
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: order is stable
                      key={i}
                      className="rounded-xl border p-3"
                      style={{
                        borderColor: `${cfg.hex}30`,
                        background: `${cfg.hex}0a`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={12} style={{ color: cfg.hex }} />
                        <span className="text-xs font-semibold text-base-content/80">
                          {flag.component}
                        </span>
                        <span
                          className="ml-auto text-[10px] font-bold uppercase rounded-full px-1.5 py-0.5"
                          style={{ color: cfg.hex, background: `${cfg.hex}18` }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-base-content/60 leading-relaxed pl-[20px]">
                        {flag.risk}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Input (follow-up only) ───────────────────────────────────────── */}
      {isFollowUp && (
        <div className="border-t border-base-300/40 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Reply to the agent…"
              className="input input-sm flex-1 rounded-xl border-base-300/40 bg-base-300/20 text-sm placeholder:text-base-content/30 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || !onSendMessage}
              className="btn btn-warning btn-sm rounded-xl px-3"
              aria-label="Send reply"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

// ── Panel header ───────────────────────────────────────────────────────────

function PanelHeader({ phase, riskCount }: { phase: AgentPanelState["phase"]; riskCount: number }) {
  const subtitles: Record<AgentPanelState["phase"], string> = {
    idle: "Ready",
    processing: "Analysing…",
    "follow-up": "Awaiting your reply",
    evaluating: "Scoring…",
    done: "Complete",
  }
  const phaseColors: Record<AgentPanelState["phase"], string> = {
    idle: "text-base-content/40",
    processing: "text-primary",
    "follow-up": "text-warning",
    evaluating: "text-info",
    done: "text-success",
  }
  return (
    <div className="flex items-center gap-3 border-b border-base-300/40 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Brain size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-base-content leading-none">AI Interviewer</p>
        <p className={cn("text-[11px] mt-0.5 leading-none", phaseColors[phase])}>
          {subtitles[phase]}
        </p>
      </div>
      {riskCount > 0 && phase !== "idle" && (
        <div className="flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-error">
          <ShieldAlert size={10} />
          <span className="text-[10px] font-bold">{riskCount}</span>
        </div>
      )}
    </div>
  )
}

// ── Score row ──────────────────────────────────────────────────────────────

function ScoreRow({
  label,
  score,
  scored,
  hex,
}: {
  label: string
  score?: number
  scored: boolean
  hex: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-base-content/70">{label}</span>
        {scored && score !== undefined ? (
          <span className="text-xs font-bold tabular-nums" style={{ color: hex }}>
            {score}<span className="text-base-content/30 font-normal">/100</span>
          </span>
        ) : (
          <span className="text-[11px] text-base-content/25">Pending…</span>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-base-300/40 overflow-hidden">
        {scored && score !== undefined ? (
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${score}%`, background: hex }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-base-300/60 animate-pulse" />
        )}
      </div>
    </div>
  )
}

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

