import "./env.js"
import { db } from "@sysdesign/db"
import { deepEvalQueue, evalQueue, QUEUES, releaseEvalSlot } from "@sysdesign/queue"
import { Worker } from "bullmq"
import { Redis } from "ioredis"
import { logger } from "./lib/logger.js"
import { eventBufKey, replyKey } from "./lib/redis.js"
import { evalProcessor } from "./processors/eval.js"

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

const deepEvalConcurrency = Number(process.env.DEEP_EVAL_CONCURRENCY ?? 2)
if (!Number.isSafeInteger(deepEvalConcurrency) || deepEvalConcurrency < 1) {
  throw new Error("DEEP_EVAL_CONCURRENCY must be a positive integer")
}

const evalWorker = new Worker(QUEUES.EVAL, evalProcessor, {
  connection,
  concurrency: 5,
})

const deepEvalWorker = new Worker(QUEUES.DEEP_EVAL, evalProcessor, {
  connection: connection.duplicate(),
  concurrency: deepEvalConcurrency,
})

async function cleanupExpiredGuestData() {
  const lockKey = "maintenance:guest-data-cleanup"
  if ((await connection.set(lockKey, "1", "EX", 60 * 60 * 23, "NX")) !== "OK") return
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let deletedSubmissions = 0
  try {
    while (true) {
      const stale = await db.submission.findMany({
        where: { userId: null, sessionId: { not: null }, createdAt: { lt: cutoff } },
        select: { id: true, sessionId: true },
        orderBy: { createdAt: "asc" },
        take: 500,
      })
      if (!stale.length) break
      const ids = stale.map((submission) => submission.id)
      for (const submission of stale) {
        if (!submission.sessionId) continue
        const owner = { sessionId: submission.sessionId }
        await Promise.all([
          releaseEvalSlot(owner, submission.id).catch(() => {}),
          (async () => {
            for (const queue of [evalQueue, deepEvalQueue]) {
              const job = await queue.getJob(submission.id)
              if (job && (await job.getState()) !== "active") await job.remove().catch(() => {})
            }
          })(),
        ])
      }
      await db.submission.deleteMany({ where: { id: { in: ids }, userId: null } })
      await connection.del(...ids.flatMap((id) => [eventBufKey(id), replyKey(id)]))
      deletedSubmissions += ids.length
    }

    await db.$executeRaw`
      DELETE FROM "UserApiKey" AS api_key
      WHERE api_key."userId" IS NULL
        AND api_key."sessionId" IS NOT NULL
        AND api_key."createdAt" < ${cutoff}
        AND NOT EXISTS (
          SELECT 1
          FROM "Submission" AS submission
          WHERE submission."userId" IS NULL
            AND submission."sessionId" = api_key."sessionId"
            AND submission."createdAt" >= ${cutoff}
        )
    `
    if (deletedSubmissions) {
      logger.info("guest_data_pruned", { deletedSubmissions, cutoff: cutoff.toISOString() })
    }
  } catch (error) {
    await connection.del(lockKey).catch(() => {})
    logger.error("guest_cleanup_failed", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

void cleanupExpiredGuestData()
const guestCleanupTimer = setInterval(() => void cleanupExpiredGuestData(), 24 * 60 * 60 * 1000)
guestCleanupTimer.unref()

evalWorker.on("completed", (job) => {
  logger.info("job_completed", {
    queue: QUEUES.EVAL,
    jobId: job.id,
    submissionId: job.data.submissionId,
  })
  const owner = job.data.userId ? { userId: job.data.userId } : { sessionId: job.data.sessionId }
  void releaseEvalSlot(owner, job.data.submissionId).catch((err) => {
    logger.error("submission_slot_release_failed", {
      queue: QUEUES.EVAL,
      jobId: job.id,
      submissionId: job.data.submissionId,
      error: err instanceof Error ? err.message : String(err),
    })
  })
})

evalWorker.on("failed", (job, err) => {
  logger.error("job_failed", {
    queue: QUEUES.EVAL,
    jobId: job?.id,
    submissionId: job?.data.submissionId,
    error: err.message,
  })
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    const owner = job.data.userId ? { userId: job.data.userId } : { sessionId: job.data.sessionId }
    void releaseEvalSlot(owner, job.data.submissionId).catch((releaseError) => {
      logger.error("submission_slot_release_failed", {
        queue: QUEUES.EVAL,
        jobId: job.id,
        submissionId: job.data.submissionId,
        error: releaseError instanceof Error ? releaseError.message : String(releaseError),
      })
    })
  }
})

deepEvalWorker.on("completed", (job) => {
  logger.info("job_completed", {
    queue: QUEUES.DEEP_EVAL,
    jobId: job.id,
    submissionId: job.data.submissionId,
  })
  const owner = job.data.userId ? { userId: job.data.userId } : { sessionId: job.data.sessionId }
  void releaseEvalSlot(owner, job.data.submissionId).catch((err) => {
    logger.error("submission_slot_release_failed", {
      queue: QUEUES.DEEP_EVAL,
      jobId: job.id,
      submissionId: job.data.submissionId,
      error: err instanceof Error ? err.message : String(err),
    })
  })
})

deepEvalWorker.on("failed", (job, err) => {
  logger.error("job_failed", {
    queue: QUEUES.DEEP_EVAL,
    jobId: job?.id,
    submissionId: job?.data.submissionId,
    error: err.message,
  })
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    const owner = job.data.userId ? { userId: job.data.userId } : { sessionId: job.data.sessionId }
    void releaseEvalSlot(owner, job.data.submissionId).catch((releaseError) => {
      logger.error("submission_slot_release_failed", {
        queue: QUEUES.DEEP_EVAL,
        jobId: job.id,
        submissionId: job.data.submissionId,
        error: releaseError instanceof Error ? releaseError.message : String(releaseError),
      })
    })
  }
})

async function shutdown() {
  logger.info("shutdown_started")
  clearInterval(guestCleanupTimer)
  await Promise.all([evalWorker.close(), deepEvalWorker.close()])
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

logger.info("workers_started", {
  concurrency: { quick: 5, deep: deepEvalConcurrency },
})
