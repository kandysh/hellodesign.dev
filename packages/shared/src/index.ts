import { z } from "zod"

// ─── Rubric ───────────────────────────────────────────────────────────────────

export interface RubricDimension {
  id: string
  label: string
  weight: number // 0–1; all weights must sum to 1
  criteria: string[]
  maxScore: number // always 100; final score is weighted
}

export interface RubricConfig {
  dimensions: RubricDimension[]
  passingScore: number // e.g. 70
  maxFollowupRounds: number // e.g. 3
}

export interface ComponentScore {
  dimensionId: string
  score: number // 0–100
  reasoning: string
  improvements: string[]
}

// ─── Agent modes & personas ───────────────────────────────────────────────────

export type InterviewerMood = "pragmatist" | "systems" | "sre" | "pm"

export const MOOD_LABELS: Record<InterviewerMood, string> = {
  pragmatist: "The Pragmatist",
  systems: "The Systems Thinker",
  sre: "The SRE",
  pm: "The PM",
}

// ─── Job payloads ─────────────────────────────────────────────────────────────

export interface EvalJobData {
  submissionId: string
  questionId: string
  userId?: string
  sessionId?: string
  agentType: "quick" | "deep"
  mood: InterviewerMood
  modelName?: string
  lexicalContent: string // plain text from Lexical JSON
  excalidrawSummary?: string // text summary of diagram
}

export interface FollowupJobData {
  submissionId: string
  replyContent: string
  userId?: string
  sessionId?: string
}

// ─── SSE events ──────────────────────────────────────────────────────────────

export type AgentEvent =
  | { type: "reasoning"; content: string }
  | { type: "followup"; question: string; submissionId: string }
  | { type: "user_reply"; content: string }
  | { type: "eval_start"; dimensions: string[]; dimensionLabels: Record<string, string> }
  | { type: "eval_progress"; dimensionId: string; score: number }
  | { type: "eval_done"; submissionId: string }
  | { type: "error"; message: string }
  | { type: "agent_flow"; step: string; details?: Record<string, unknown> }
  | { type: "risk_flag"; component: string; risk: string; severity: "critical" | "high" | "medium" }

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const RubricDimensionSchema = z.object({
  id: z.string(),
  label: z.string(),
  weight: z.number().min(0).max(1),
  criteria: z.array(z.string()),
  maxScore: z.number().default(100),
})

export const RubricConfigSchema = z.object({
  dimensions: z.array(RubricDimensionSchema),
  passingScore: z.number().min(0).max(100),
  maxFollowupRounds: z.number().min(0).max(5),
})

export const ComponentScoreSchema = z.object({
  dimensionId: z.string(),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  improvements: z.array(z.string()),
})

export const EvalJobDataSchema = z.object({
  submissionId: z.string(),
  questionId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  agentType: z.enum(["quick", "deep"]),
  mood: z.enum(["pragmatist", "systems", "sre", "pm"]),
  lexicalContent: z.string(),
  excalidrawSummary: z.string().optional(),
})

export const FollowupJobDataSchema = z.object({
  submissionId: z.string(),
  replyContent: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
})

// ─── Default rubric ───────────────────────────────────────────────────────────

export const DEFAULT_RUBRIC: RubricConfig = {
  passingScore: 70,
  maxFollowupRounds: 2,
  dimensions: [
    {
      id: "requirements",
      label: "Requirements Clarity",
      weight: 0.1,
      maxScore: 100,
      criteria: [
        "Functional requirements stated clearly",
        "Non-functional requirements addressed (scale, latency, availability)",
        "Scope and assumptions defined",
        "Trade-offs acknowledged",
      ],
    },
    {
      id: "scalability",
      label: "Scalability",
      weight: 0.2,
      maxScore: 100,
      criteria: [
        "Bottleneck identification and mitigation",
        "Horizontal scaling approach",
        "Load balancing strategy",
        "Traffic estimation and capacity planning",
      ],
    },
    {
      id: "db_design",
      label: "Database Design",
      weight: 0.2,
      maxScore: 100,
      criteria: [
        "Appropriate database type selection with justification",
        "Entity relationships and schema clarity",
        "Indexes for common access patterns",
        "Partitioning/sharding keys when relevant",
      ],
    },
    {
      id: "fault_tolerance",
      label: "Fault Tolerance",
      weight: 0.15,
      maxScore: 100,
      criteria: [
        "Failure mode identification",
        "Retry/circuit breaker patterns",
        "Data replication strategy",
        "Graceful degradation",
      ],
    },
    {
      id: "api_design",
      label: "API Design",
      weight: 0.15,
      maxScore: 100,
      criteria: [
        "Clear API endpoints or message schemas",
        "Appropriate protocol selection (REST/gRPC/GraphQL)",
        "Authentication and authorization",
        "Pagination, versioning, error handling",
      ],
    },
    {
      id: "caching",
      label: "Caching Strategy",
      weight: 0.1,
      maxScore: 100,
      criteria: [
        "Cache placement (CDN, application, database)",
        "Cache invalidation strategy",
        "Cache eviction policy",
        "Read vs write caching trade-offs",
      ],
    },
    {
      id: "trade_offs",
      label: "Trade-off Reasoning",
      weight: 0.1,
      maxScore: 100,
      criteria: [
        "Explicit acknowledgement of design trade-offs",
        "Alternative approaches considered",
        "CAP theorem application when relevant",
        "Cost vs performance reasoning",
      ],
    },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function computeWeightedScore(
  scores: ComponentScore[],
  rubric: RubricConfig,
): number {
  return scores.reduce((total, s) => {
    const dim = rubric.dimensions.find((d) => d.id === s.dimensionId)
    if (!dim) return total
    return total + s.score * dim.weight
  }, 0)
}

/**
 * Extract plain text from a Lexical editor JSON state.
 * Recursively walks the node tree and collects text nodes.
 */
export function extractLexicalText(lexicalState: unknown): string {
  if (!lexicalState || typeof lexicalState !== "object") return ""
  const state = lexicalState as Record<string, unknown>

  function walk(node: unknown): string {
    if (!node || typeof node !== "object") return ""
    const n = node as Record<string, unknown>

    if (n.type === "text" && typeof n.text === "string") return n.text

    const children = n.children
    if (!Array.isArray(children)) return ""

    const parts: string[] = children.map(walk).filter(Boolean)

    // Add newlines after block-level nodes
    const blockTypes = new Set(["paragraph", "heading", "listitem", "quote"])
    const sep = typeof n.type === "string" && blockTypes.has(n.type) ? "\n" : ""
    return parts.join("") + sep
  }

  const root = state.root ?? state
  return walk(root).trim()
}

/**
 * Convert Excalidraw elements JSON to a human-readable text summary.
 */
export function summarizeExcalidraw(elements: unknown): string {
  if (!Array.isArray(elements) || elements.length === 0) {
    return "No diagram provided."
  }

  const counts: Record<string, number> = {}
  const labels: string[] = []
  const connections: string[] = []

  for (const el of elements) {
    if (!el || typeof el !== "object") continue
    const e = el as Record<string, unknown>

    const type = (e.type as string) ?? "unknown"
    counts[type] = (counts[type] ?? 0) + 1

    if (e.type === "text" && typeof e.text === "string" && e.text.trim()) {
      labels.push(`"${e.text.trim()}"`)
    }
    if (
      (e.type === "rectangle" || e.type === "ellipse" || e.type === "diamond") &&
      typeof e.label === "object" &&
      e.label !== null
    ) {
      const labelText = (e.label as Record<string, unknown>).text
      if (typeof labelText === "string" && labelText.trim()) {
        labels.push(`${type}: "${labelText.trim()}"`)
      }
    }
    if (e.type === "arrow" && e.startBinding && e.endBinding) {
      connections.push("→ (arrow connection)")
    }
  }

  const parts: string[] = []

  const shapeSummary = Object.entries(counts)
    .map(([type, count]) => `${count} ${type}(s)`)
    .join(", ")
  parts.push(`Diagram contains: ${shapeSummary}.`)

  if (labels.length > 0) {
    parts.push(`Labels: ${labels.slice(0, 20).join(", ")}.`)
  }

  if (connections.length > 0) {
    parts.push(`${connections.length} connections between components.`)
  }

  return parts.join(" ")
}
