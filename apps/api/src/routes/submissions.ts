import { randomUUID } from "node:crypto"
import type { WebSocket } from "@fastify/websocket"
import { db } from "@sysdesign/db"
import {
  deepEvalQueue,
  evalQueue,
  publishFollowupReply,
  releaseEvalSlot,
  reserveEvalSlot,
} from "@sysdesign/queue"
import type { AgentEvent } from "@sysdesign/shared"
import { extractLexicalText, summarizeExcalidraw } from "@sysdesign/shared"
import type { FastifyPluginAsync } from "fastify"
import { eventBufKey, redis, submissionChannel } from "../lib/redis.js"
import { replyBodySchema, submissionBodySchema } from "../lib/request-schemas.js"
import { ownsSubmission } from "../lib/submission-access.js"
import { isAllowedWebSocketOrigin } from "../lib/websocket-origin.js"

interface SubmissionBody {
  questionId: string
  lexicalState?: Record<string, unknown>
  answerText?: string
  excalidrawData?: Array<Record<string, unknown>>
  agentType?: "quick" | "deep"
  mood?: "pragmatist" | "systems" | "sre" | "pm"
  modelName?: string
}

async function persistAndPublishFollowupReply(submissionId: string, content: string) {
  const message = await db.agentMessage.create({
    data: {
      submissionId,
      role: "USER",
      content,
      metadata: { type: "followup_reply" },
    },
    select: { id: true },
  })

  try {
    const accepted = await publishFollowupReply(redis, submissionId, content)
    if (accepted) return true
  } catch (error) {
    await db.agentMessage.delete({ where: { id: message.id } }).catch(() => {})
    throw error
  }

  await db.agentMessage.delete({ where: { id: message.id } }).catch(() => {})
  return false
}

const submissionsPlugin: FastifyPluginAsync = async (fastify) => {
  // POST / — create submission + enqueue eval job
  fastify.post<{ Body: SubmissionBody }>(
    "/",
    { schema: { body: submissionBodySchema } },
    async (req, reply) => {
      const user = req.user
      const sessionId = req.sessionId

      const body = req.body

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
      if (
        body.lexicalState &&
        new TextEncoder().encode(JSON.stringify(body.lexicalState)).length > 262_144
      ) {
        return reply.code(413).send({ error: "Notebook data must be 256 KB or smaller" })
      }
      if (lexicalContent.length > 50_000) {
        return reply.code(413).send({ error: "Answer must be 50000 characters or fewer" })
      }

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
      const excalidrawElements = (body.excalidrawData ?? []).filter(
        (element) => element.isDeleted !== true,
      )
      const excalidrawSummary = body.excalidrawData
        ? summarizeExcalidraw(excalidrawElements)
        : undefined

      const agentType = body.agentType ?? "quick"
      const mood = body.mood ?? "pragmatist"
      const modelName = body.modelName?.trim() || undefined

      const owner = user ? { userId: user.id } : { sessionId }
      const submissionId = randomUUID()
      if (!(await reserveEvalSlot(owner, submissionId, 3))) {
        return reply.code(429).send({
          error:
            "You already have 3 evaluations in progress. Wait for one to finish before submitting again.",
        })
      }

      let submissionCreated = false
      try {
        const submission = await db.submission.create({
          data: {
            id: submissionId,
            questionId: body.questionId,
            userId: user?.id ?? null,
            sessionId: user ? null : sessionId,
            lexicalState: storedLexicalState as object,
            excalidrawData: body.excalidrawData ? (excalidrawElements as object) : undefined,
            status: "PENDING",
          },
        })
        submissionCreated = true

        const targetQueue = agentType === "deep" ? deepEvalQueue : evalQueue
        const job = await targetQueue.add(
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
          { jobId: submission.id, removeOnComplete: true, removeOnFail: true },
        )

        await db.submission.update({
          where: { id: submission.id },
          data: { jobId: job.id ?? null },
        })

        return reply.code(201).send({ submissionId: submission.id })
      } catch (error) {
        await releaseEvalSlot(owner, submissionId).catch(() => {})
        if (submissionCreated) {
          await Promise.all([
            evalQueue.remove(submissionId),
            deepEvalQueue.remove(submissionId),
          ]).catch(() => {})
          await db.submission.delete({ where: { id: submissionId } }).catch(() => {})
        }
        throw error
      }
    },
  )

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

    if (!ownsSubmission(submission, { userId: user?.id, sessionId })) {
      return reply.code(403).send({ error: "Forbidden" })
    }

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

    if (!ownsSubmission(submission, { userId: user?.id, sessionId })) {
      return reply.code(403).send({ error: "Forbidden" })
    }

    return submission.messages
  })

  // POST /:id/reply — user sends a follow-up reply (REST fallback)
  fastify.post<{ Params: { id: string }; Body: { content: string } }>(
    "/:id/reply",
    { schema: { body: replyBodySchema } },
    async (req, reply) => {
      const user = req.user
      const sessionId = req.sessionId
      const { id } = req.params

      const submission = await db.submission.findUnique({ where: { id } })
      if (!submission) return reply.code(404).send({ error: "Not found" })

      if (!ownsSubmission(submission, { userId: user?.id, sessionId })) {
        return reply.code(403).send({ error: "Forbidden" })
      }

      if (submission.status !== "FOLLOWUP") {
        return reply.code(409).send({ error: "Submission is not waiting for a reply" })
      }

      const body = req.body
      if (!body.content.trim()) {
        return reply.code(400).send({ error: "content is required" })
      }

      const replyText = body.content.trim()
      if (replyText.length > 5000) {
        return reply.code(400).send({ error: "Reply must be 5000 characters or fewer" })
      }

      if (!(await persistAndPublishFollowupReply(id, replyText))) {
        return reply.code(409).send({ error: "The follow-up is no longer waiting for a reply" })
      }

      return { ok: true }
    },
  )

  // GET /:id/ws — WebSocket stream (replaces SSE)
  fastify.get<{ Params: { id: string } }>(
    "/:id/ws",
    { websocket: true },
    (socket: WebSocket, req) => {
      const { id } = req.params
      const user = req.user
      const sessionId = req.sessionId
      const origin = req.headers.origin
      const allowedOrigin = process.env.WEB_URL ?? "http://localhost:3000"
      if (!isAllowedWebSocketOrigin(origin, allowedOrigin)) {
        socket.close(1008, "Origin not allowed")
        return
      }

      let subscriber: ReturnType<typeof redis.duplicate> | undefined
      let keepalive: ReturnType<typeof setInterval> | undefined
      const cleanup = () => {
        if (keepalive) clearInterval(keepalive)
        keepalive = undefined
        if (subscriber) {
          subscriber.unsubscribe().catch(() => {})
          subscriber.quit().catch(() => {})
          subscriber = undefined
        }
      }
      socket.on("close", cleanup)
      socket.on("error", cleanup)

      // Run async init inside the sync handler
      void (async () => {
        const submission = await db.submission.findUnique({ where: { id } })
        if (!submission) {
          socket.close(1008, "Not found")
          return
        }

        if (socket.readyState !== socket.OPEN) return

        if (!ownsSubmission(submission, { userId: user?.id, sessionId })) {
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
          writeQueue = writeQueue
            .then(() => {
              if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify(event))
              }
            })
            .catch((err) => {
              fastify.log.error({ err }, `[ws] Error writing event for ${id}`)
              cleanup()
              if (socket.readyState === socket.OPEN) socket.close(1011, "Stream failed")
            })
        }

        // Subscribe before replaying buffered events — prevents missed messages
        subscriber = redis.duplicate()
        const sub = subscriber
        await sub.subscribe(channel)
        if (socket.readyState !== socket.OPEN) {
          cleanup()
          return
        }

        // Send initial status so client knows connection is live
        socket.send(
          JSON.stringify({
            type: "submission_status",
            submissionId: id,
            status: submission.status,
            timestamp: new Date().toISOString(),
          }),
        )

        keepalive = setInterval(() => {
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
                cleanup()
                if (socket.readyState === socket.OPEN) socket.close()
              })
            }
          } catch (err) {
            fastify.log.error({ err }, `[ws] Error parsing event for ${id}`)
          }
        })

        // Incoming messages from client (follow-up replies)
        socket.on("message", async (data: Buffer | ArrayBuffer | Buffer[]) => {
          try {
            const messageBuffer = Array.isArray(data)
              ? Buffer.concat(data)
              : Buffer.isBuffer(data)
                ? data
                : Buffer.from(data)
            const text = messageBuffer.toString("utf8")
            if (Buffer.byteLength(text, "utf8") > 16_384) {
              socket.close(1009, "Message too large")
              return
            }
            const msg = JSON.parse(text) as { type: string; content?: string }
            if (msg.type === "reply" && typeof msg.content === "string" && msg.content.trim()) {
              const replyText = msg.content.trim()
              if (replyText.length > 5000) {
                socket.close(1009, "Reply too large")
                return
              }
              const current = await db.submission.findUnique({
                where: { id },
                select: { status: true },
              })
              if (current?.status !== "FOLLOWUP") return
              await persistAndPublishFollowupReply(id, replyText)
            }
          } catch (err) {
            fastify.log.error({ err }, `[ws] Error handling reply for ${id}`)
          }
        })
      })().catch((err) => {
        fastify.log.error({ err }, `[ws] Initialization failed for ${id}`)
        cleanup()
        if (socket.readyState === socket.OPEN) socket.close(1011, "Stream initialization failed")
      })
    },
  )
}

export default submissionsPlugin
