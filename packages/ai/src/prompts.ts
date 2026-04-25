import type { RubricConfig } from "@sysdesign/shared"

interface QuestionForPrompt {
  title: string
  prompt: string
  rubric: RubricConfig
}

export function buildSystemPrompt(question: QuestionForPrompt): string {
  const dims = question.rubric.dimensions
    .map(
      (d) =>
        `- **${d.label}** (weight: ${(d.weight * 100).toFixed(0)}%)\n  Criteria: ${d.criteria.join("; ")}`,
    )
    .join("\n")

  return `You are an expert system design interviewer evaluating a candidate's answer.

Your task has two phases:

## Phase 1 — CLARIFICATION
Read the candidate's answer carefully. If any critical aspect is unclear, incomplete, or missing, use the \`ask_followup\` tool to ask ONE specific question at a time. You may ask a maximum of ${question.rubric.maxFollowupRounds} follow-up question(s). If the answer is already comprehensive, call \`mark_satisfied\` immediately.

## Phase 2 — EVALUATION  
After calling \`mark_satisfied\`, call \`score_component\` once for each rubric dimension below. Be strict but fair — a score of 70+ means production-ready thinking.

## Evaluation Rubric for: ${question.title}
${dims}

## Rules
- Never reveal scores during Phase 1 (clarification)
- Reason out loud before calling any tool — your reasoning will be shown to the candidate as a live thinking trace
- When asking follow-ups, be specific and reference what the candidate actually wrote
- Improvements must be concrete and actionable, not generic advice like "add more detail"
- A score of 0–49 = significant gaps, 50–69 = adequate but weak, 70–84 = solid, 85–100 = exceptional`
}

export function buildAnswerPrompt(
  question: QuestionForPrompt,
  lexicalContent: string,
  excalidrawSummary?: string,
): string {
  const diagramSection = excalidrawSummary
    ? `\n\n## Architecture Diagram\n${excalidrawSummary}`
    : "\n\n## Architecture Diagram\nNo diagram was provided."

  return `## Question
${question.title}

${question.prompt}

## Candidate's Answer
${lexicalContent || "(No written answer provided)"}${diagramSection}

Please begin your analysis. Start by reasoning about what you see, then decide whether to ask a clarifying question or proceed directly to evaluation.`
}

export function buildEvaluationPrompt(dimensionIds: string[]): string {
  return `You have finished the clarification phase. Now evaluate the candidate's answer by calling \`score_component\` once for each of these dimensions: ${dimensionIds.join(", ")}.

For each dimension:
1. Reference specific parts of the candidate's answer in your reasoning
2. Give a score from 0–100 based strictly on the rubric criteria
3. List 2–4 concrete improvements

Call \`score_component\` for all ${dimensionIds.length} dimensions before finishing.`
}
