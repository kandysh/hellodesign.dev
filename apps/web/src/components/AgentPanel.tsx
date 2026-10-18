import {
  AlertTriangle,
  Activity,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Send,
  ShieldAlert,
} from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface EvalProgressItem {
  dimensionId: string
  score: number
}

export interface ActivityItem {
  id: string
  type: "reasoning" | "status"
  content: string
}

export type AgentPanelState =
  | { phase: "idle" }
  | { phase: "processing"; trace: ActivityItem[] }
  | { phase: "follow-up"; question: string; trace: ActivityItem[] }
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

function scoreColor(score: number) {
  if (score >= 85) return "var(--app-green)"
  if (score >= 70) return "var(--app-indigo)"
  if (score >= 50) return "#f5a623"
  return "#ff6b6b"
}

function severityConfig(severity: RiskFlagItem["severity"]) {
  if (severity === "critical") return { color: "#ff6b6b", label: "Critical", icon: ShieldAlert }
  if (severity === "high") return { color: "#f5a623", label: "High", icon: AlertTriangle }
  return { color: "#f5c542", label: "Medium", icon: Info }
}

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
  const [showRisks, setShowRisks] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, state.phase])

  useEffect(() => {
    if (state.phase === "follow-up") setShowTrace(false)
  }, [state.phase])

  function handleSend() {
    const content = input.trim()
    if (!content || !onSendMessage) return
    onSendMessage(content)
    setInput("")
  }

  const trace = state.phase === "processing" || state.phase === "follow-up" ? state.trace : []
  const latestMessage = messages[messages.length - 1]
  const needsQuestionFallback = state.phase === "follow-up" &&
    !(latestMessage?.role === "agent" && latestMessage.content === state.question)

  return (
    <div className={cn("flex h-full flex-col border-l border-base-300/50 bg-base-100", className)}>
      <PanelHeader phase={state.phase} riskCount={riskFlags.length} />

      <div ref={threadRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {state.phase === "idle" && messages.length === 0 && (
          <div className="rounded-2xl border border-base-300/60 bg-base-200/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Brain size={16} />
              </span>
              Your interviewer
            </div>
            <p className="mt-3 text-sm leading-relaxed text-base-content/60">
              Submit your notebook when you’re ready. I’ll review the design, ask follow-up questions in this thread, and share the evaluation here.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            userInitials={userInitials}
            userAvatar={userAvatar}
          />
        ))}

        {needsQuestionFallback && (
          <ChatBubble
            message={{ id: "active-follow-up", role: "agent", content: state.question, timestamp: new Date() }}
            userInitials={userInitials}
            userAvatar={userAvatar}
          />
        )}

        {state.phase === "processing" && <ActivityMessage title="Reviewing your notebook" subtitle="Checking the architecture and key trade-offs" />}
        {state.phase === "follow-up" && (
          <div className="flex items-center gap-2 pl-10 text-xs font-medium text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            Your turn
          </div>
        )}

        {state.phase === "evaluating" && (
          <div className="rounded-2xl border border-base-300/60 bg-base-200/30 p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-base-content">
              <Loader2 size={15} className="animate-spin text-info" />
              Scoring your design
              <span className="ml-auto text-xs text-base-content/40">
                {state.agentResults.length}/{state.dimensionLabels.length}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {state.dimensionLabels.map((label, index) => {
                const result = state.agentResults[index]
                return <ScoreRow key={label} label={label} score={result?.score} />
              })}
            </div>
          </div>
        )}

        {state.phase === "done" && (
          <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-base-content">
              <CheckCircle2 size={16} className="text-success" />
              Review complete
            </div>
            <div className="flex flex-col gap-4">
              {state.agentResults.map((result, index) => (
                <ScoreRow
                  key={result.dimensionId}
                  label={state.dimensionLabels[index] ?? result.dimensionId}
                  score={result.score}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => onViewFeedback?.(state.submissionId)}
              className="btn btn-success btn-block mt-5 rounded-xl gap-2"
            >
              View detailed feedback
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {trace.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-base-300/50 bg-base-200/20">
            <button
              type="button"
              aria-expanded={showTrace}
              onClick={() => setShowTrace((visible) => !visible)}
              className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-base-200/40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Activity size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-base-content/80">Review activity</span>
                <span className="mt-0.5 block text-[10px] text-base-content/40">Progress and interviewer notes</span>
              </span>
              <span className="rounded-full bg-base-300/60 px-2 py-1 text-[10px] font-medium text-base-content/55">{trace.length}</span>
              {showTrace ? <ChevronDown size={14} className="text-base-content/40" /> : <ChevronRight size={14} className="text-base-content/40" />}
            </button>
            {showTrace && (
              <ol className="space-y-0 border-t border-base-300/40 px-3.5 py-2">
                {trace.map((item, index) => (
                  <ActivityEntry key={item.id} item={item} isLast={index === trace.length - 1} />
                ))}
              </ol>
            )}
          </section>
        )}

        {riskFlags.length > 0 && state.phase !== "idle" && (
          <div className="rounded-xl border border-base-300/50 bg-base-200/20">
            <button
              type="button"
              onClick={() => setShowRisks((visible) => !visible)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-base-content/55"
            >
              {showRisks ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <ShieldAlert size={13} />
              Risk flags
              <span className="ml-auto rounded-full bg-error/15 px-1.5 py-0.5 text-[10px] font-bold text-error">{riskFlags.length}</span>
            </button>
            {showRisks && (
              <div className="space-y-2 border-t border-base-300/40 p-3">
                {riskFlags.map((flag, index) => {
                  const config = severityConfig(flag.severity)
                  const Icon = config.icon
                  return (
                    <div key={`${flag.component}-${index}`} className="rounded-lg border p-3" style={{ borderColor: `${config.color}30`, background: `${config.color}0a` }}>
                      <div className="mb-1 flex items-center gap-2">
                        <Icon size={12} style={{ color: config.color }} />
                        <span className="text-xs font-semibold text-base-content/80">{flag.component}</span>
                        <span className="ml-auto text-[10px] font-bold uppercase" style={{ color: config.color }}>{config.label}</span>
                      </div>
                      <p className="pl-5 text-xs leading-relaxed text-base-content/60">{flag.risk}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {state.phase === "follow-up" && (
        <div className="border-t border-base-300/50 bg-base-100 p-3">
          <div className="rounded-2xl border border-base-300/70 bg-base-200/40 p-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Reply to the interviewer…"
              rows={2}
              className="max-h-28 min-h-12 w-full resize-y bg-transparent px-2 py-1 text-sm leading-relaxed text-base-content outline-none placeholder:text-base-content/35"
            />
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-[10px] text-base-content/35">Enter to send · Shift+Enter for a new line</span>
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || !onSendMessage}
                className="btn btn-primary btn-sm h-8 min-h-8 rounded-xl px-3"
                aria-label="Send reply"
              >
                <Send size={13} />
                Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

function ActivityMessage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Brain size={14} />
      </div>
      <div className="rounded-2xl rounded-tl-md border border-base-300/50 bg-base-200/40 px-3.5 py-3">
        <p className="text-sm font-medium text-base-content">{title}</p>
        <p className="mt-1 text-xs text-base-content/45">{subtitle}</p>
        <span className="mt-2 flex items-center gap-1 text-[10px] text-primary/70">
          <Loader2 size={10} className="animate-spin" /> Working
        </span>
      </div>
    </div>
  )
}

function ActivityEntry({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  const line = item.content
  if (item.type === "reasoning") {
    return (
      <li className="relative flex gap-3 py-2.5">
        <div className="flex w-4 shrink-0 justify-center">
          <span className="relative z-10 mt-1.5 h-2 w-2 rounded-full bg-primary" />
          {!isLast && <span className="absolute bottom-0 left-[19px] top-5 w-px bg-base-300/70" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs font-medium leading-relaxed text-base-content/80">Interviewer reasoning</span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-primary">Reasoning</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-base-content/55">{line}</p>
        </div>
      </li>
    )
  }

  const flow = line.match(/^→\s*(.*?)(?:\s+\((\{.*\})\))?$/s)
  const title = flow?.[1]?.trim() || "Interviewer note"
  const rawDetails = flow?.[2]
  let details: unknown
  if (rawDetails) {
    try {
      details = JSON.parse(rawDetails)
    } catch {
      details = rawDetails
    }
  }
  const detailsText = typeof details === "string" ? details : details !== null && typeof details === "object"
    ? Object.entries(details).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")
    : ""

  return (
    <li className="relative flex gap-3 py-2.5">
      <div className="flex w-4 shrink-0 justify-center">
        <span className={cn(
          "relative z-10 mt-1.5 h-2 w-2 rounded-full",
          flow ? "bg-primary" : "bg-base-content/30",
        )} />
        {!isLast && <span className="absolute bottom-0 left-[19px] top-5 w-px bg-base-300/70" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-medium leading-relaxed text-base-content/80">{title}</span>
          <span className="rounded-md bg-base-300/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-base-content/40">
            {flow ? "System" : "Note"}
          </span>
        </div>
        {!flow && <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-base-content/55">{line}</p>}
        {detailsText && <p className="mt-1 break-words text-[10px] leading-relaxed text-base-content/40">{detailsText}</p>}
      </div>
    </li>
  )
}

function PanelHeader({ phase, riskCount }: { phase: AgentPanelState["phase"]; riskCount: number }) {
  const subtitles: Record<AgentPanelState["phase"], string> = {
    idle: "Ready when you are",
    processing: "Reviewing your design",
    "follow-up": "Waiting for your reply",
    evaluating: "Scoring your answer",
    done: "Review complete",
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-base-300/50 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Brain size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-base-content">AI interviewer</p>
        <p className="mt-1 truncate text-[11px] text-base-content/45">{subtitles[phase]}</p>
      </div>
      {riskCount > 0 && phase !== "idle" && (
        <span className="flex items-center gap-1 rounded-full bg-error/10 px-2 py-1 text-[10px] font-semibold text-error">
          <ShieldAlert size={11} /> {riskCount}
        </span>
      )}
    </div>
  )
}

function ScoreRow({ label, score }: { label: string; score?: number }) {
  const scored = score !== undefined
  const color = scored ? scoreColor(score) : "var(--app-indigo)"
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-base-content/70">{label}</span>
        {scored ? (
          <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}<span className="ml-0.5 font-normal text-base-content/35">/100</span></span>
        ) : <span className="text-[10px] text-base-content/35">Pending</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-base-300/50">
        <div className={cn("h-full rounded-full transition-all duration-700", scored ? "" : "w-1/3 animate-pulse bg-base-content/15")} style={scored ? { width: `${score}%`, background: color } : undefined} />
      </div>
    </div>
  )
}

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
    <div className={cn("flex items-end gap-2.5", isAgent ? "justify-start" : "justify-end")}>
      {isAgent && (
        <div className="mb-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Brain size={13} />
        </div>
      )}
      <div className={cn("flex max-w-[88%] flex-col", isAgent ? "items-start" : "items-end")}>
        <div className="mb-1 flex items-center gap-2 px-1">
          <span className="text-[10px] font-semibold text-base-content/45">{isAgent ? "Interviewer" : "You"}</span>
          <time className="text-[10px] text-base-content/30">{time}</time>
        </div>
        <div className={cn(
          "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-3 text-sm leading-relaxed shadow-sm",
          isAgent
            ? "rounded-bl-md border border-base-300/60 bg-base-200/60 text-base-content"
            : "rounded-br-md bg-primary text-primary-content",
        )}>
          {message.content}
        </div>
      </div>
      {!isAgent && (
        <div className="mb-5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-base-300 text-[10px] font-semibold text-base-content/70">
          {userAvatar ? <img src={userAvatar} alt="You" referrerPolicy="no-referrer" /> : userInitials}
        </div>
      )}
    </div>
  )
}
