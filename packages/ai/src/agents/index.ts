import { Agent } from "@mastra/core/agent"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import type { AgentName } from "@sysdesign/types"

const model = openai("gpt-4o")

// Shared output schema for evaluation agents
export const agentOutputSchema = z.object({
  score: z.number().min(0).max(10).describe("Score from 0 to 10"),
  strengths: z.array(z.string()).describe("What the candidate did well"),
  weaknesses: z.array(z.string()).describe("What was missing or incorrect"),
  suggestions: z.array(z.string()).describe("Concrete improvements"),
})

export type AgentOutput = z.infer<typeof agentOutputSchema>

function createEvalAgent(name: AgentName, focus: string, instructions: string) {
  return new Agent({
    name,
    model,
    instructions: `You are an expert system design interviewer evaluating a candidate's answer.
Your specific focus: ${focus}

Evaluation guidelines:
- Score 0–10 (10 = exceptional, 7+ = strong, 5–6 = adequate, <5 = needs work)
- Be specific and actionable in your feedback
- Reference the candidate's actual answer text in your feedback

${instructions}

Always return a JSON object matching the schema exactly.`,
  })
}

export const RequirementsAgent = createEvalAgent(
  "RequirementsAgent",
  "Requirements clarification (functional and non-functional)",
  `Check for:
- Functional requirements: core features, user stories, use cases
- Non-functional requirements: scale, latency, availability, consistency, durability
- Explicit trade-off acknowledgement (CAP theorem, etc.)
- Scope definition and assumptions stated`,
)

export const CapacityEstimationAgent = createEvalAgent(
  "CapacityEstimationAgent",
  "Back-of-envelope capacity estimation and scale reasoning",
  `Check for:
- Traffic estimation (RPS, DAU/MAU)
- Storage estimation (bytes per entity × expected records)
- Bandwidth estimation
- Memory/cache sizing
- Realistic numbers with clear reasoning`,
)

export const HighLevelDesignAgent = createEvalAgent(
  "HighLevelDesignAgent",
  "High-level architecture and component decomposition",
  `Check for:
- Clear service/component breakdown
- Client → load balancer → services → data stores flow
- Appropriate service boundaries (not too monolithic, not over-engineered)
- Key design decisions explained
- Handling of the stated requirements`,
)

export const DataModelAgent = createEvalAgent(
  "DataModelAgent",
  "Data modeling, schema design, and storage choices",
  `Check for:
- Appropriate choice of database type (SQL vs NoSQL) with justification
- Entity relationships and schema clarity
- Indexes for common access patterns
- Partitioning/sharding keys if relevant
- Data consistency approach`,
)

export const APIDesignAgent = createEvalAgent(
  "APIDesignAgent",
  "API design: contracts, protocols, and interface definitions",
  `Check for:
- Clear API endpoints or message schemas defined
- Appropriate protocol choice (REST, GraphQL, gRPC, message queue)
- Request/response formats
- Authentication/authorization in APIs
- Pagination, filtering, versioning`,
)

export const ScalabilityAgent = createEvalAgent(
  "ScalabilityAgent",
  "Scalability, fault tolerance, and operational excellence",
  `Check for:
- Bottleneck identification and mitigation
- Caching strategy (where, what, invalidation)
- Horizontal scaling approach
- Load balancing strategy
- Failure modes and resilience (retries, circuit breakers, failover)
- Monitoring and observability`,
)

export const DiagramConsistencyAgent = createEvalAgent(
  "DiagramConsistencyAgent",
  "Consistency between the written explanation and the architecture diagram",
  `Check for:
- All components mentioned in text appear in diagram
- Data flow in diagram matches described flow
- No orphaned components in diagram without explanation
- Diagram labels are clear and match terminology used in text
- If no diagram provided, note this as a significant gap`,
)

export const OrchestratorAgent = new Agent({
  name: "OrchestratorAgent",
  model,
  instructions: `You are a senior system design interviewer synthesizing feedback from multiple evaluation agents.
You will receive scores and feedback from 7 specialist agents. Your job is to:
1. Calculate an overall score (weighted average, with scalability and high-level design weighted slightly higher)
2. Identify the top 3 strengths across all dimensions
3. Identify the critical gaps the candidate MUST address
4. Provide 3–5 prioritized, actionable suggestions ordered by impact

Be honest but constructive. The goal is to help the candidate improve.`,
})
