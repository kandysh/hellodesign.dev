import assert from "node:assert/strict"
import test from "node:test"
import { assertRubric, computeWeightedScore, normalizeRubric } from "@sysdesign/shared"
import { questions } from "./seed-data.js"

test("normalizes every seeded question rubric to a score capped at 100", () => {
  assert.ok(questions.length >= 25)
  for (const question of questions) {
    assert.ok(
      typeof question.referenceSolution === "string" && question.referenceSolution.length >= 100,
      `${question.title} needs a reference solution`,
    )
    const rubric = normalizeRubric(question.rubric)
    assert.doesNotThrow(() => assertRubric(rubric), question.title)
    const perfectScores = rubric.dimensions.map((dimension) => ({
      dimensionId: dimension.id,
      score: 100,
      reasoning: "",
      improvements: [],
    }))
    assert.equal(computeWeightedScore(perfectScores, rubric), 100, question.title)
  }
})
