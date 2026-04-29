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
      question: z.string().describe("The clarifying question to ask the user. Be specific."),
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

export const flagRiskTool = tool(
  async ({ component, risk, severity }) => {
    return `Risk flagged: ${severity.toUpperCase()} — ${component}: ${risk}`
  },
  {
    name: "flag_risk",
    description:
      "Annotate a specific design risk, single point of failure, data-loss scenario, or architectural gap. Call this immediately when you spot one — it does NOT count against your follow-up quota and does NOT require a user response. You may call it multiple times. Typical triggers: no replication on stateful stores, synchronous cascading calls, missing rate limiting, no retry/backoff, missing auth on internal APIs.",
    schema: z.object({
      component: z.string().describe("The system component or architectural area where the risk lives (e.g. 'MySQL primary', 'Payment service', 'API Gateway')"),
      risk: z.string().describe("Concise description of the risk or vulnerability (e.g. 'Single point of failure — no read replicas or failover configured')"),
      severity: z.enum(["critical", "high", "medium"]).describe("critical = likely data loss or full outage; high = major degraded availability or correctness; medium = notable operational concern"),
    }),
  },
)

export const probeTradeOffTool = tool(
  async ({ decision, alternative, question }) => {
    return `Trade-off probe — '${decision}' vs '${alternative}': ${question}`
  },
  {
    name: "probe_trade_off",
    description:
      "Challenge a specific design decision the candidate made and ask them to justify it against a reasonable alternative. Use this when an important architectural choice was stated without explanation — e.g. SQL vs NoSQL, monolith vs microservices, sync vs async, eventual vs strong consistency. This counts toward your follow-up quota.",
    schema: z.object({
      decision: z.string().describe("The design choice the candidate made (e.g. 'PostgreSQL for the user feed')"),
      alternative: z.string().describe("A reasonable alternative they didn't justify against (e.g. 'Cassandra or a document store')"),
      question: z.string().describe("The specific challenge to ask the candidate (be pointed, not generic)"),
    }),
  },
)

export const requestEstimationTool = tool(
  async ({ metric, context, question }) => {
    return `Estimation request [${metric}] — ${context}: ${question}`
  },
  {
    name: "request_estimation",
    description:
      "Ask the candidate to perform a back-of-envelope capacity estimation. Use when the design relies on scale assumptions that haven't been quantified and the numbers would materially affect the architecture — e.g. whether a single DB can handle write throughput, whether a cache is justified, or what storage tier is needed. This counts toward your follow-up quota.",
    schema: z.object({
      metric: z.enum(["qps", "storage", "bandwidth", "latency", "compute", "fan_out"]).describe("The primary metric to estimate"),
      context: z.string().describe("Which part of the system and why the estimate matters"),
      question: z.string().describe("The estimation question to pose to the candidate"),
    }),
  },
)

/** Tool names that require waiting for a user reply */
export const REPLY_TOOL_NAMES = new Set(["ask_followup", "probe_trade_off", "request_estimation"])

/** Tool names that are instant annotations (no user reply needed) */
export const ANNOTATION_TOOL_NAMES = new Set(["flag_risk"])

export const clarificationTools = [
  askFollowupTool,
  markSatisfiedTool,
  flagRiskTool,
  probeTradeOffTool,
  requestEstimationTool,
]
