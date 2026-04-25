import { z } from "zod"
import type { AgentOutput } from "./agents/index.js"
import {
  APIDesignAgent,
  CapacityEstimationAgent,
  DataModelAgent,
  DiagramConsistencyAgent,
  HighLevelDesignAgent,
  OrchestratorAgent,
  RequirementsAgent,
  ScalabilityAgent,
  agentOutputSchema,
} from "./agents/index.js"
import type { AgentName, AgentResult, OrchestratorResult } from "@sysdesign/types"

export interface EvalInput {
  question: { title: string; description: string; rubricHints: string[] }
  answerText: string
  excalidrawJson: Record<string, unknown> | null
}

export interface EvalProgress {
  agentName: AgentName
  result: AgentResult
}

export interface EvalOutput {
  agentResults: AgentResult[]
  orchestrator: OrchestratorResult
}

function buildPrompt(input: EvalInput): string {
  const diagramNote = input.excalidrawJson
    ? `\n\nDIAGRAM: The candidate provided an Excalidraw diagram (JSON below).\n${JSON.stringify(input.excalidrawJson, null, 2)}`
    : "\n\nDIAGRAM: No diagram was provided."

  return `QUESTION: ${input.question.title}
${input.question.description}

RUBRIC HINTS: ${input.question.rubricHints.join(", ")}

CANDIDATE'S ANSWER:
${input.answerText}${diagramNote}`
}

async function runAgent(
  agent: typeof RequirementsAgent,
  agentName: AgentName,
  prompt: string,
  onProgress?: (result: EvalProgress) => void,
): Promise<AgentResult> {
  const response = await agent.generate(prompt, {
    output: agentOutputSchema,
  })

  const output = response.object as AgentOutput

  const result: AgentResult = {
    agentName,
    score: output.score,
    strengths: output.strengths,
    weaknesses: output.weaknesses,
    suggestions: output.suggestions,
  }

  onProgress?.({ agentName, result })

  return result
}

const orchestratorOutputSchema = z.object({
  overallScore: z.number().min(0).max(10),
  topStrengths: z.array(z.string()),
  criticalGaps: z.array(z.string()),
  prioritizedSuggestions: z.array(z.string()),
})

export async function runEvalWorkflow(
  input: EvalInput,
  onProgress?: (progress: EvalProgress) => void,
): Promise<EvalOutput> {
  const prompt = buildPrompt(input)

  // Run all 7 evaluation agents in parallel
  const [requirements, capacity, highLevel, dataModel, api, scalability, diagram] =
    await Promise.all([
      runAgent(RequirementsAgent, "RequirementsAgent", prompt, onProgress),
      runAgent(CapacityEstimationAgent, "CapacityEstimationAgent", prompt, onProgress),
      runAgent(HighLevelDesignAgent, "HighLevelDesignAgent", prompt, onProgress),
      runAgent(DataModelAgent, "DataModelAgent", prompt, onProgress),
      runAgent(APIDesignAgent, "APIDesignAgent", prompt, onProgress),
      runAgent(ScalabilityAgent, "ScalabilityAgent", prompt, onProgress),
      runAgent(DiagramConsistencyAgent, "DiagramConsistencyAgent", prompt, onProgress),
    ])

  const agentResults = [requirements, capacity, highLevel, dataModel, api, scalability, diagram]

  // Build orchestrator prompt with all agent results
  const orchestratorPrompt = `Here are the evaluation results from 7 specialist agents:

${agentResults
  .map(
    (r) => `## ${r.agentName} (Score: ${r.score}/10)
Strengths: ${r.strengths.join("; ")}
Weaknesses: ${r.weaknesses.join("; ")}
Suggestions: ${r.suggestions.join("; ")}`,
  )
  .join("\n\n")}

Based on all of the above, provide the final synthesized evaluation.`

  const orchestratorResponse = await OrchestratorAgent.generate(orchestratorPrompt, {
    output: orchestratorOutputSchema,
  })

  const orchestrator = orchestratorResponse.object as OrchestratorResult

  return { agentResults, orchestrator }
}
