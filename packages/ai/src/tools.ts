import { tool } from "@langchain/core/tools"
import { z } from "zod"

export const askFollowupTool = tool(
  async ({ question, aspect }) => {
    // Execution is handled by the graph routing, not this function.
    // Return value is added as a ToolMessage for conversation continuity.
    return `Follow-up question about "${aspect}": ${question}`
  },
  {
    name: "ask_followup",
    description:
      "Ask the user a clarifying question before evaluating. Use when the answer is ambiguous, incomplete, or you need more context on a specific design decision. Do not use more than the allowed number of times.",
    schema: z.object({
      question: z
        .string()
        .describe("The clarifying question to ask the user. Be specific."),
      aspect: z
        .string()
        .describe(
          "Which aspect of the system design this question relates to (e.g. 'scalability', 'database choice')",
        ),
    }),
  },
)

export const markSatisfiedTool = tool(
  async () => {
    return "Proceeding to evaluation phase."
  },
  {
    name: "mark_satisfied",
    description:
      "Call this when you have enough information to evaluate the answer — either because it is comprehensive or you have gathered enough follow-up context. Do not call this before asking at least one follow-up if the answer has significant gaps.",
    schema: z.object({}),
  },
)

export const scoreComponentTool = tool(
  async ({ dimensionId, score, reasoning, improvements }) => {
    return `Scored ${dimensionId}: ${score}/100`
  },
  {
    name: "score_component",
    description:
      "Score one rubric dimension. Call once per dimension after marking satisfied. Be strict but fair — 70+ means production-ready thinking.",
    schema: z.object({
      dimensionId: z.string().describe("The rubric dimension ID to score"),
      score: z.number().min(0).max(100).describe("Score from 0 to 100"),
      reasoning: z
        .string()
        .describe(
          "Detailed reasoning for this score, referencing specific parts of the candidate's answer",
        ),
      improvements: z
        .array(z.string())
        .describe(
          "Concrete, actionable improvements the candidate should make for this dimension",
        ),
    }),
  },
)

export const clarificationTools = [askFollowupTool, markSatisfiedTool]
export const evaluationTools = [scoreComponentTool]
