import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { db } from "@sysdesign/db"
import { redis, submissionChannel } from "../lib/redis.js"
import { evalQueue } from "@sysdesign/queue"
import { extractLexicalText, summarizeExcalidraw } from "@sysdesign/shared"
import type { AgentEvent } from "@sysdesign/shared"
import type { AppEnv } from "../lib/types.js"

const app = new Hono<AppEnv>()

// POST /api/submissions — create submission + enqueue eval job
app.post("/", async (c) => {
  const user = c.get("user")
  const sessionId = c.get("sessionId")

  const body = await c.req.json<{
    questionId: string
    lexicalState?: Record<string, unknown>
    answerText?: string
    excalidrawData?: unknown[]
    strategy?: "quick" | "agentic"
  }>()

  if (!body.questionId || (!body.lexicalState && !body.answerText)) {
    return c.json({ error: "questionId and either lexicalState or answerText are required" }, 400)
  }

  const question = await db.question.findUnique({ where: { id: body.questionId } })
  if (!question) return c.json({ error: "Question not found" }, 404)

  // Extract plain text — prefer answerText, fall back to Lexical JSON extraction
  const lexicalContent = body.answerText?.trim()
    ? body.answerText.trim()
    : extractLexicalText(body.lexicalState!)

  // Build a minimal Lexical document from plain text so we can display it on the result page
  const makeLexicalDoc = (text: string): object => ({
    root: {
      type: "root", version: 1, direction: "ltr", format: "", indent: 0,
      children: text.split("\n").map((line) => ({
        type: "paragraph", version: 1, direction: "ltr", format: "", indent: 0,
        children: line
          ? [{ type: "text", version: 1, text: line, format: 0, detail: 0, mode: "normal", style: "" }]
          : [],
      })),
    },
  })

  const storedLexicalState = body.lexicalState ?? makeLexicalDoc(body.answerText ?? "")
  const excalidrawSummary = body.excalidrawData
    ? summarizeExcalidraw(body.excalidrawData)
    : undefined

  const submission = await db.submission.create({
    data: {
      questionId: body.questionId,
      userId: user?.id ?? null,
      sessionId: user ? null : sessionId,
      lexicalState: storedLexicalState as object,
      excalidrawData: body.excalidrawData ? (body.excalidrawData as object) : undefined,
      status: "PENDING",
    },
  })

  const strategy = body.strategy ?? "agentic"

  // Enqueue with submissionId as jobId for idempotency
  const job = await evalQueue.add(
    "evaluate",
    {
      submissionId: submission.id,
      questionId: body.questionId,
      userId: user?.id,
      sessionId: user ? undefined : sessionId,
      strategy,
      lexicalContent,
      excalidrawSummary,
    },
    { jobId: submission.id },
  )

  await db.submission.update({
    where: { id: submission.id },
    data: { jobId: job.id ?? null },
  })

  return c.json({ submissionId: submission.id }, 201)
})

// GET /api/submissions/:id — get submission + result
app.get("/:id", async (c) => {
  const user = c.get("user")
  const sessionId = c.get("sessionId")
  const id = c.req.param("id")

  const submission = await db.submission.findUnique({
    where: { id },
    include: { result: true },
  })

  if (!submission) return c.json({ error: "Not found" }, 404)

  // Authorization: owned by user or matches session
  const isOwner =
    (user && submission.userId === user.id) ||
    (!user && submission.sessionId === sessionId)
  if (!isOwner) return c.json({ error: "Forbidden" }, 403)

  return c.json(submission)
})

// GET /api/submissions/:id/messages — full agent conversation
app.get("/:id/messages", async (c) => {
  const user = c.get("user")
  const sessionId = c.get("sessionId")
  const id = c.req.param("id")

  const submission = await db.submission.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!submission) return c.json({ error: "Not found" }, 404)

  const isOwner =
    (user && submission.userId === user.id) ||
    (!user && submission.sessionId === sessionId)
  if (!isOwner) return c.json({ error: "Forbidden" }, 403)

  return c.json(submission.messages)
})

// POST /api/submissions/:id/reply — user sends follow-up reply
app.post("/:id/reply", async (c) => {
  const user = c.get("user")
  const sessionId = c.get("sessionId")
  const id = c.req.param("id")

  const submission = await db.submission.findUnique({ where: { id } })
  if (!submission) return c.json({ error: "Not found" }, 404)

  const isOwner =
    (user && submission.userId === user.id) ||
    (!user && submission.sessionId === sessionId)
  if (!isOwner) return c.json({ error: "Forbidden" }, 403)

  if (submission.status !== "FOLLOWUP") {
    return c.json({ error: "Submission is not waiting for a reply" }, 409)
  }

  const body = await c.req.json<{ content: string }>()
  if (!body.content?.trim()) {
    return c.json({ error: "content is required" }, 400)
  }

  const replyText = body.content.trim()

  // Persist the user message
  await db.agentMessage.create({
    data: {
      submissionId: id,
      role: "USER",
      content: replyText,
      metadata: { type: "followup_reply" },
    },
  })

  // Notify the waiting eval worker via Redis pub/sub
  await redis.set(`submission:${id}:reply`, replyText, "EX", 360)
  await redis.publish(`submission:${id}:reply`, replyText)

  return c.json({ ok: true })
})

// GET /api/submissions/:id/events — SSE stream
app.get("/:id/events", async (c) => {
  const user = c.get("user")
  const sessionId = c.get("sessionId")
  const id = c.req.param("id")

  const submission = await db.submission.findUnique({ where: { id } })
  if (!submission) return c.json({ error: "Not found" }, 404)

  const isOwner =
    (user && submission.userId === user.id) ||
    (!user && submission.sessionId === sessionId)
  if (!isOwner) return c.json({ error: "Forbidden" }, 403)

  // If already terminal, return immediately
  if (submission.status === "DONE" || submission.status === "FAILED") {
    return c.json({ status: submission.status }, 200)
  }

  const channel = submissionChannel(id)

  return streamSSE(c, async (stream) => {
    const sub = redis.duplicate()
    await sub.subscribe(channel)

    const keepalive = setInterval(() => {
      stream.writeSSE({ event: "ping", data: "" }).catch(() => {})
    }, 15_000)

    sub.on("message", async (_, raw) => {
      try {
        const event = JSON.parse(raw) as AgentEvent
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
          id: Date.now().toString(),
        })
        if (event.type === "eval_done" || event.type === "error") {
          clearInterval(keepalive)
          await sub.unsubscribe()
          await sub.quit()
          stream.close()
        }
      } catch {
        // ignore parse errors
      }
    })

    stream.onAbort(() => {
      clearInterval(keepalive)
      sub.unsubscribe().catch(() => {})
      sub.quit().catch(() => {})
    })
  })
})

export default app
