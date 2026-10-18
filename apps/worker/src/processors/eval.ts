import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import type { QuestionContext } from "@sysdesign/ai"
import {
  buildAnswerPrompt,
  buildSystemPrompt,
  generateNarrativeFeedback,
  runClarificationPhase,
  runEvaluationPhase,
} from "@sysdesign/ai"
import { db, decryptKey } from "@sysdesign/db"
import { consumeAndCloseFollowupWait, openFollowupWait, takeFollowupReply } from "@sysdesign/queue"
import {
  type AgentEvent,
  computeWeightedScore,
  type EvalJobData,
  getDefaultModelName,
  type RubricConfig,
} from "@sysdesign/shared"
import type { Processor } from "bullmq"
import { logger } from "../lib/logger.js"
import {
  createSubscriber,
  eventBufKey,
  redisPub,
  replyChannel,
  submissionChannel,
} from "../lib/redis.js"

// ─── Helpers ──────────────────────────────────────────────────────────────────

class SubmissionRemovedError extends Error {}
const FOLLOWUP_REPLY_TTL_SECONDS = 360

async function ensureSubmissionExists(submissionId: string) {
  if (!(await db.submission.findUnique({ where: { id: submissionId }, select: { id: true } }))) {
    throw new SubmissionRemovedError("Submission was deleted")
  }
}

function createSubmissionPublisher(submissionId: string) {
  let lastPresenceCheck = 0
  let submissionExists = true
  let reasoningBuffer = ""
  let reasoningTimer: ReturnType<typeof setTimeout> | undefined
  let writeChain = Promise.resolve()
  let eventBufferInitialized = false

  const emit = async (event: AgentEvent) => {
    const now = Date.now()
    if (now - lastPresenceCheck >= 1000) {
      submissionExists = Boolean(
        await db.submission.findUnique({ where: { id: submissionId }, select: { id: true } }),
      )
      lastPresenceCheck = now
    }
    if (!submissionExists) return

    const serialized = JSON.stringify(event)
    const bufferKey = eventBufKey(submissionId)
    const pipeline = redisPub.pipeline()
    pipeline.rpush(bufferKey, serialized)
    pipeline.ltrim(bufferKey, -500, -1)
    if (!eventBufferInitialized) {
      pipeline.expire(bufferKey, 1800)
      eventBufferInitialized = true
    }
    pipeline.publish(submissionChannel(submissionId), serialized)
    await pipeline.exec()
  }

  const enqueue = (event: AgentEvent) => {
    writeChain = writeChain.catch(() => {}).then(() => emit(event))
    return writeChain
  }

  const flush = () => {
    if (reasoningTimer) clearTimeout(reasoningTimer)
    reasoningTimer = undefined
    const content = reasoningBuffer
    reasoningBuffer = ""
    if (content) return enqueue({ type: "reasoning", content })
    return writeChain
  }

  const resetBuffer = async () => {
    await redisPub.del(eventBufKey(submissionId))
    eventBufferInitialized = false
  }

  const publish = async (event: AgentEvent) => {
    if (event.type === "reasoning") {
      reasoningBuffer += event.content
      if (!reasoningTimer) {
        reasoningTimer = setTimeout(() => {
          void flush().catch((error) =>
            logger.error("event_publish_failed", {
              submissionId,
              error: error instanceof Error ? error.message : String(error),
            }),
          )
        }, 100)
      }
      return
    }
    await flush()
    await enqueue(event)
  }

  return { publish, flush, resetBuffer }
}

async function resolveApiKey({
  userId,
  sessionId,
  submissionId,
}: {
  userId?: string
  sessionId?: string
  submissionId: string
}): Promise<{ apiKey: string; baseUrl: string | null } | null> {
  if (!userId && !sessionId) return null
  let record = await db.userApiKey.findFirst({
    where: userId ? { userId } : { sessionId },
  })
  if (!record && sessionId) {
    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      select: { userId: true },
    })
    if (submission?.userId) {
      record = await db.userApiKey.findFirst({ where: { userId: submission.userId } })
    }
  }
  if (!record) return null
  return { apiKey: decryptKey(record.encryptedKey, record.iv), baseUrl: record.baseUrl ?? null }
}

async function saveMessage(
  submissionId: string,
  sequence: number,
  role: "USER" | "AGENT" | "SYSTEM" | "REASONING",
  content: string,
  metadata?: Record<string, unknown>,
) {
  return db.agentMessage.upsert({
    where: { submissionId_sequence: { submissionId, sequence } },
    create: { submissionId, sequence, role, content, metadata: metadata as object | undefined },
    update: { role, content, metadata: metadata as object | undefined },
    select: { id: true },
  })
}

/**
 * Wait for a user reply on the Redis channel.
 * The API publishes to this channel when POST /submissions/:id/reply is called.
 */
async function waitForReply(
  submissionId: string,
  { timeoutMs = 5 * 60 * 1000 }: { timeoutMs?: number } = {},
): Promise<string | null> {
  const stateTtl = Math.ceil(timeoutMs / 1000) + 60
  return new Promise((resolve) => {
    const sub = createSubscriber()
    const channel = replyChannel(submissionId)
    let settled = false
    const finish = (reply: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearInterval(deletionCheck)
      if (!reply) {
        void consumeAndCloseFollowupWait(redisPub, submissionId, stateTtl).catch(() => {})
      }
      sub.unsubscribe(channel).catch(() => {})
      sub.quit().catch(() => {})
      resolve(reply)
    }

    const timer = setTimeout(() => {
      void consumeAndCloseFollowupWait(redisPub, submissionId, stateTtl)
        .then((reply) => finish(reply))
        .catch(() => finish(null))
    }, timeoutMs)
    const deletionCheck = setInterval(() => {
      void db.submission
        .findUnique({ where: { id: submissionId }, select: { id: true } })
        .then((submission) => {
          if (!submission) {
            void consumeAndCloseFollowupWait(redisPub, submissionId, stateTtl)
              .catch(() => null)
              .finally(() => finish(null))
          }
        })
        .catch(() => {})
    }, 2000)

    sub.on("message", () => {
      void takeFollowupReply(redisPub, submissionId, stateTtl)
        .then((reply) => {
          if (reply) finish(reply)
        })
        .catch(() => finish(null))
    })
    sub
      .subscribe(channel)
      .then(async () => {
        const queuedReply = await takeFollowupReply(redisPub, submissionId, stateTtl)
        if (queuedReply) finish(queuedReply)
      })
      .catch(async () => {
        await consumeAndCloseFollowupWait(redisPub, submissionId, stateTtl).catch(() => null)
        finish(null)
      })
  })
}

// ─── Main processor ───────────────────────────────────────────────────────────

export const evalProcessor: Processor<EvalJobData> = async (job) => {
  const {
    submissionId,
    questionId,
    userId,
    sessionId,
    lexicalContent,
    excalidrawSummary,
    agentType,
    mood,
    modelName,
  } = job.data

  logger.info("evaluation_started", { submissionId, jobId: job.id })

  const publisher = createSubmissionPublisher(submissionId)
  let nextMessageSequence = 2
  let nextFollowupSequence = 1_000_000
  let reasoningBuffer = ""
  const flushReasoningMessage = async () => {
    const content = reasoningBuffer
    reasoningBuffer = ""
    if (content) {
      await saveMessage(submissionId, nextMessageSequence++, "REASONING", content, {
        type: "reasoning",
      })
    }
  }
  try {
    if (!(await db.submission.findUnique({ where: { id: submissionId }, select: { id: true } })))
      return
    await redisPub.del(eventBufKey(submissionId))

    // 1. Resolve API key
    const resolved = await resolveApiKey({ userId, sessionId, submissionId })
    if (!resolved) {
      await publisher.publish({
        type: "error",
        message: "NO_API_KEY: No provider API key found. Add your key in Settings.",
      })
      await db.submission.update({ where: { id: submissionId }, data: { status: "FAILED" } })
      return
    }
    const { apiKey, baseUrl } = resolved
    const effectiveModelName = modelName ?? getDefaultModelName(baseUrl, agentType)

    const question = await db.question.findUnique({ where: { id: questionId } })
    if (!question) {
      await publisher.publish({ type: "error", message: "Question not found" })
      await db.submission.update({ where: { id: submissionId }, data: { status: "FAILED" } })
      return
    }

    const rubric = question.rubric as unknown as RubricConfig

    const questionCtx: QuestionContext = {
      title: question.title,
      prompt: question.prompt,
      rubric,
    }

    // 2. Mark as processing
    await db.submission.update({ where: { id: submissionId }, data: { status: "PROCESSING" } })

    // Publish initial event to signal job has started
    await publisher.publish({
      type: "agent_flow",
      step: "Job started - initializing agent",
      details: { phase: "startup" },
    })

    await ensureSubmissionExists(submissionId)
    // A retry starts a fresh transcript so prior follow-ups and replies cannot leak into it.
    await db.agentMessage.deleteMany({ where: { submissionId } })
    // 3. Build initial messages
    const systemPrompt = buildSystemPrompt(questionCtx, mood)
    const answerPrompt = buildAnswerPrompt(questionCtx, lexicalContent, excalidrawSummary)

    const initialMessages = [new SystemMessage(systemPrompt), new HumanMessage(answerPrompt)]

    // Persist initial messages
    await saveMessage(submissionId, 0, "SYSTEM", "", {
      type: "initial_prompt",
      promptVersion: "2026-10-19",
    })
    await saveMessage(submissionId, 1, "USER", answerPrompt, { type: "answer" })

    // 4. Clarification phase — quick skips (0 rounds), deep uses rubric max
    const maxFollowupOverride = agentType === "quick" ? 0 : undefined
    const { messages: clarifiedMessages, followupRounds } = await runClarificationPhase({
      apiKey,
      baseUrl: baseUrl ?? undefined,
      modelName: effectiveModelName,
      initialMessages,
      question: questionCtx,
      submissionId,
      maxFollowupOverride,
      publishEvent: (event) => {
        if (event.type === "reasoning") {
          reasoningBuffer += event.content
          return publisher.publish(event)
        }
        if (event.type === "followup") {
          return flushReasoningMessage().then(async () => {
            await openFollowupWait(redisPub, submissionId, FOLLOWUP_REPLY_TTL_SECONDS)
            await db.submission.update({
              where: { id: submissionId },
              data: { status: "FOLLOWUP" },
            })
            const persisted = await saveMessage(
              submissionId,
              nextFollowupSequence++,
              "AGENT",
              event.question,
              { type: "followup" },
            )
            await publisher.publish({ ...event, messageId: persisted.id })
          })
        }
        return flushReasoningMessage().then(() => publisher.publish(event))
      },
      waitForReply: async (sid) => {
        const reply = await waitForReply(sid)
        await ensureSubmissionExists(sid)
        await db.submission.update({
          where: { id: sid },
          data: { status: reply ? "PROCESSING" : "EVALUATING" },
        })
        return reply
      },
    })
    await flushReasoningMessage()
    await publisher.flush()

    // 5. Evaluation phase
    await ensureSubmissionExists(submissionId)
    await db.submission.update({ where: { id: submissionId }, data: { status: "EVALUATING" } })

    const componentScores = await runEvaluationPhase({
      apiKey,
      baseUrl: baseUrl ?? undefined,
      modelName: effectiveModelName,
      messages: clarifiedMessages,
      question: questionCtx,
      submissionId,
      publishEvent: publisher.publish,
    })

    await ensureSubmissionExists(submissionId)

    const overallScore = computeWeightedScore(componentScores, rubric)

    // 6. Narrative feedback
    const { narrative, improvements } = await generateNarrativeFeedback({
      apiKey,
      baseUrl: baseUrl ?? undefined,
      modelName: effectiveModelName,
      messages: clarifiedMessages,
      componentScores,
      overallScore,
      rubric,
    })

    await ensureSubmissionExists(submissionId)

    // 7. Persist result
    await db.evalResult.upsert({
      where: { submissionId },
      create: {
        submissionId,
        modelName: effectiveModelName,
        overallScore,
        componentScores: componentScores as object,
        feedback: narrative,
        improvements: improvements as object,
        agentSatisfied: true,
        followupRounds,
      },
      update: {
        modelName: effectiveModelName,
        overallScore,
        componentScores: componentScores as object,
        feedback: narrative,
        improvements: improvements as object,
        agentSatisfied: true,
        followupRounds,
      },
    })

    await db.submission.update({ where: { id: submissionId }, data: { status: "DONE" } })

    await publisher.publish({ type: "eval_done", submissionId })

    logger.info("evaluation_completed", {
      submissionId,
      overallScore: Number(overallScore.toFixed(1)),
      followupRounds,
    })
  } catch (error) {
    await flushReasoningMessage().catch(() => {})
    await publisher.flush().catch(() => {})
    if (error instanceof SubmissionRemovedError) return
    if (!(await db.submission.findUnique({ where: { id: submissionId }, select: { id: true } })))
      return
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error("evaluation_failed", { submissionId, jobId: job.id, error: message })

    const retryAvailable = job.attemptsMade + 1 < (job.opts.attempts ?? 1)
    if (retryAvailable) {
      await db.submission.update({ where: { id: submissionId }, data: { status: "PENDING" } })
      await publisher.resetBuffer()
      await publisher.publish({
        type: "agent_flow",
        step: "Evaluation retry scheduled",
        details: { attempt: job.attemptsMade + 2 },
      })
      throw error
    }

    await db.submission.update({ where: { id: submissionId }, data: { status: "FAILED" } })
    await publisher.publish({ type: "error", message })

    throw error // let BullMQ handle retry
  }
}
