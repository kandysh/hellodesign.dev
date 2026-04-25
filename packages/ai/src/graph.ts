import { StateGraph, END, START, Annotation } from "@langchain/langgraph"
import { AIMessage, HumanMessage, ToolMessage, BaseMessage } from "@langchain/core/messages"
import { ChatMistralAI } from "@langchain/mistralai"
import type { AIMessageChunk } from "@langchain/core/messages"
import { clarificationTools, evaluationTools, scoreComponentTool } from "./tools.js"
import { buildEvaluationPrompt } from "./prompts.js"
import type { AgentEvent, ComponentScore, RubricConfig } from "@sysdesign/shared"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuestionContext {
  title: string
  prompt: string
  rubric: RubricConfig
}

export interface ClarificationParams {
  apiKey: string
  initialMessages: BaseMessage[]
  question: QuestionContext
  submissionId: string
  publishEvent: (event: AgentEvent) => Promise<void>
  waitForReply: (submissionId: string) => Promise<string | null>
}

export interface ClarificationResult {
  messages: BaseMessage[]
  followupRounds: number
}

export interface EvaluationParams {
  apiKey: string
  messages: BaseMessage[]
  question: QuestionContext
  submissionId: string
  publishEvent: (event: AgentEvent) => Promise<void>
}

export interface FeedbackParams {
  apiKey: string
  messages: BaseMessage[]
  componentScores: ComponentScore[]
  overallScore: number
  rubric: RubricConfig
}

export interface FeedbackResult {
  narrative: string
  improvements: string[]
}

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
})

// ─── Clarification phase (LangGraph loop) ─────────────────────────────────────

export async function runClarificationPhase(
  params: ClarificationParams,
): Promise<ClarificationResult> {
  const { apiKey, initialMessages, question, submissionId, publishEvent, waitForReply } = params

  const model = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0.2,
    apiKey,
    streaming: true,
  }).bindTools(clarificationTools)

  // Agent node: stream LLM response, publish reasoning chunks
  const agentNode = async (state: typeof ClarificationState.State) => {
    const stream = model.stream(state.messages)

    let accumulated: AIMessageChunk | null = null

    for await (const chunk of await stream) {
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
    const toolCall = lastMessage.tool_calls?.[0]

    if (!toolCall) return {}

    const question_text = toolCall.args.question as string
    const toolCallId = typeof toolCall.id === "string" ? toolCall.id : "followup_call"

    await publishEvent({ type: "followup", question: question_text, submissionId })

    // Add the tool result message (required for Mistral's tool message format)
    const toolResult = new ToolMessage({
      tool_call_id: toolCallId,
      content: "Question sent to candidate. Waiting for their response...",
    })

    const reply = await waitForReply(submissionId)

    if (!reply) {
      // Timed out — add the tool result and let the agent proceed to evaluation
      return {
        messages: [toolResult],
        followupRounds: state.followupRounds + 1,
      }
    }

    await publishEvent({ type: "user_reply", content: reply })

    return {
      messages: [toolResult, new HumanMessage(reply)],
      followupRounds: state.followupRounds + 1,
    }
  }

  const maxRounds = question.rubric.maxFollowupRounds

  // Routing: decide next node after the agent runs
  const shouldContinue = (state: typeof ClarificationState.State): string => {
    const lastMessage = state.messages[state.messages.length - 1]

    if (!lastMessage || lastMessage._getType() !== "ai") return END

    const aiMsg = lastMessage as AIMessage
    if (!aiMsg.tool_calls?.length) return END // no tool call → implicitly satisfied

    const toolName = aiMsg.tool_calls[0]?.name

    if (toolName === "ask_followup" && state.followupRounds < maxRounds) {
      return "wait_reply"
    }

    // mark_satisfied, exceeded rounds, or unknown tool → end clarification
    return END
  }

  const workflow = new StateGraph(ClarificationState)
    .addNode("agent", agentNode)
    .addNode("wait_reply", waitReplyNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      wait_reply: "wait_reply",
      [END]: END,
    })
    .addEdge("wait_reply", "agent")
    .compile()

  const result = await workflow.invoke({
    messages: initialMessages,
    followupRounds: 0,
  })

  return {
    messages: result.messages,
    followupRounds: result.followupRounds,
  }
}

// ─── Evaluation phase ─────────────────────────────────────────────────────────

export async function runEvaluationPhase(
  params: EvaluationParams,
): Promise<ComponentScore[]> {
  const { apiKey, messages, question, submissionId, publishEvent } = params

  const dimensionIds = question.rubric.dimensions.map((d) => d.id)
  await publishEvent({ type: "eval_start", dimensions: dimensionIds })

  const model = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0.1,
    apiKey,
    streaming: true,
  }).bindTools(evaluationTools)

  const evalMessages = [
    ...messages,
    new HumanMessage(buildEvaluationPrompt(dimensionIds)),
  ]

  const stream = model.stream(evalMessages)
  let accumulated: AIMessageChunk | null = null

  for await (const chunk of await stream) {
    if (typeof chunk.content === "string" && chunk.content) {
      await publishEvent({ type: "reasoning", content: chunk.content })
    }
    accumulated = accumulated ? accumulated.concat(chunk) : (chunk as AIMessageChunk)
  }

  const toolCalls = (accumulated as AIMessage)?.tool_calls ?? []
  const scores: ComponentScore[] = []

  for (const tc of toolCalls) {
    if (tc.name === "score_component") {
      const score: ComponentScore = {
        dimensionId: tc.args.dimensionId as string,
        score: tc.args.score as number,
        reasoning: tc.args.reasoning as string,
        improvements: tc.args.improvements as string[],
      }
      scores.push(score)
      await publishEvent({ type: "eval_progress", dimensionId: score.dimensionId, score: score.score })
    }
  }

  return scores
}

// ─── Narrative feedback phase ─────────────────────────────────────────────────

export async function generateNarrativeFeedback(
  params: FeedbackParams,
): Promise<FeedbackResult> {
  const { apiKey, messages, componentScores, overallScore, rubric } = params

  const model = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0.3,
    apiKey,
  })

  const scoresText = componentScores
    .map((s) => {
      const dim = rubric.dimensions.find((d) => d.id === s.dimensionId)
      return `**${dim?.label ?? s.dimensionId}** (${s.score}/100, weight ${((dim?.weight ?? 0) * 100).toFixed(0)}%): ${s.reasoning}`
    })
    .join("\n\n")

  const feedbackPrompt = `The evaluation is complete. Overall score: ${overallScore.toFixed(1)}/100 (passing: ${rubric.passingScore}/100).

Component breakdown:
${scoresText}

Write a structured evaluation response in JSON with this exact format:
{
  "narrative": "3-5 paragraph narrative feedback. Start with overall performance, then cover strengths, then areas for improvement. Be specific and reference the candidate's actual answer.",
  "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"]
}

The improvements array should contain 3-5 of the MOST IMPORTANT concrete improvements, prioritized by impact.`

  const recentMessages = messages.slice(-6) // keep context manageable
  const response = await model.invoke([
    ...recentMessages,
    new HumanMessage(feedbackPrompt),
  ])

  const content = typeof response.content === "string" ? response.content : ""

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as FeedbackResult
      if (parsed.narrative && Array.isArray(parsed.improvements)) {
        return parsed
      }
    }
  } catch {
    // Fall through to default
  }

  return {
    narrative: content || "Evaluation complete. See component scores for details.",
    improvements: componentScores.flatMap((s) => s.improvements).slice(0, 5),
  }
}

// ─── Key validation ───────────────────────────────────────────────────────────

export async function validateMistralKey(apiKey: string): Promise<boolean> {
  try {
    const model = new ChatMistralAI({
      model: "mistral-tiny",
      apiKey,
      maxTokens: 5,
    })
    await model.invoke([new HumanMessage("Hi")])
    return true
  } catch {
    return false
  }
}
