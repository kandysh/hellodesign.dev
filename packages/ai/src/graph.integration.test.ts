import assert from "node:assert/strict"
import test from "node:test"
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages"
import type { AgentEvent, RubricConfig } from "@sysdesign/shared"
import { runClarificationPhase, runEvaluationPhase } from "./graph.js"

const rubric: RubricConfig = {
  dimensions: [
    { id: "requirements", label: "Requirements", weight: 0.5, criteria: [], maxScore: 100 },
    { id: "scalability", label: "Scalability", weight: 0.5, criteria: [], maxScore: 100 },
  ],
  passingScore: 70,
  maxFollowupRounds: 0,
}

const question = { title: "Sample system", prompt: "Design the system", rubric }
const validOutput = {
  scores: rubric.dimensions.map(({ id }) => ({
    dimensionId: id,
    score: 80,
    reasoning: "The answer gives a workable approach.",
    improvements: ["Explain the failure strategy."],
  })),
}

interface MockReply {
  content?: string
  status?: number
  toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>
}

async function withOpenAIMock(
  replyForRequest: (requestNumber: number, messages: Array<{ content?: unknown }>) => MockReply,
  run: (baseUrl: string, requests: Array<Array<{ content?: unknown }>>) => Promise<void>,
) {
  const requests: Array<Array<{ content?: unknown }>> = []
  const originalFetch = globalThis.fetch
  const previousNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = "development"
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    const body = (await request.json()) as {
      messages?: Array<{ content?: unknown }>
    }
    const messages = body.messages ?? []
    requests.push(messages)
    const mockReply = replyForRequest(requests.length, messages)
    if (mockReply.status && mockReply.status >= 400) {
      return new Response(JSON.stringify({ error: { message: "temporary mock provider error" } }), {
        status: mockReply.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    const completionChunk = (delta: Record<string, unknown>, finishReason: string | null) => ({
      id: "chatcmpl-local-test",
      object: "chat.completion.chunk",
      created: 1,
      model: "gpt-4o-mini",
      choices: [{ index: 0, delta, finish_reason: finishReason }],
    })

    if (messages.some((message) => message.content === "Design answer")) {
      const toolCalls = mockReply.toolCalls ?? []
      const stream = [`data: ${JSON.stringify(completionChunk({ role: "assistant" }, null))}\n\n`]
      if (toolCalls.length) {
        stream.push(
          `data: ${JSON.stringify(
            completionChunk(
              {
                tool_calls: toolCalls.map((call, index) => ({
                  index,
                  id: call.id,
                  type: "function",
                  function: { name: call.name, arguments: JSON.stringify(call.args) },
                })),
              },
              null,
            ),
          )}\n\n`,
        )
        stream.push(`data: ${JSON.stringify(completionChunk({}, "tool_calls"))}\n\n`)
      } else {
        stream.push(
          `data: ${JSON.stringify(completionChunk({ content: mockReply.content ?? "" }, null))}\n\n`,
        )
        stream.push(`data: ${JSON.stringify(completionChunk({}, "stop"))}\n\n`)
      }
      stream.push("data: [DONE]\n\n")
      return new Response(stream.join(""), {
        headers: { "Content-Type": "text/event-stream" },
      })
    }

    return new Response(
      JSON.stringify({
        id: "chatcmpl-local-test",
        object: "chat.completion",
        created: 1,
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: mockReply.content ?? "{}" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  }

  try {
    await run("http://localhost/v1", requests)
  } finally {
    globalThis.fetch = originalFetch
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
  }
}

test("mock OpenAI completes quick clarification on mark_satisfied and closes its tool call", async () => {
  await withOpenAIMock(
    () => ({ toolCalls: [{ id: "satisfied-1", name: "mark_satisfied", args: {} }] }),
    async (baseUrl) => {
      const events: AgentEvent[] = []
      const result = await runClarificationPhase({
        apiKey: "test-key",
        baseUrl,
        modelName: "gpt-4o-mini",
        initialMessages: [
          new SystemMessage("Review the answer"),
          new HumanMessage("Design answer"),
        ],
        question,
        submissionId: "submission-1",
        maxFollowupOverride: 0,
        publishEvent: async (event) => void events.push(event),
        waitForReply: async () => {
          throw new Error("quick mode must not wait for a reply")
        },
      })
      assert.equal(result.followupRounds, 0)
      assert.ok(!events.some((event) => event.type === "followup"))
      const assistantIndex = result.messages.findIndex(
        (message) => AIMessage.isInstance(message) && message.tool_calls?.[0]?.id === "satisfied-1",
      )
      assert.ok(assistantIndex >= 0)
      assert.ok(
        result.messages
          .slice(assistantIndex + 1)
          .some(
            (message) => message instanceof ToolMessage && message.tool_call_id === "satisfied-1",
          ),
      )
    },
  )
})

test("mock OpenAI acknowledges parallel annotation calls before continuing", async () => {
  await withOpenAIMock(
    (requestNumber) =>
      requestNumber === 1
        ? {
            toolCalls: [
              { id: "satisfied-1", name: "mark_satisfied", args: {} },
              {
                id: "risk-1",
                name: "flag_risk",
                args: { component: "cache", risk: "No eviction policy", severity: "medium" },
              },
            ],
          }
        : { toolCalls: [{ id: "satisfied-2", name: "mark_satisfied", args: {} }] },
    async (baseUrl, requests) => {
      const events: AgentEvent[] = []
      const result = await runClarificationPhase({
        apiKey: "test-key",
        baseUrl,
        modelName: "gpt-4o-mini",
        initialMessages: [
          new SystemMessage("Review the answer"),
          new HumanMessage("Design answer"),
        ],
        question,
        submissionId: "submission-2",
        maxFollowupOverride: 0,
        publishEvent: async (event) => void events.push(event),
        waitForReply: async () => null,
      })
      assert.equal(requests.length, 2)
      assert.ok(events.some((event) => event.type === "risk_flag"))
      for (const [index, message] of result.messages.entries()) {
        if (!AIMessage.isInstance(message) || !message.tool_calls?.length) continue
        const replied = new Set(
          result.messages
            .slice(index + 1)
            .filter((item): item is ToolMessage => item instanceof ToolMessage)
            .map((item) => item.tool_call_id),
        )
        assert.ok(message.tool_calls.every((call) => !call.id || replied.has(call.id)))
      }
    },
  )
})

test("deep clarification waits for a delayed reply and carries it into evaluation", async () => {
  const deepQuestion = {
    ...question,
    rubric: { ...rubric, maxFollowupRounds: 1 },
  }
  let replyReceived = false
  await withOpenAIMock(
    (requestNumber) =>
      requestNumber === 1
        ? {
            toolCalls: [
              {
                id: "followup-1",
                name: "ask_followup",
                args: { aspect: "storage", question: "How do you handle database failover?" },
              },
            ],
          }
        : { toolCalls: [{ id: "satisfied-1", name: "mark_satisfied", args: {} }] },
    async (baseUrl, requests) => {
      const events: AgentEvent[] = []
      const result = await runClarificationPhase({
        apiKey: "test-key",
        baseUrl,
        modelName: "gpt-4o-mini",
        initialMessages: [
          new SystemMessage("Review the answer"),
          new HumanMessage("Design answer"),
        ],
        question: deepQuestion,
        submissionId: "submission-slow-reply",
        publishEvent: async (event) => void events.push(event),
        waitForReply: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          replyReceived = true
          return "Use a replicated database with automatic failover."
        },
      })

      assert.equal(replyReceived, true)
      assert.equal(result.followupRounds, 1)
      assert.equal(requests.length, 2)
      assert.ok(events.some((event) => event.type === "followup"))
      assert.ok(
        requests[1]?.some(
          (message) =>
            typeof message.content === "string" &&
            message.content.includes("Use a replicated database with automatic failover"),
        ),
      )
    },
  )
})

test("mock OpenAI retries a failed evaluation request and validates the returned scores", async () => {
  await withOpenAIMock(
    (requestNumber) =>
      requestNumber === 1 ? { status: 503 } : { content: JSON.stringify(validOutput) },
    async (baseUrl, requests) => {
      const events: AgentEvent[] = []
      const scores = await runEvaluationPhase({
        apiKey: "test-key",
        baseUrl,
        modelName: "gpt-4o-mini",
        messages: [new HumanMessage("A sample answer")],
        question,
        submissionId: "submission-3",
        publishEvent: async (event) => void events.push(event),
      })
      assert.equal(requests.length, 2)
      assert.deepEqual(
        scores.map((item) => item.dimensionId),
        ["requirements", "scalability"],
      )
      assert.ok(events.some((event) => event.type === "eval_progress"))
    },
  )
})

test("mock OpenAI retries a score set that omits a rubric dimension", async () => {
  let secondRequestHasCorrection = false
  await withOpenAIMock(
    (requestNumber, messages) => {
      if (requestNumber === 1) {
        return { content: JSON.stringify({ scores: [validOutput.scores[0]] }) }
      }
      secondRequestHasCorrection = messages.some(
        (message) =>
          typeof message.content === "string" &&
          message.content.includes("previous evaluation output was invalid"),
      )
      return { content: JSON.stringify(validOutput) }
    },
    async (baseUrl, requests) => {
      const scores = await runEvaluationPhase({
        apiKey: "test-key",
        baseUrl,
        modelName: "gpt-4o-mini",
        messages: [new HumanMessage("A sample answer")],
        question,
        submissionId: "submission-4",
        publishEvent: async () => {},
      })
      assert.equal(requests.length, 2)
      assert.equal(secondRequestHasCorrection, true)
      assert.equal(scores.length, 2)
    },
  )
})
