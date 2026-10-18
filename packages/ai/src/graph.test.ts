import assert from "node:assert/strict"
import test from "node:test"
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages"
import { closeDanglingToolCalls, validateEvaluationScores } from "./graph.js"

const dimensions = ["requirements", "scalability"]
const score = (dimensionId: string) => ({
  dimensionId,
  score: 80,
  reasoning: "Evidence from the answer",
  improvements: ["Add a failure strategy"],
})

test("validates one bounded score for every rubric dimension", () => {
  assert.deepEqual(
    validateEvaluationScores({ scores: dimensions.map(score) }, dimensions).map(
      (item) => item.dimensionId,
    ),
    dimensions,
  )
  assert.throws(
    () => validateEvaluationScores({ scores: [score("requirements")] }, dimensions),
    /missing: scalability/,
  )
  assert.throws(
    () =>
      validateEvaluationScores(
        { scores: [score("requirements"), score("requirements")] },
        dimensions,
      ),
    /duplicate/,
  )
  assert.throws(
    () =>
      validateEvaluationScores({ scores: [score("requirements"), score("unknown")] }, dimensions),
    /unknown/,
  )
  assert.throws(
    () =>
      validateEvaluationScores(
        { scores: [score("requirements"), { ...score("scalability"), score: 101 }] },
        dimensions,
      ),
    /score schema/,
  )
})

test("closes every unanswered tool call before the next user turn", () => {
  const toolCallMessage = new AIMessage({
    content: "",
    tool_calls: [
      { id: "risk-1", name: "flag_risk", args: {} },
      { id: "satisfied-1", name: "mark_satisfied", args: {} },
    ],
  })
  const original = [
    new HumanMessage("Design answer"),
    toolCallMessage,
    new ToolMessage({ tool_call_id: "risk-1", content: "Risk recorded" }),
    new HumanMessage("Continue"),
  ]

  const closed = closeDanglingToolCalls(original)
  const index = closed.indexOf(toolCallMessage)
  const toolReplies = closed.slice(index + 1).filter((message) => message instanceof ToolMessage)
  const secondToolReply = toolReplies[1]
  assert.ok(secondToolReply)
  assert.deepEqual(
    toolReplies.map((message) => message.tool_call_id),
    ["risk-1", "satisfied-1"],
  )
  assert.ok(
    closed.indexOf(secondToolReply) <
      closed.findIndex(
        (message) => message instanceof HumanMessage && message.content === "Continue",
      ),
  )
})
