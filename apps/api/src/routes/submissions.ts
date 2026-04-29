import type { FastifyPluginAsync } from "fastify"
import type { WebSocket } from "@fastify/websocket"
import { db } from "@sysdesign/db"
import { redis, submissionChannel, eventBufKey } from "../lib/redis.js"
import { evalQueue } from "@sysdesign/queue"
import { extractLexicalText, summarizeExcalidraw } from "@sysdesign/shared"
import type { AgentEvent } from "@sysdesign/shared"

const submissionsPlugin: FastifyPluginAsync = async (fastify) => {
  // POST / — create submission + enqueue eval job
  fastify.post("/", async (req, reply) => {
    const user = req.user
    const sessionId = req.sessionId

    const body = req.body as {
      questionId: string
      lexicalState?: Record<string, unknown>
      answerText?: string
      excalidrawData?: unknown[]
      agentType?: "quick" | "deep"
      mood?: "pragmatist" | "systems" | "sre" | "pm"
      modelName?: string
    }

    if (!body.questionId || (!body.lexicalState && !body.answerText)) {
      return reply
        .code(400)
        .send({ error: "questionId and either lexicalState or answerText are required" })
    }

    const question = await db.question.findUnique({ where: { id: body.questionId } })
    if (!question) return reply.code(404).send({ error: "Question not found" })

    const lexicalContent = body.answerText?.trim()
      ? body.answerText.trim()
      : extractLexicalText(body.lexicalState ?? {})

    const makeLexicalDoc = (text: string): object => ({
      root: {
        type: "root",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: text.split("\n").map((line) => ({
          type: "paragraph",
          version: 1,
          direction: "ltr",
          format: "",
          indent: 0,
          children: line
            ? [
                {
                  type: "text",
                  version: 1,
                  text: line,
                  format: 0,
                  detail: 0,
                  mode: "normal",
                  style: "",
                },
              ]
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

    const agentType = body.agentType ?? "quick"
    const mood = body.mood ?? "pragmatist"
    const modelName = body.modelName?.trim() || undefined

    const job = await evalQueue.add(
      "evaluate",
      {
        submissionId: submission.id,
        questionId: body.questionId,
        userId: user?.id,
        sessionId: user ? undefined : sessionId,
        agentType,
        mood,
        modelName,
        lexicalContent,
        excalidrawSummary,
      },
      { jobId: submission.id },
    )

    await db.submission.update({
      where: { id: submission.id },
      data: { jobId: job.id ?? null },
    })

    return reply.code(201).send({ submissionId: submission.id })
  })

  // GET /:id — get submission + result
  fastify.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const user = req.user
    const sessionId = req.sessionId
    const { id } = req.params

    const submission = await db.submission.findUnique({
      where: { id },
      include: { result: true },
    })

    if (!submission) return reply.code(404).send({ error: "Not found" })

    const isOwner =
      (user && submission.userId === user.id) ||
      (!user && submission.sessionId === sessionId)
    if (!isOwner) return reply.code(403).send({ error: "Forbidden" })

    return submission
  })

  // GET /:id/messages — full agent conversation
  fastify.get<{ Params: { id: string } }>("/:id/messages", async (req, reply) => {
    const user = req.user
    const sessionId = req.sessionId
    const { id } = req.params

    const submission = await db.submission.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })

    if (!submission) return reply.code(404).send({ error: "Not found" })

    const isOwner =
      (user && submission.userId === user.id) ||
      (!user && submission.sessionId === sessionId)
    if (!isOwner) return reply.code(403).send({ error: "Forbidden" })

    return submission.messages
  })

  // POST /:id/reply — user sends a follow-up reply (REST fallback)
  fastify.post<{ Params: { id: string } }>("/:id/reply", async (req, reply) => {
    const user = req.user
    const sessionId = req.sessionId
    const { id } = req.params

    const submission = await db.submission.findUnique({ where: { id } })
    if (!submission) return reply.code(404).send({ error: "Not found" })

    const isOwner =
      (user && submission.userId === user.id) ||
      (!user && submission.sessionId === sessionId)
    if (!isOwner) return reply.code(403).send({ error: "Forbidden" })

    if (submission.status !== "FOLLOWUP") {
      return reply.code(409).send({ error: "Submission is not waiting for a reply" })
    }

    const body = req.body as { content: string }
    if (!body.content?.trim()) {
      return reply.code(400).send({ error: "content is required" })
    }

    const replyText = body.content.trim()

    await db.agentMessage.create({
      data: {
        submissionId: id,
        role: "USER",
        content: replyText,
        metadata: { type: "followup_reply" },
      },
    })

    await redis.set(`submission:${id}:reply`, replyText, "EX", 360)
    await redis.publish(`submission:${id}:reply`, replyText)

    return { ok: true }
  })

  // GET /:id/ws — WebSocket stream (replaces SSE)
  fastify.get<{ Params: { id: string } }>(
    "/:id/ws",
    { websocket: true },
    (socket: WebSocket, req) => {
      const { id } = req.params
      const user = req.user
      const sessionId = req.sessionId

      // Run async init inside the sync handler
      ;(async () => {
        const submission = await db.submission.findUnique({ where: { id } })
        if (!submission) {
          socket.close(1008, "Not found")
          return
        }

        const isOwner =
          (user && submission.userId === user.id) ||
          (!user && submission.sessionId === sessionId)
        if (!isOwner) {
          socket.close(1008, "Forbidden")
          return
        }

        // Already terminal — send status and close
        if (submission.status === "DONE" || submission.status === "FAILED") {
          socket.send(
            JSON.stringify({
              type: "submission_status",
              submissionId: id,
              status: submission.status,
            }),
          )
          socket.close()
          return
        }

        const channel = submissionChannel(id)
        const bufKey = eventBufKey(id)

        // Serialize all sends through a single promise chain
        let writeQueue = Promise.resolve()
        const enqueue = (event: AgentEvent) => {
          writeQueue = writeQueue.then(() => {
            if (socket.readyState === socket.OPEN) {
              socket.send(JSON.stringify(event))
            }
          })
        }

        // Subscribe before replaying buffered events — prevents missed messages
        const sub = redis.duplicate()
        await sub.subscribe(channel)

        // Send initial status so client knows connection is live
        socket.send(
          JSON.stringify({
            type: "submission_status",
            submissionId: id,
            status: submission.status,
            timestamp: new Date().toISOString(),
          }),
        )

        const keepalive = setInterval(() => {
          if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }))
          }
        }, 15_000)

        // Replay events buffered before the client connected
        const buffered = await redis.lrange(bufKey, 0, -1)
        for (const raw of buffered) {
          try {
            enqueue(JSON.parse(raw) as AgentEvent)
          } catch {}
        }

        // Live events from Redis
        sub.on("message", (_, raw) => {
          try {
            const event = JSON.parse(raw) as AgentEvent
            enqueue(event)
            if (event.type === "eval_done" || event.type === "error") {
              writeQueue.then(() => {
                clearInterval(keepalive)
                sub.unsubscribe().catch(() => {})
                sub.quit().catch(() => {})
                socket.close()
              })
            }
          } catch (err) {
            fastify.log.error({ err }, `[ws] Error parsing event for ${id}`)
          }
        })

        // Incoming messages from client (follow-up replies)
        socket.on("message", async (data: Buffer | ArrayBuffer | Buffer[]) => {
          try {
            const msg = JSON.parse(data.toString()) as { type: string; content?: string }
            if (msg.type === "reply" && msg.content?.trim()) {
              const replyText = msg.content.trim()
              await db.agentMessage.create({
                data: {
                  submissionId: id,
                  role: "USER",
                  content: replyText,
                  metadata: { type: "followup_reply" },
                },
              })
              await redis.set(`submission:${id}:reply`, replyText, "EX", 360)
              await redis.publish(`submission:${id}:reply`, replyText)
            }
          } catch {}
        })

        const cleanup = () => {
          clearInterval(keepalive)
          sub.unsubscribe().catch(() => {})
          sub.quit().catch(() => {})
        }

        socket.on("close", cleanup)
        socket.on("error", cleanup)
      })()
    },
  )
}

export default submissionsPlugin
