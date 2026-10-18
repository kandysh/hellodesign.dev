import assert from "node:assert/strict"
import test from "node:test"
import type { ComponentScore, RubricConfig } from "./index.js"
import {
  assertRubric,
  computeWeightedScore,
  extractLexicalText,
  getDefaultModelName,
  normalizeOpenAICompatibleBaseUrl,
  normalizeRubric,
  summarizeExcalidraw,
} from "./index.js"

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
  assert.equal(
    computeWeightedScore(
      scores.map((score) => ({ ...score, score: 100 })),
      rubric,
    ),
    100,
  )
})

test("normalizes and asserts rubric weights", () => {
  const normalized = normalizeRubric(rubric)
  const [first, second] = normalized.dimensions
  assert.ok(first && second)
  assert.equal(first.weight + second.weight, 1)
  assert.doesNotThrow(() => assertRubric(normalized))
  assert.throws(() => assertRubric(rubric), /sum to 1/)
  assert.throws(() => normalizeRubric({ ...rubric, dimensions: [] }), /positive finite total/)
})

test("extracts text from Lexical block and text nodes", () => {
  const editorState = {
    root: {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "text", text: "Design " },
            { type: "text", text: "notes" },
          ],
        },
        { type: "heading", children: [{ type: "text", text: "Trade-offs" }] },
      ],
    },
  }

  assert.equal(extractLexicalText(editorState), "Design notes\nTrade-offs")
  assert.equal(extractLexicalText(null), "")
  assert.equal(extractLexicalText({ root: { type: "root", children: [] } }), "")
})

test("summarizes Excalidraw element types, labels, and bound arrows", () => {
  const elements = [
    { type: "rectangle", label: { text: "API" } },
    { type: "text", text: "Browser" },
    { type: "arrow", startBinding: { elementId: "browser" }, endBinding: { elementId: "api" } },
    null,
  ]

  assert.equal(
    summarizeExcalidraw(elements),
    'Diagram contains: 1 rectangle(s), 1 text(s), 1 arrow(s). Labels: rectangle: "API", "Browser". 1 connections between components.',
  )
  assert.equal(summarizeExcalidraw([]), "No diagram provided.")
})

test("only accepts approved public provider hosts for model base URLs", () => {
  assert.equal(
    normalizeOpenAICompatibleBaseUrl("https://openrouter.ai/api/v1/"),
    "https://openrouter.ai/api/v1",
  )
  assert.equal(
    normalizeOpenAICompatibleBaseUrl("http://localhost:8080/v1", { allowLocalhost: true }),
    "http://localhost:8080/v1",
  )
  assert.throws(() => normalizeOpenAICompatibleBaseUrl("https://127.0.0.1/v1"), /approved/)
  assert.throws(
    () => normalizeOpenAICompatibleBaseUrl("https://metadata.google.internal/v1"),
    /approved/,
  )
  assert.throws(() => normalizeOpenAICompatibleBaseUrl("http://openrouter.ai/api/v1"), /HTTPS/)
  assert.throws(
    () => normalizeOpenAICompatibleBaseUrl("https://openrouter.ai:8443/api/v1"),
    /default HTTPS port/,
  )
  assert.throws(() => normalizeOpenAICompatibleBaseUrl("http://localhost:8080/v1"), /HTTPS/)
})

test("chooses tool-capable default models for OpenAI and OpenRouter", () => {
  assert.equal(getDefaultModelName(), "gpt-4o-mini")
  assert.equal(getDefaultModelName(null, "deep"), "gpt-4o")
  assert.equal(getDefaultModelName("https://openrouter.ai/api/v1"), "openai/gpt-4o-mini")
  assert.equal(getDefaultModelName("https://openrouter.ai/api/v1", "deep"), "openai/gpt-4o")
})
