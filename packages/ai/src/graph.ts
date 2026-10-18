import type { AIMessageChunk, BaseMessage } from "@langchain/core/messages"
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages"
import type { RunnableConfig } from "@langchain/core/runnables"
import { Annotation, END, START, StateGraph } from "@langchain/langgraph"
import { ChatOpenAI } from "@langchain/openai"
import type { AgentEvent, ComponentScore, RubricConfig } from "@sysdesign/shared"
import { getDefaultModelName, normalizeOpenAICompatibleBaseUrl } from "@sysdesign/shared"
import { z } from "zod"
import { buildEvaluationPrompt } from "./prompts.js"
import { clarificationTools } from "./tools.js"

// ─── Model Configuration ──────────────────────────────────────────────────────

export const DEFAULT_MODEL_NAME = getDefaultModelName()

const noRedirectFetch: typeof fetch = (input, init) => fetch(input, { ...init, redirect: "error" })
const MAX_RISK_FLAGS_PER_RUN = 5

function modelRequestConfig(baseUrl?: string) {
  const safeBaseUrl = baseUrl
    ? normalizeOpenAICompatibleBaseUrl(baseUrl, {
        allowLocalhost: process.env.NODE_ENV === "development",
      })
    : undefined
  return {
    timeout: 30_000,
    maxRetries: 0,
    configuration: {
      ...(safeBaseUrl ? { baseURL: safeBaseUrl } : {}),
      fetch: noRedirectFetch,
    },
  }
}

// ─── Logger for capturing LangGraph execution ──────────────────────────────────

export function createAgentFlowLogger(publishEvent: (event: AgentEvent) => Promise<void>) {
  return async (event: Record<string, unknown>) => {
    try {
      const eventName = event.event as string

      // Log node execution
      if (eventName === "on_chain_start" && event.name === "agent") {
        await publishEvent({
          type: "agent_flow",
          step: "Agent analyzing design",
          details: { phase: "clarification", node: "agent" },
        })
      }

      // Log tool calls
      if (eventName === "on_tool_start") {
        const toolName = event.tool as string
        await publishEvent({
          type: "agent_flow",
          step: `Interviewer used ${toolName.replaceAll("_", " ")}`,
          details: { tool: toolName },
        })
      }

      // Log node transitions
      if (eventName === "on_chain_end" && event.name === "agent") {
        await publishEvent({
          type: "agent_flow",
          step: "Agent completed step",
          details: { node: "agent" },
        })
      }

      if (eventName === "on_chain_start" && event.name === "wait_reply") {
        await publishEvent({
          type: "agent_flow",
          step: "Waiting for user reply",
          details: { node: "wait_reply" },
        })
      }

      // Log workflow end
      if (eventName === "on_chain_end" && event.name === "__root__") {
        await publishEvent({
          type: "agent_flow",
          step: "Clarification phase completed",
          details: { phase: "clarification_done" },
        })
      }
    } catch (error) {
      // Silently ignore logger errors to not disrupt the main flow
      console.debug("[agent_logger] Error in logger:", error)
    }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuestionContext {
  title: string
  prompt: string
  rubric: RubricConfig
}

export interface ClarificationParams {
  apiKey: string
  baseUrl?: string
  modelName?: string
  initialMessages: BaseMessage[]
  question: QuestionContext
  submissionId: string
  publishEvent: (event: AgentEvent) => Promise<void>
  waitForReply: (submissionId: string) => Promise<string | null>
  /** Override max follow-up rounds; 0 = skip clarification and evaluate immediately */
  maxFollowupOverride?: number
}

export interface ClarificationResult {
  messages: BaseMessage[]
  followupRounds: number
}

export interface EvaluationParams {
  apiKey: string
  baseUrl?: string
  modelName?: string
  messages: BaseMessage[]
  question: QuestionContext
  submissionId: string
  publishEvent: (event: AgentEvent) => Promise<void>
}

export interface FeedbackParams {
  apiKey: string
  baseUrl?: string
  modelName?: string
  messages: BaseMessage[]
  componentScores: ComponentScore[]
  overallScore: number
  rubric: RubricConfig
}

export interface FeedbackResult {
  narrative: string
  improvements: string[]
}

export function closeDanglingToolCalls(messages: BaseMessage[]): BaseMessage[] {
  const closed: BaseMessage[] = []
  const pending = new Map<string, string>()
  const appendClosers = () => {
    for (const [toolCallId, name] of pending) {
      closed.push(
        new ToolMessage({
          tool_call_id: toolCallId,
          content: `No result was produced for ${name}. Proceeding to evaluation.`,
        }),
      )
    }
    pending.clear()
  }

  for (const message of messages) {
    if (AIMessage.isInstance(message)) {
      appendClosers()
      closed.push(message)
      for (const call of message.tool_calls ?? []) {
        if (call.id) pending.set(call.id, call.name)
      }
    } else if (message instanceof ToolMessage) {
      closed.push(message)
      pending.delete(message.tool_call_id)
    } else {
      appendClosers()
      closed.push(message)
    }
  }

  appendClosers()
  return closed
}

// ─── Structured output schemas ────────────────────────────────────────────────

// Defined locally to avoid cross-package Zod version type conflicts
const ComponentScoreZod = z.object({
  dimensionId: z.string(),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  improvements: z.array(z.string()),
})

const EvalOutputSchema = z.object({
  scores: z.array(ComponentScoreZod).describe("One score entry per rubric dimension"),
})

export function validateEvaluationScores(value: unknown, dimensionIds: string[]): ComponentScore[] {
  const parsed = EvalOutputSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error(`Evaluation output does not match the score schema: ${parsed.error.message}`)
  }

  const expected = new Set(dimensionIds)
  const returnedIds = parsed.data.scores.map((score) => score.dimensionId)
  const returned = new Set(returnedIds)
  const duplicates = returnedIds.filter((id, index) => returnedIds.indexOf(id) !== index)
  const unknown = [...returned].filter((id) => !expected.has(id))
  const missing = [...expected].filter((id) => !returned.has(id))
  if (duplicates.length || unknown.length || missing.length || returned.size !== expected.size) {
    const problems = [
      missing.length ? `missing: ${missing.join(", ")}` : "",
      unknown.length ? `unknown: ${unknown.join(", ")}` : "",
      duplicates.length ? `duplicate: ${[...new Set(duplicates)].join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("; ")
    throw new Error(
      `Evaluation output must contain exactly one score per rubric dimension (${problems})`,
    )
  }

  return parsed.data.scores as ComponentScore[]
}

const FeedbackOutputSchema = z.object({
  narrative: z
    .string()
    .describe(
      "3–5 paragraph narrative feedback covering overall performance, strengths, and areas for improvement",
    ),
  improvements: z.array(z.string()).describe("3–5 prioritised, concrete, actionable improvements"),
})

// ─── LangGraph state ──────────────────────────────────────────────────────────

const ClarificationState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left: BaseMessage[], right: BaseMessage[]) => left.concat(right),
    default: () => [],
  }),
  followupRounds: Annotation<number>({
    reducer: (_: number, next: number) => next,
    default: () => 0,
  }),
  riskFlags: Annotation<number>({
    reducer: (_: number, next: number) => next,
    default: () => 0,
  }),
})

// ─── Clarification phase (LangGraph loop) ─────────────────────────────────────

export async function runClarificationPhase(
  params: ClarificationParams,
): Promise<ClarificationResult> {
  const {
    apiKey,
    baseUrl,
    modelName,
    initialMessages,
    question,
    submissionId,
    publishEvent,
    waitForReply,
    maxFollowupOverride,
  } = params

  const model = new ChatOpenAI({
    model: modelName ?? getDefaultModelName(baseUrl),
    temperature: 0.2,
    maxTokens: 4096,
    apiKey,
    streaming: true,
    ...modelRequestConfig(baseUrl),
  }).bindTools(clarificationTools)

  // Agent node: stream LLM response, publish reasoning chunks
  const agentNode = async (state: typeof ClarificationState.State) => {
    let accumulated: AIMessageChunk | null = null

    // biome-ignore lint/suspicious/noExplicitAny: BaseMessage[] from LangGraph state has a specialized generic signature incompatible with BaseLanguageModelInput across module boundaries
    for await (const chunk of await model.stream(state.messages as any)) {
      if (typeof chunk.content === "string" && chunk.content) {
        await publishEvent({ type: "reasoning", content: chunk.content })
      }
      accumulated = accumulated ? accumulated.concat(chunk) : (chunk as AIMessageChunk)
    }

    const response = accumulated ?? new AIMessage({ content: "", tool_calls: [] })
    return { messages: [response] }
  }

  // Wait-for-reply node: block on Redis until user responds
  const waitReplyNode = async (state: typeof ClarificationState.State) => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage
    const toolCalls = lastMessage.tool_calls ?? []
    const replyCalls = toolCalls.filter((call) =>
      ["ask_followup", "probe_trade_off", "request_estimation"].includes(call.name),
    )
    if (replyCalls.length === 0) return flagRiskNode(state)

    const questionText = [
      ...new Set(
        replyCalls.map((call) => {
          const args = call.args as Record<string, unknown>
          return String(args.question ?? args.aspect ?? JSON.stringify(args))
        }),
      ),
    ]
      .map((question) => `- ${question}`)
      .join("\n")

    await publishEvent({
      type: "followup",
      question: questionText,
      submissionId,
    })

    const toolResults = new Map<string, string>()
    let riskToolCalls = 0
    for (const toolCall of toolCalls) {
      if (toolCall.name !== "flag_risk") continue
      const args = toolCall.args as Record<string, unknown>
      const severity = args.severity
      const withinLimit = state.riskFlags + riskToolCalls < MAX_RISK_FLAGS_PER_RUN
      riskToolCalls += 1
      if (
        typeof args.component === "string" &&
        typeof args.risk === "string" &&
        (severity === "critical" || severity === "high" || severity === "medium")
      ) {
        if (withinLimit) {
          await publishEvent({
            type: "risk_flag",
            component: args.component,
            risk: args.risk,
            severity,
          })
          if (toolCall.id)
            toolResults.set(toolCall.id, `Risk flagged (${severity}): ${args.component}`)
        } else if (toolCall.id) {
          toolResults.set(
            toolCall.id,
            "Risk flag limit reached. Proceed with available information.",
          )
        }
      } else if (toolCall.id) {
        toolResults.set(toolCall.id, "Risk flag was invalid and was not recorded.")
      }
    }

    const reply = await waitForReply(submissionId)
    const replyResult = reply
      ? `Candidate response: ${reply}`
      : "No candidate response was received before the clarification timed out. Proceed with available information."
    for (const call of replyCalls) {
      if (call.id) toolResults.set(call.id, replyResult)
    }
    for (const call of toolCalls) {
      if (call.id && !toolResults.has(call.id)) {
        toolResults.set(
          call.id,
          `Unsupported tool ${call.name}. Proceed with available information.`,
        )
      }
    }
    const toolMessages = toolCalls.reduce<ToolMessage[]>((messages, call) => {
      const callId = call.id
      if (!callId) return messages
      messages.push(
        new ToolMessage({
          tool_call_id: callId,
          content: toolResults.get(callId) ?? "Proceed with available information.",
        }),
      )
      return messages
    }, [])

    if (!reply) {
      // Timed out — let the agent proceed to evaluation
      return {
        messages: toolMessages,
        followupRounds: state.followupRounds + 1,
        riskFlags: state.riskFlags + riskToolCalls,
      }
    }

    await publishEvent({ type: "user_reply", content: reply })

    return {
      messages: [...toolMessages, new HumanMessage(reply)],
      followupRounds: state.followupRounds + 1,
      riskFlags: state.riskFlags + riskToolCalls,
    }
  }

  // Risk flag node: publish risk_flag event instantly, return ToolMessage, loop back to agent
  const flagRiskNode = async (state: typeof ClarificationState.State) => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage
    const toolCalls = lastMessage.tool_calls ?? []
    const messages: ToolMessage[] = []
    let riskToolCalls = 0

    for (const toolCall of toolCalls) {
      let content = `Unsupported tool ${toolCall.name}. Proceed with available information.`
      if (toolCall.name === "flag_risk") {
        const args = toolCall.args as Record<string, unknown>
        const severity = args.severity
        const withinLimit = state.riskFlags + riskToolCalls < MAX_RISK_FLAGS_PER_RUN
        riskToolCalls += 1
        if (
          typeof args.component === "string" &&
          typeof args.risk === "string" &&
          (severity === "critical" || severity === "high" || severity === "medium")
        ) {
          if (withinLimit) {
            await publishEvent({
              type: "risk_flag",
              component: args.component,
              risk: args.risk,
              severity,
            })
            content = `Risk flagged (${severity}): ${args.component}`
          } else {
            content = "Risk flag limit reached. Proceed with available information."
          }
        } else {
          content = "Risk flag was invalid and was not recorded."
        }
      }
      if (toolCall.id) messages.push(new ToolMessage({ tool_call_id: toolCall.id, content }))
    }

    return { messages, riskFlags: state.riskFlags + riskToolCalls }
  }

  const maxRounds =
    maxFollowupOverride !== undefined ? maxFollowupOverride : question.rubric.maxFollowupRounds

  const shouldContinue = (state: typeof ClarificationState.State): string => {
    const lastMessage = state.messages[state.messages.length - 1]

    if (!lastMessage || !AIMessage.isInstance(lastMessage)) return END

    const aiMsg = lastMessage as AIMessage
    if (!aiMsg.tool_calls?.length) return END

    const toolCalls = aiMsg.tool_calls
    const hasReplyTool = toolCalls.some((call) =>
      ["ask_followup", "probe_trade_off", "request_estimation"].includes(call.name),
    )
    const hasRiskTool = toolCalls.some((call) => call.name === "flag_risk")

    if (hasReplyTool && state.followupRounds < maxRounds) {
      return "wait_reply"
    }

    // Record annotation calls immediately. This node also acknowledges any
    // parallel or unsupported calls so the model never sees dangling calls.
    if (hasRiskTool && state.riskFlags < MAX_RISK_FLAGS_PER_RUN) return "flag_risk_node"

    // mark_satisfied, exhausted follow-up quota, or unknown tools → evaluation.
    return END
  }

  const workflow = new StateGraph(ClarificationState)
    .addNode("agent", agentNode)
    .addNode("wait_reply", waitReplyNode)
    .addNode("flag_risk_node", flagRiskNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      wait_reply: "wait_reply",
      flag_risk_node: "flag_risk_node",
      [END]: END,
    })
    .addEdge("wait_reply", "agent")
    .addEdge("flag_risk_node", "agent")
    .compile()

  const logger = createAgentFlowLogger(publishEvent)
  const config: RunnableConfig = { callbacks: [] }
  // LangChain supports method-based callbacks at runtime, but RunnableConfig's public callback type
  // only describes handler instances, so adapt this supported callback shape at the boundary.
  const callbacks = [
    { on_chain_start: logger, on_tool_start: logger, on_chain_end: logger },
  ] as unknown as RunnableConfig["callbacks"]

  const result = await workflow.invoke(
    {
      messages: initialMessages,
      followupRounds: 0,
      riskFlags: 0,
    },
    {
      ...config,
      callbacks,
    },
  )

  return {
    messages: closeDanglingToolCalls(result.messages),
    followupRounds: result.followupRounds,
  }
}

// ─── Evaluation phase ─────────────────────────────────────────────────────────

export async function runEvaluationPhase(params: EvaluationParams): Promise<ComponentScore[]> {
  const {
    apiKey,
    baseUrl,
    modelName,
    messages,
    question,
    submissionId: _submissionId,
    publishEvent,
  } = params

  const dimensionIds = question.rubric.dimensions.map((d) => d.id)
  const dimensionLabels: Record<string, string> = {}
  for (const d of question.rubric.dimensions) {
    dimensionLabels[d.id] = d.label
  }

  await publishEvent({
    type: "agent_flow",
    step: "Evaluation starting",
    details: { dimensions: dimensionIds.length },
  })
  await publishEvent({ type: "eval_start", dimensions: dimensionIds, dimensionLabels })

  const model = new ChatOpenAI({
    model: modelName ?? getDefaultModelName(baseUrl),
    temperature: 0.1,
    maxTokens: 4096,
    apiKey,
    ...modelRequestConfig(baseUrl),
    // biome-ignore lint/suspicious/noExplicitAny: Zod v4 cross-package type conflict with withStructuredOutput
  }).withStructuredOutput(EvalOutputSchema as any)

  const evalMessages = [...messages, new HumanMessage(buildEvaluationPrompt(dimensionIds))]

  await publishEvent({
    type: "agent_flow",
    step: "Evaluating design against rubric",
    details: { dimensionCount: dimensionIds.length },
  })

  let scores: ComponentScore[] | undefined
  let lastValidationError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await publishEvent({
        type: "agent_flow",
        step: "Correcting incomplete evaluation output",
        details: { attempt },
      })
    }
    try {
      const retryMessages =
        attempt === 0
          ? evalMessages
          : [
              ...evalMessages,
              new HumanMessage(
                "Your previous evaluation output was invalid: " +
                  (lastValidationError instanceof Error
                    ? lastValidationError.message
                    : String(lastValidationError)) +
                  ". Return the complete structured output again with exactly one score for each dimension and no other dimension IDs: " +
                  dimensionIds.join(", ") +
                  ".",
              ),
            ]
      // biome-ignore lint/suspicious/noExplicitAny: BaseMessage[] generic variance incompatibility across module boundaries
      const output = await model.invoke(retryMessages as any)
      scores = validateEvaluationScores(output, dimensionIds)
      break
    } catch (error) {
      lastValidationError = error
    }
  }
  if (!scores) {
    throw new Error(
      "Evaluation model returned invalid rubric scores after one retry: " +
        (lastValidationError instanceof Error
          ? lastValidationError.message
          : String(lastValidationError)),
    )
  }

  for (const score of scores) {
    const dimension = question.rubric.dimensions.find((d) => d.id === score.dimensionId)
    await publishEvent({
      type: "agent_flow",
      step: `Scored ${dimension?.label ?? score.dimensionId}`,
      details: { dimensionId: score.dimensionId, score: score.score },
    })
    await publishEvent({
      type: "eval_progress",
      dimensionId: score.dimensionId,
      score: score.score,
    })
  }

  return scores
}

// ─── Narrative feedback phase ─────────────────────────────────────────────────

export async function generateNarrativeFeedback(params: FeedbackParams): Promise<FeedbackResult> {
  const { apiKey, baseUrl, modelName, messages, componentScores, overallScore, rubric } = params

  const model = new ChatOpenAI({
    model: modelName ?? getDefaultModelName(baseUrl),
    temperature: 0.3,
    maxTokens: 2048,
    apiKey,
    ...modelRequestConfig(baseUrl),
    // biome-ignore lint/suspicious/noExplicitAny: Zod v4 cross-package type conflict with withStructuredOutput
  }).withStructuredOutput(FeedbackOutputSchema as any)

  const scoresText = componentScores
    .map((s) => {
      const dim = rubric.dimensions.find((d) => d.id === s.dimensionId)
      return `**${dim?.label ?? s.dimensionId}** (${s.score}/100, weight ${((dim?.weight ?? 0) * 100).toFixed(0)}%): ${s.reasoning}`
    })
    .join("\n\n")

  const feedbackPrompt = `The evaluation is complete. Overall score: ${overallScore.toFixed(1)}/100 (passing: ${rubric.passingScore}/100).

Component breakdown:
${scoresText}

Write a structured evaluation response with:
- A "narrative" field: 3–5 paragraphs covering overall performance, strengths, then areas for improvement. Be specific and reference the candidate's actual answer.
- An "improvements" array: the 3–5 most impactful concrete improvements, prioritised by impact.`

  const recentMessages = messages.slice(-6)
  const feedbackMessages = [...recentMessages, new HumanMessage(feedbackPrompt)]
  // biome-ignore lint/suspicious/noExplicitAny: BaseMessage[] generic variance incompatibility across module boundaries
  return (await model.invoke(feedbackMessages as any)) as FeedbackResult
}

// ─── Key validation ───────────────────────────────────────────────────────────

export async function validateOpenAIKey(
  apiKey: string,
  baseUrl?: string,
  modelName?: string,
): Promise<boolean> {
  try {
    const model = new ChatOpenAI({
      // Probe the same OpenAI-compatible model family used by the workspace.
      // OpenRouter accepts this OpenAI model slug; direct OpenAI uses gpt-4o-mini.
      model: modelName ?? getDefaultModelName(baseUrl),
      apiKey,
      maxTokens: 5,
      ...modelRequestConfig(baseUrl),
      timeout: 10_000,
      maxRetries: 0,
    })
    const response = await model.invoke([new HumanMessage("Hi")])
    return Boolean(response)
  } catch {
    return false
  }
}
