import type { AgentEvent } from "@sysdesign/shared"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import type { ActivityItem, AgentPanelState, Message } from "@/components/AgentPanel"
import { API_BASE_URL as API, apiFetch, apiJson } from "@/lib/api-client"

type SubmissionStreamEvent =
  | AgentEvent
  | { type: "ping" }
  | { type: "submission_status"; status: string }

interface SubmissionStreamOptions {
  questionId: string
  answerText: string
  excalidrawElements: unknown
  reviewMode: "quick" | "deep"
  mood: "pragmatist" | "systems" | "sre" | "pm"
  modelName: string
  modelOverridden: boolean
  question?: { rubric?: unknown } | null
  toast: (message: string, variant: "success" | "error") => void
  onSubmissionStarted: () => void
}

export function useSubmissionStream({
  questionId,
  answerText,
  excalidrawElements,
  reviewMode,
  mood,
  modelName,
  modelOverridden,
  question,
  toast,
  onSubmissionStarted,
}: SubmissionStreamOptions) {
  const WS_API = API
    ? API.replace(/^http/, "ws")
    : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`
  const [agentState, setAgentState] = useState<AgentPanelState>({ phase: "idle" })
  const [agentMessages, setAgentMessages] = useState<Message[]>([])
  const [riskFlags, setRiskFlags] = useState<
    Array<{ component: string; risk: string; severity: "critical" | "high" | "medium" }>
  >([])
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamCleanupRef = useRef<(() => void) | null>(null)
  const reasoningBufRef = useRef("")
  const reasoningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reasoningEntryIdRef = useRef<string | null>(null)
  const submitMutation = useMutation({
    mutationFn: async () => {
      return apiJson<{ submissionId: string }>("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          answerText,
          excalidrawData: excalidrawElements,
          agentType: reviewMode,
          mood,
          modelName: modelOverridden ? modelName : undefined,
        }),
      })
    },
    onSuccess: ({ submissionId }) => {
      streamCleanupRef.current?.()
      setCurrentSubmissionId(submissionId)
      onSubmissionStarted()
      setAgentState({ phase: "processing", trace: [] })
      setAgentMessages([])
      setRiskFlags([])
      reasoningEntryIdRef.current = null
      toast("Submission received — agent is reading your answer", "success")

      let stopped = false
      let terminal = false
      let reconnectAttempt = 0
      let pollTimer: ReturnType<typeof setTimeout> | undefined
      let reconnectTimer: ReturnType<typeof setTimeout> | undefined
      let heartbeatTimer: ReturnType<typeof setInterval> | undefined
      let activeSocket: WebSocket | null = null
      let lastMessageAt = Date.now()

      const stopStream = () => {
        stopped = true
        if (pollTimer) clearTimeout(pollTimer)
        if (reconnectTimer) clearTimeout(reconnectTimer)
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        pollTimer = undefined
        reconnectTimer = undefined
        heartbeatTimer = undefined
        if (activeSocket && activeSocket.readyState < WebSocket.CLOSING) activeSocket.close()
        if (wsRef.current === activeSocket) wsRef.current = null
      }
      streamCleanupRef.current = stopStream

      const finishFailed = (message: string) => {
        if (terminal) return
        terminal = true
        cleanupReasoningBuf()
        toast(message, "error")
        stopStream()
        setAgentState({ phase: "idle" })
        submitMutation.reset()
      }

      const finishDone = (scores?: unknown) => {
        if (terminal) return
        terminal = true
        cleanupReasoningBuf()
        const returnedScores = Array.isArray(scores)
          ? scores.filter(
              (score): score is { dimensionId: string; score: number } =>
                !!score &&
                typeof score === "object" &&
                typeof (score as { dimensionId?: unknown }).dimensionId === "string" &&
                typeof (score as { score?: unknown }).score === "number",
            )
          : []
        const dimensions =
          (question?.rubric as { dimensions?: Array<{ id: string; label: string }> } | undefined)
            ?.dimensions ?? []
        const orderedScores = dimensions.length
          ? dimensions.flatMap((dimension) =>
              returnedScores
                .filter((score) => score.dimensionId === dimension.id)
                .map((score) => ({ dimensionId: score.dimensionId, score: score.score })),
            )
          : returnedScores
        setAgentState({
          phase: "done",
          submissionId,
          agentResults: orderedScores,
          dimensionLabels: dimensions.length
            ? dimensions.map((dimension) => dimension.label)
            : orderedScores.map((score) => score.dimensionId),
        })
        stopStream()
      }

      const pollSubmission = async () => {
        if (stopped || terminal) return
        try {
          const response = await apiFetch(`/api/submissions/${submissionId}`)
          if (response.ok) {
            const snapshot = (await response.json()) as {
              status?: string
              result?: { componentScores?: unknown }
            }
            if (snapshot.status === "DONE") {
              finishDone(snapshot.result?.componentScores)
              return
            }
            if (snapshot.status === "FAILED") {
              finishFailed(
                "This evaluation failed. Please retry; if it fails again, check your provider key.",
              )
              return
            }
            if (snapshot.status === "FOLLOWUP") {
              try {
                const messages = await apiJson<
                  Array<{
                    id: string
                    role: string
                    content: string
                    createdAt: string
                    metadata?: { type?: string } | null
                  }>
                >(`/api/submissions/${submissionId}/messages`)
                const followup = [...messages]
                  .reverse()
                  .find(
                    (message) => message.role === "AGENT" && message.metadata?.type === "followup",
                  )
                if (followup) {
                  setAgentState((previous) => ({
                    phase: "follow-up",
                    question: followup.content,
                    trace:
                      previous.phase === "processing" || previous.phase === "follow-up"
                        ? previous.trace
                        : [],
                  }))
                  setAgentMessages((previous) =>
                    previous.some((message) => message.id === followup.id)
                      ? previous
                      : [
                          ...previous,
                          {
                            id: followup.id,
                            role: "agent",
                            content: followup.content,
                            timestamp: new Date(followup.createdAt),
                          },
                        ],
                  )
                }
              } catch {
                // A later poll can recover the saved follow-up after temporary API errors.
              }
            }
          }
        } catch {
          // Keep polling through temporary API outages while reconnect attempts continue.
        }
        if (!stopped && !terminal && wsRef.current?.readyState !== WebSocket.OPEN) {
          pollTimer = setTimeout(() => void pollSubmission(), 3000)
        }
      }

      const scheduleReconnect = () => {
        if (stopped || terminal || reconnectTimer) return
        const delay = Math.min(1000 * 2 ** reconnectAttempt, 15000)
        reconnectAttempt += 1
        reconnectTimer = setTimeout(() => {
          reconnectTimer = undefined
          connect()
        }, delay)
      }

      const connect = () => {
        if (stopped || terminal) return
        let ws: WebSocket
        try {
          ws = new WebSocket(`${WS_API}/api/submissions/${submissionId}/ws`)
        } catch {
          void pollSubmission()
          scheduleReconnect()
          return
        }
        activeSocket = ws
        wsRef.current = ws
        ws.onopen = () => {
          reconnectAttempt = 0
          lastMessageAt = Date.now()
          if (pollTimer) clearTimeout(pollTimer)
          pollTimer = undefined
        }
        ws.onmessage = (e) => {
          lastMessageAt = Date.now()
          try {
            handleStreamEvent(JSON.parse(e.data) as SubmissionStreamEvent)
          } catch {
            // Ignore malformed events; the status poll remains the recovery path.
          }
        }
        ws.onclose = () => {
          if (heartbeatTimer) clearInterval(heartbeatTimer)
          heartbeatTimer = undefined
          if (wsRef.current === ws) wsRef.current = null
          if (!stopped && !terminal) {
            void pollSubmission()
            scheduleReconnect()
          }
        }
        ws.onerror = () => ws.close()
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        heartbeatTimer = setInterval(() => {
          if (Date.now() - lastMessageAt > 45_000) ws.close()
        }, 15_000)
      }

      const flushReasoningBuf = () => {
        if (reasoningTimerRef.current) {
          clearTimeout(reasoningTimerRef.current)
          reasoningTimerRef.current = null
        }
        const content = reasoningBufRef.current
        reasoningBufRef.current = ""
        if (!content.trim()) return

        const entryId = reasoningEntryIdRef.current ?? crypto.randomUUID()
        reasoningEntryIdRef.current = entryId
        setAgentState((prev) => {
          if (prev.phase !== "processing" && prev.phase !== "follow-up") return prev
          const existingIndex = prev.trace.findIndex((item) => item.id === entryId)
          if (existingIndex < 0) {
            return {
              ...prev,
              trace: [
                ...prev.trace,
                { id: entryId, type: "reasoning", content } satisfies ActivityItem,
              ],
            }
          }
          return {
            ...prev,
            trace: prev.trace.map((item, index) =>
              index === existingIndex ? { ...item, content: item.content + content } : item,
            ),
          }
        })
      }

      const cleanupReasoningBuf = () => {
        flushReasoningBuf()
        reasoningEntryIdRef.current = null
      }

      const handleStreamEvent = (ev: SubmissionStreamEvent) => {
        switch (ev.type) {
          case "ping":
            break

          case "submission_status":
            if (ev.status === "FAILED") {
              finishFailed(
                "This evaluation failed. Please retry; if it fails again, check your provider key.",
              )
            } else if (ev.status === "DONE") {
              void pollSubmission()
            }
            break

          case "reasoning": {
            const content = ev.content
            if (!content) break
            // Accumulate rapid token chunks and flush after 100ms of silence
            reasoningBufRef.current += content
            if (reasoningTimerRef.current) clearTimeout(reasoningTimerRef.current)
            reasoningTimerRef.current = setTimeout(() => {
              flushReasoningBuf()
            }, 100)
            break
          }

          case "agent_flow": {
            if (
              ev.step === "Job started - initializing agent" ||
              ev.step === "Evaluation retry scheduled"
            ) {
              if (reasoningTimerRef.current) clearTimeout(reasoningTimerRef.current)
              reasoningTimerRef.current = null
              reasoningBufRef.current = ""
              reasoningEntryIdRef.current = null
              setRiskFlags([])
              setAgentState({
                phase: "processing",
                trace:
                  ev.step === "Evaluation retry scheduled"
                    ? [
                        {
                          id: crypto.randomUUID(),
                          type: "status",
                          content: "→ Evaluation retry scheduled",
                        },
                      ]
                    : [],
              })
              break
            }
            flushReasoningBuf()
            const flowLine = `→ ${ev.step}${ev.details ? ` (${JSON.stringify(ev.details)})` : ""}`
            setAgentState((prev) => {
              if (prev.phase === "processing" || prev.phase === "follow-up") {
                return {
                  ...prev,
                  trace: [
                    ...prev.trace,
                    { id: crypto.randomUUID(), type: "status", content: flowLine },
                  ],
                }
              }
              return prev
            })
            break
          }

          case "followup": {
            flushReasoningBuf()
            reasoningEntryIdRef.current = null
            const q = ev.question
            setAgentState((prev) => ({
              phase: "follow-up",
              question: q,
              trace: prev.phase === "processing" || prev.phase === "follow-up" ? prev.trace : [],
            }))
            setAgentMessages((prev) => [
              ...prev,
              {
                id: ev.messageId ?? crypto.randomUUID(),
                role: "agent",
                content: q,
                timestamp: new Date(),
              },
            ])
            break
          }

          case "user_reply":
            reasoningEntryIdRef.current = null
            setAgentState((prev) => {
              if (prev.phase === "follow-up") {
                return { phase: "processing", trace: prev.trace ?? [] }
              }
              return prev
            })
            break

          case "eval_start":
            cleanupReasoningBuf()
            setAgentState({
              phase: "evaluating",
              agentResults: [],
              dimensionLabels: ev.dimensions.map((id) => ev.dimensionLabels[id] ?? id),
            })
            break

          case "eval_progress":
            if (
              typeof ev.dimensionId !== "string" ||
              typeof ev.score !== "number" ||
              !Number.isFinite(ev.score)
            ) {
              break
            }
            setAgentState((prev) => {
              if (prev.phase === "evaluating") {
                return {
                  phase: "evaluating",
                  agentResults: [
                    ...prev.agentResults,
                    { dimensionId: ev.dimensionId, score: ev.score },
                  ],
                  dimensionLabels: prev.dimensionLabels,
                }
              }
              return prev
            })
            break

          case "eval_done":
            void pollSubmission()
            break

          case "risk_flag":
            setRiskFlags((prev) => [
              ...prev,
              { component: ev.component, risk: ev.risk, severity: ev.severity },
            ])
            break

          case "error":
            finishFailed(ev.message ?? "Evaluation failed")
            break
        }
      }
      connect()
    },
    onError: (err: Error) => {
      toast(err.message, "error")
    },
  })
  // ── Cleanup WebSocket and buffering on unmount ───────────────
  useEffect(() => {
    return () => {
      streamCleanupRef.current?.()
      streamCleanupRef.current = null
      if (reasoningTimerRef.current) clearTimeout(reasoningTimerRef.current)
    }
  }, [])

  function handleSendAgentMessage(msg: string) {
    const messageId = crypto.randomUUID()
    setAgentMessages((prev) => [
      ...prev,
      { id: messageId, role: "user", content: msg, timestamp: new Date() },
    ])
    const sendReply = async () => {
      const socket = wsRef.current
      if (socket?.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: "reply", content: msg }))
          return
        } catch {
          // Use the REST reply route if the connection closed between the state check and send.
        }
      }
      if (!currentSubmissionId) throw new Error("No active submission")
      await apiJson(`/api/submissions/${currentSubmissionId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg }),
      })
    }
    void sendReply().catch((error: unknown) => {
      setAgentMessages((prev) => prev.filter((message) => message.id !== messageId))
      toast(error instanceof Error ? error.message : "Could not send your reply", "error")
    })
  }
  return {
    submitMutation,
    agentState,
    agentMessages,
    riskFlags,
    currentSubmissionId,
    handleSendAgentMessage,
  }
}
