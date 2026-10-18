import assert from "node:assert/strict"
import { test } from "node:test"
import Fastify from "fastify"
import {
  API_BODY_LIMIT,
  replyBodySchema,
  saveKeyBodySchema,
  submissionBodySchema,
} from "./request-schemas.js"

test("submission schema enforces required content and bounded input sizes", async () => {
  const app = Fastify({ bodyLimit: API_BODY_LIMIT })
  app.post(
    "/submission",
    { schema: { body: submissionBodySchema } },
    async (request) => request.body,
  )
  try {
    const missingContent = await app.inject({
      method: "POST",
      url: "/submission",
      payload: { questionId: "question-1" },
    })
    const longAnswer = await app.inject({
      method: "POST",
      url: "/submission",
      payload: { questionId: "question-1", answerText: "x".repeat(50_001) },
    })
    const tooManyElements = await app.inject({
      method: "POST",
      url: "/submission",
      payload: {
        questionId: "question-1",
        answerText: "answer",
        excalidrawData: Array.from({ length: 301 }, () => ({ type: "rectangle" })),
      },
    })

    assert.equal(missingContent.statusCode, 400)
    assert.equal(longAnswer.statusCode, 400)
    assert.equal(tooManyElements.statusCode, 400)
  } finally {
    await app.close()
  }
})

test("reply and API key schemas reject oversized or unsupported input", async () => {
  const app = Fastify({ bodyLimit: API_BODY_LIMIT })
  app.post("/reply", { schema: { body: replyBodySchema } }, async (request) => request.body)
  app.post("/keys", { schema: { body: saveKeyBodySchema } }, async (request) => request.body)
  try {
    const longReply = await app.inject({
      method: "POST",
      url: "/reply",
      payload: { content: "x".repeat(5001) },
    })
    const unsupportedProvider = await app.inject({
      method: "POST",
      url: "/keys",
      payload: { provider: "custom", key: "sk-test" },
    })

    assert.equal(longReply.statusCode, 400)
    assert.equal(unsupportedProvider.statusCode, 400)
  } finally {
    await app.close()
  }
})

test("request parser rejects a payload larger than the API body limit", async () => {
  const app = Fastify({ bodyLimit: API_BODY_LIMIT })
  app.post("/payload", async () => ({ ok: true }))
  try {
    const response = await app.inject({
      method: "POST",
      url: "/payload",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ data: "x".repeat(API_BODY_LIMIT) }),
    })
    assert.equal(response.statusCode, 413)
  } finally {
    await app.close()
  }
})
