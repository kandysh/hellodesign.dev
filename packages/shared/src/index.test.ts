import assert from "node:assert/strict"
import test from "node:test"
import { assertRubric, computeWeightedScore, normalizeRubric } from "./index.js"
import type { ComponentScore, RubricConfig } from "./index.js"

const rubric: RubricConfig = {
  passingScore: 70,
  maxFollowupRounds: 2,
  dimensions: [
    { id: "a", label: "A", weight: 0.8, criteria: [], maxScore: 100 },
    { id: "b", label: "B", weight: 0.8, criteria: [], maxScore: 100 },
  ],
}

test("normalizes legacy rubric weights before scoring", () => {
  const scores: ComponentScore[] = [
    { dimensionId: "a", score: 80, reasoning: "", improvements: [] },
    { dimensionId: "b", score: 100, reasoning: "", improvements: [] },
  ]
  assert.equal(computeWeightedScore(scores, rubric), 90)
  assert.equal(computeWeightedScore(scores.map((score) => ({ ...score, score: 100 })), rubric), 100)
})

test("normalizes and asserts rubric weights", () => {
  const normalized = normalizeRubric(rubric)
  assert.equal(normalized.dimensions[0]!.weight + normalized.dimensions[1]!.weight, 1)
  assert.doesNotThrow(() => assertRubric(normalized))
  assert.throws(() => assertRubric(rubric), /sum to 1/)
  assert.throws(() => normalizeRubric({ ...rubric, dimensions: [] }), /positive finite total/)
})
