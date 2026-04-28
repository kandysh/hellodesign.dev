import type { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import type {
  AgentEvent,
  ComponentScore,
  RubricConfig,
} from "@sysdesign/shared";
import { z } from "zod";
import { buildEvaluationPrompt } from "./prompts.js";
import { clarificationTools } from "./tools.js";
import { ChatDeepSeek } from "@langchain/deepseek";

// ─── Model Configuration ──────────────────────────────────────────────────────

const MODEL_NAME = "deepseek/deepseek-v3.2";

// ─── Logger for capturing LangGraph execution ──────────────────────────────────

export function createAgentFlowLogger(publishEvent: (event: AgentEvent) => Promise<void>) {
  return async (event: Record<string, unknown>) => {
    try {
      const eventName = event.event as string;
      const data = event.data as Record<string, unknown>;
      
      // Log node execution
      if (eventName === "on_chain_start" && event.name === "agent") {
        await publishEvent({
          type: "agent_flow",
          step: "Agent analyzing design",
          details: { phase: "clarification", node: "agent" },
        });
      }
      
      // Log tool calls
      if (eventName === "on_tool_start") {
        const toolName = event.tool as string;
        const toolInput = data.input as Record<string, unknown>;
        await publishEvent({
          type: "agent_flow",
          step: `Tool called: ${toolName}`,
          details: { tool: toolName, input: toolInput },
        });
      }
      
      // Log node transitions
      if (eventName === "on_chain_end" && event.name === "agent") {
        await publishEvent({
          type: "agent_flow",
          step: "Agent completed step",
          details: { node: "agent" },
        });
      }

      if (eventName === "on_chain_start" && event.name === "wait_reply") {
        await publishEvent({
          type: "agent_flow",
          step: "Waiting for user reply",
          details: { node: "wait_reply" },
        });
      }

      // Log workflow end
      if (eventName === "on_chain_end" && event.name === "__root__") {
        await publishEvent({
          type: "agent_flow",
          step: "Clarification phase completed",
          details: { phase: "clarification_done" },
        });
      }
    } catch (error) {
      // Silently ignore logger errors to not disrupt the main flow
      console.debug("[agent_logger] Error in logger:", error);
    }
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuestionContext {
  title: string;
  prompt: string;
  rubric: RubricConfig;
}

export interface ClarificationParams {
  apiKey: string;
  baseUrl?: string;
  initialMessages: BaseMessage[];
  question: QuestionContext;
  submissionId: string;
  publishEvent: (event: AgentEvent) => Promise<void>;
  waitForReply: (submissionId: string) => Promise<string | null>;
}

export interface ClarificationResult {
  messages: BaseMessage[];
  followupRounds: number;
}

export interface EvaluationParams {
  apiKey: string;
  baseUrl?: string;
  messages: BaseMessage[];
  question: QuestionContext;
  submissionId: string;
  publishEvent: (event: AgentEvent) => Promise<void>;
}

export interface FeedbackParams {
  apiKey: string;
  baseUrl?: string;
  messages: BaseMessage[];
  componentScores: ComponentScore[];
  overallScore: number;
  rubric: RubricConfig;
}

export interface FeedbackResult {
  narrative: string;
  improvements: string[];
}

// ─── Structured output schemas ────────────────────────────────────────────────

// Defined locally to avoid cross-package Zod version type conflicts
const ComponentScoreZod = z.object({
  dimensionId: z.string(),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  improvements: z.array(z.string()),
});

const EvalOutputSchema = z.object({
  scores: z
    .array(ComponentScoreZod)
    .describe("One score entry per rubric dimension"),
});

const FeedbackOutputSchema = z.object({
  narrative: z
    .string()
    .describe(
      "3–5 paragraph narrative feedback covering overall performance, strengths, and areas for improvement",
    ),
  improvements: z
    .array(z.string())
    .describe("3–5 prioritised, concrete, actionable improvements"),
});

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
});

// ─── Clarification phase (LangGraph loop) ─────────────────────────────────────

export async function runClarificationPhase(
  params: ClarificationParams,
): Promise<ClarificationResult> {
  const {
    apiKey,
    baseUrl,
    initialMessages,
    question,
    submissionId,
    publishEvent,
    waitForReply,
  } = params;

  const model = new ChatOpenAI({
    model: MODEL_NAME,
    temperature: 0.2,
    apiKey,
    streaming: true,
    ...(baseUrl ? { configuration: { baseURL: baseUrl } } : {}),
  }).bindTools(clarificationTools);

  // Agent node: stream LLM response, publish reasoning chunks
  const agentNode = async (state: typeof ClarificationState.State) => {
    let accumulated: AIMessageChunk | null = null;

    // biome-ignore lint/suspicious/noExplicitAny: BaseMessage[] from LangGraph state has a specialized generic signature incompatible with BaseLanguageModelInput across module boundaries
    for await (const chunk of await model.stream(state.messages as any)) {
      if (typeof chunk.content === "string" && chunk.content) {
        await publishEvent({ type: "reasoning", content: chunk.content });
      }
      accumulated = accumulated
        ? accumulated.concat(chunk)
        : (chunk as AIMessageChunk);
    }

    const response =
      accumulated ?? new AIMessage({ content: "", tool_calls: [] });
    return { messages: [response] };
  };

  // Wait-for-reply node: block on Redis until user responds
  const waitReplyNode = async (state: typeof ClarificationState.State) => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolCall = lastMessage.tool_calls?.[0];

    if (!toolCall) return {};

    const questionText = toolCall.args.question as string;
    const toolCallId =
      typeof toolCall.id === "string" ? toolCall.id : "followup_call";

    await publishEvent({
      type: "followup",
      question: questionText,
      submissionId,
    });

    // Tool result message is required before the next human turn
    const toolResult = new ToolMessage({
      tool_call_id: toolCallId,
      content: "Question sent to candidate. Waiting for their response...",
    });

    const reply = await waitForReply(submissionId);

    if (!reply) {
      // Timed out — let the agent proceed to evaluation
      return {
        messages: [toolResult],
        followupRounds: state.followupRounds + 1,
      };
    }

    await publishEvent({ type: "user_reply", content: reply });

    return {
      messages: [toolResult, new HumanMessage(reply)],
      followupRounds: state.followupRounds + 1,
    };
  };

  const maxRounds = question.rubric.maxFollowupRounds;

  const shouldContinue = (state: typeof ClarificationState.State): string => {
    const lastMessage = state.messages[state.messages.length - 1];

    if (!lastMessage || !AIMessage.isInstance(lastMessage)) return END;

    const aiMsg = lastMessage as AIMessage;
    if (!aiMsg.tool_calls?.length) return END;

    const toolName = aiMsg.tool_calls[0]?.name;

    if (toolName === "ask_followup" && state.followupRounds < maxRounds) {
      return "wait_reply";
    }

    // mark_satisfied, rounds exceeded, or unknown tool → end clarification
    return END;
  };

  const workflow = new StateGraph(ClarificationState)
    .addNode("agent", agentNode)
    .addNode("wait_reply", waitReplyNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      wait_reply: "wait_reply",
      [END]: END,
    })
    .addEdge("wait_reply", "agent")
    .compile();

  const logger = createAgentFlowLogger(publishEvent);
  const config: RunnableConfig = { callbacks: [] };

  const result = await workflow.invoke(
    {
      messages: initialMessages,
      followupRounds: 0,
    },
    { ...config, callbacks: [{ on_chain_start: logger, on_tool_start: logger, on_chain_end: logger }] } as any
  );

  return {
    messages: result.messages,
    followupRounds: result.followupRounds,
  };
}

// ─── Evaluation phase ─────────────────────────────────────────────────────────

export async function runEvaluationPhase(
  params: EvaluationParams,
): Promise<ComponentScore[]> {
  const {
    apiKey,
    baseUrl,
    messages,
    question,
    submissionId: _submissionId,
    publishEvent,
  } = params;

  const dimensionIds = question.rubric.dimensions.map((d) => d.id);
  
  await publishEvent({ type: "agent_flow", step: "Evaluation starting", details: { dimensions: dimensionIds.length } });
  await publishEvent({ type: "eval_start", dimensions: dimensionIds });

  const model = new ChatOpenAI({
    model: MODEL_NAME,
    temperature: 0.1,
    apiKey,
    ...(baseUrl ? { configuration: { baseURL: baseUrl } } : {}),
    // biome-ignore lint/suspicious/noExplicitAny: Zod v4 cross-package type conflict with withStructuredOutput
  }).withStructuredOutput(EvalOutputSchema as any);

  const evalMessages = [
    ...messages,
    new HumanMessage(buildEvaluationPrompt(dimensionIds)),
  ];

  await publishEvent({ type: "agent_flow", step: "Evaluating design against rubric", details: { dimensionCount: dimensionIds.length } });

  // biome-ignore lint/suspicious/noExplicitAny: BaseMessage[] generic variance incompatibility across module boundaries
  const { scores } = (await model.invoke(evalMessages as any)) as {
    scores: ComponentScore[];
  };

  for (const score of scores) {
    const dimension = question.rubric.dimensions.find((d) => d.id === score.dimensionId);
    await publishEvent({
      type: "agent_flow",
      step: `Scored ${dimension?.label ?? score.dimensionId}`,
      details: { dimensionId: score.dimensionId, score: score.score, reasoning: score.reasoning },
    });
    await publishEvent({
      type: "eval_progress",
      dimensionId: score.dimensionId,
      score: score.score,
    });
  }

  return scores;
}

// ─── Narrative feedback phase ─────────────────────────────────────────────────

export async function generateNarrativeFeedback(
  params: FeedbackParams,
): Promise<FeedbackResult> {
  const { apiKey, baseUrl, messages, componentScores, overallScore, rubric } =
    params;

  const model = new ChatOpenAI({
    model: MODEL_NAME,
    temperature: 0.3,
    apiKey,
    ...(baseUrl ? { configuration: { baseURL: baseUrl } } : {}),
    // biome-ignore lint/suspicious/noExplicitAny: Zod v4 cross-package type conflict with withStructuredOutput
  }).withStructuredOutput(FeedbackOutputSchema as any);

  const scoresText = componentScores
    .map((s) => {
      const dim = rubric.dimensions.find((d) => d.id === s.dimensionId);
      return `**${dim?.label ?? s.dimensionId}** (${s.score}/100, weight ${((dim?.weight ?? 0) * 100).toFixed(0)}%): ${s.reasoning}`;
    })
    .join("\n\n");

  const feedbackPrompt = `The evaluation is complete. Overall score: ${overallScore.toFixed(1)}/100 (passing: ${rubric.passingScore}/100).

Component breakdown:
${scoresText}

Write a structured evaluation response with:
- A "narrative" field: 3–5 paragraphs covering overall performance, strengths, then areas for improvement. Be specific and reference the candidate's actual answer.
- An "improvements" array: the 3–5 most impactful concrete improvements, prioritised by impact.`;

  const recentMessages = messages.slice(-6);
  const feedbackMessages = [
    ...recentMessages,
    new HumanMessage(feedbackPrompt),
  ];
  // biome-ignore lint/suspicious/noExplicitAny: BaseMessage[] generic variance incompatibility across module boundaries
  return (await model.invoke(feedbackMessages as any)) as FeedbackResult;
}

// ─── Key validation ───────────────────────────────────────────────────────────

export async function validateOpenAIKey(
  apiKey: string,
  baseUrl?: string,
): Promise<boolean> {
  try {
    const model = new ChatOpenAI({
      model: MODEL_NAME,
      apiKey,
      maxTokens: 5,
      ...(baseUrl ? { configuration: { baseURL: baseUrl } } : {}),
    });
    const response = await model.invoke([new HumanMessage("Hi")]);
    console.log(response);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
