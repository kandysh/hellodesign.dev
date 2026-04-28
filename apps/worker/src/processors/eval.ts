import type { Processor } from "bullmq"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { db, decryptKey } from "@sysdesign/db"
import {
  runClarificationPhase,
  runEvaluationPhase,
  generateNarrativeFeedback,
  buildSystemPrompt,
  buildAnswerPrompt,
} from "@sysdesign/ai"
import type { QuestionContext } from "@sysdesign/ai"
import {
  computeWeightedScore,
  type EvalJobData,
  type AgentEvent,
  type RubricConfig,
} from "@sysdesign/shared"
import { redisPub, createSubscriber, submissionChannel, replyChannel } from "../lib/redis.js"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function publish(submissionId: string, event: AgentEvent) {
  console.log(`[worker:publish] ${submissionId} -> ${event.type}`)
  await redisPub.publish(submissionChannel(submissionId), JSON.stringify(event))
}

async function resolveApiKey({
  userId,
  sessionId,
}: {
  userId?: string
  sessionId?: string
}): Promise<{ apiKey: string; baseUrl: string | null } | null> {
  const record = await db.userApiKey.findFirst({
    where: userId ? { userId } : { sessionId },
  })
  if (!record) return null
  return { apiKey: decryptKey(record.encryptedKey, record.iv), baseUrl: record.baseUrl ?? null }
}

async function saveMessage(
  submissionId: string,
  role: "USER" | "AGENT" | "SYSTEM" | "REASONING",
  content: string,
  metadata?: Record<string, unknown>,
) {
  await db.agentMessage.create({
    data: { submissionId, role, content, metadata: metadata as object | undefined },
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
  return new Promise((resolve) => {
    const sub = createSubscriber()
    const channel = replyChannel(submissionId)

    const timer = setTimeout(() => {
      sub.unsubscribe(channel).catch(() => {})
      sub.quit().catch(() => {})
      resolve(null)
    }, timeoutMs)

    sub.subscribe(channel).then(() => {
      sub.on("message", (_, reply) => {
        clearTimeout(timer)
        sub.unsubscribe(channel).catch(() => {})
        sub.quit().catch(() => {})
        resolve(reply)
      })
    })
  })
}

// ─── Main processor ───────────────────────────────────────────────────────────

export const evalProcessor: Processor<EvalJobData> = async (job) => {
  const { submissionId, questionId, userId, sessionId, lexicalContent, excalidrawSummary } =
    job.data

  console.log(`[eval] Starting submission ${submissionId}`)

  // 1. Resolve API key
  const resolved = await resolveApiKey({ userId, sessionId })
  if (!resolved) {
    await publish(submissionId, { type: "error", message: "NO_API_KEY: No OpenAI API key found." })
    await db.submission.update({ where: { id: submissionId }, data: { status: "FAILED" } })
    return
  }
  const { apiKey, baseUrl } = resolved

  const question = await db.question.findUnique({ where: { id: questionId } })
  if (!question) {
    await publish(submissionId, { type: "error", message: "Question not found" })
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
  await publish(submissionId, { 
    type: "agent_flow", 
    step: "Job started - initializing agent",
    details: { phase: "startup" }
  })

  try {
    // 3. Build initial messages
    const systemPrompt = buildSystemPrompt(questionCtx)
    const answerPrompt = buildAnswerPrompt(questionCtx, lexicalContent, excalidrawSummary)

    const initialMessages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(answerPrompt),
    ]

    // Persist initial messages
    await saveMessage(submissionId, "SYSTEM", systemPrompt)
    await saveMessage(submissionId, "USER", answerPrompt)

    // 4. Clarification phase (LangGraph loop)
    const { messages: clarifiedMessages, followupRounds } = await runClarificationPhase({
      apiKey,
      baseUrl: baseUrl ?? undefined,
      initialMessages,
      question: questionCtx,
      submissionId,
      publishEvent: (event) => {
        // Also persist agent messages from the clarification phase
        if (event.type === "reasoning") {
          return saveMessage(submissionId, "REASONING", event.content)
            .then(() => publish(submissionId, event))
        }
        return publish(submissionId, event)
      },
      waitForReply: async (sid) => {
        await db.submission.update({ where: { id: sid }, data: { status: "FOLLOWUP" } })
        const reply = await waitForReply(sid)
        if (reply) {
          await db.submission.update({ where: { id: sid }, data: { status: "PROCESSING" } })
        }
        return reply
      },
    })

    // 5. Evaluation phase
    await db.submission.update({ where: { id: submissionId }, data: { status: "EVALUATING" } })

    const componentScores = await runEvaluationPhase({
      apiKey,
      baseUrl: baseUrl ?? undefined,
      messages: clarifiedMessages,
      question: questionCtx,
      submissionId,
      publishEvent: (event) => publish(submissionId, event),
    })

    const overallScore = computeWeightedScore(componentScores, rubric)

    // 6. Narrative feedback
    const { narrative, improvements } = await generateNarrativeFeedback({
      apiKey,
      baseUrl: baseUrl ?? undefined,
      messages: clarifiedMessages,
      componentScores,
      overallScore,
      rubric,
    })

    // 7. Persist result
    await db.evalResult.create({
      data: {
        submissionId,
        overallScore,
        componentScores: componentScores as object,
        feedback: narrative,
        improvements: improvements as object,
        agentSatisfied: true,
        followupRounds,
      },
    })

    await db.submission.update({ where: { id: submissionId }, data: { status: "DONE" } })

    await publish(submissionId, { type: "eval_done", submissionId })

    console.log(
      `[eval] Completed ${submissionId} — score: ${overallScore.toFixed(1)}, rounds: ${followupRounds}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error(`[eval] Failed ${submissionId}:`, message)

    await db.submission.update({ where: { id: submissionId }, data: { status: "FAILED" } })
    await publish(submissionId, { type: "error", message })

    throw error // let BullMQ handle retry
  }
}
