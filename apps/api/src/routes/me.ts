import { db } from "@sysdesign/db"
import { deepEvalQueue, evalQueue, releaseEvalSlot } from "@sysdesign/queue"
import type { FastifyPluginAsync } from "fastify"
import { eventBufKey, redis, replyKey } from "../lib/redis.js"

async function removeQueuedEvalJob(id: string, owner: { userId?: string; sessionId?: string }) {
  try {
    for (const queue of [evalQueue, deepEvalQueue]) {
      const job = await queue.getJob(id)
      if (job && (await job.getState()) !== "active") await job.remove()
    }
  } catch {
    // The database deletion remains authoritative; workers also check for the submission before writing.
  }
  await releaseEvalSlot(owner, id).catch(() => {})
}

async function clearSubmissionCache(ids: string[]) {
  try {
    for (const id of ids) await redis.del(eventBufKey(id), replyKey(id))
  } catch {
    // These short-lived Redis keys expire automatically if Redis is temporarily unavailable.
  }
}

const deleteAccountBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: { confirmEmail: { type: "string", maxLength: 320 } },
} as const

const SUBMISSIONS_PAGE_SIZE = 20

const mePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.post("/claim-session", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Sign in required" })
    const sessionId = req.sessionId
    const [submissions, keys] = await db.$transaction([
      db.submission.updateMany({
        where: { sessionId, userId: null },
        data: { userId: req.user.id, sessionId: null },
      }),
      db.userApiKey.updateMany({
        where: { sessionId, userId: null },
        data: { userId: req.user.id, sessionId: null },
      }),
    ])
    return { ok: true, submissions: submissions.count, keys: keys.count }
  })

  fastify.get("/", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Unauthorized" })
    return req.user
  })

  fastify.get("/stats", async (req) => {
    const owner = req.user ? { userId: req.user.id } : { sessionId: req.sessionId }
    const resultFilter = req.user
      ? { submission: { userId: req.user.id, status: "DONE" as const } }
      : { submission: { sessionId: req.sessionId, status: "DONE" as const } }
    const [solved, aggregate, dayRows, categoryRows] = await Promise.all([
      db.submission.count({ where: { ...owner, status: "DONE" } }),
      db.evalResult.aggregate({ where: resultFilter, _avg: { overallScore: true } }),
      req.user
        ? db.$queryRaw<
            Array<{ day: string }>
          >`SELECT DISTINCT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day FROM "Submission" WHERE status = 'DONE' AND "userId" = ${req.user.id} ORDER BY day DESC`
        : db.$queryRaw<
            Array<{ day: string }>
          >`SELECT DISTINCT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day FROM "Submission" WHERE status = 'DONE' AND "sessionId" = ${req.sessionId} ORDER BY day DESC`,
      req.user
        ? db.$queryRaw<
            Array<{ category: string; attempted: number; solved: number; average: number | null }>
          >`
            SELECT q.category, COUNT(s.id)::int AS attempted,
              (COUNT(r."submissionId") FILTER (WHERE s.status = 'DONE'))::int AS solved,
              AVG(r."overallScore") FILTER (WHERE s.status = 'DONE') AS average
            FROM "Submission" s
            JOIN "Question" q ON q.id = s."questionId"
            LEFT JOIN "EvalResult" r ON r."submissionId" = s.id
            WHERE s."userId" = ${req.user.id}
            GROUP BY q.category ORDER BY q.category`
        : db.$queryRaw<
            Array<{ category: string; attempted: number; solved: number; average: number | null }>
          >`
            SELECT q.category, COUNT(s.id)::int AS attempted,
              (COUNT(r."submissionId") FILTER (WHERE s.status = 'DONE'))::int AS solved,
              AVG(r."overallScore") FILTER (WHERE s.status = 'DONE') AS average
            FROM "Submission" s
            JOIN "Question" q ON q.id = s."questionId"
            LEFT JOIN "EvalResult" r ON r."submissionId" = s.id
            WHERE s."sessionId" = ${req.sessionId}
            GROUP BY q.category ORDER BY q.category`,
    ])

    const dateSet = new Set(dayRows.map(({ day }) => day))
    const today = new Date().toISOString().slice(0, 10)
    let dateCursor = dateSet.has(today)
      ? today
      : new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    let streak = 0
    while (dateSet.has(dateCursor)) {
      streak += 1
      dateCursor = new Date(new Date(`${dateCursor}T00:00:00.000Z`).getTime() - 86_400_000)
        .toISOString()
        .slice(0, 10)
    }
    return {
      solved,
      attempted: categoryRows.reduce((total, row) => total + row.attempted, 0),
      avgScore:
        aggregate._avg.overallScore == null ? null : Number(aggregate._avg.overallScore.toFixed(1)),
      streak,
      categories: categoryRows.map((row) => ({
        category: row.category,
        attempted: row.attempted,
        solved: row.solved,
        avgScore: row.average == null ? null : Number(row.average),
      })),
    }
  })

  fastify.get<{ Querystring: { cursor?: string } }>("/submissions", async (req) => {
    const where = req.user ? { userId: req.user.id } : { sessionId: req.sessionId }
    const submissions = await db.submission.findMany({
      take: SUBMISSIONS_PAGE_SIZE + 1,
      ...(req.query.cursor ? { cursor: { id: req.query.cursor }, skip: 1 } : {}),
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        questionId: true,
        status: true,
        createdAt: true,
        question: { select: { title: true, category: true } },
        result: { select: { overallScore: true } },
      },
    })
    const hasMore = submissions.length > SUBMISSIONS_PAGE_SIZE
    const page = submissions.slice(0, SUBMISSIONS_PAGE_SIZE)
    return {
      items: page.map((s) => ({
        id: s.id,
        questionId: s.questionId,
        questionTitle: s.question.title,
        questionCategory: s.question.category,
        status: s.status.toLowerCase(),
        createdAt: s.createdAt,
        overallScore: s.result?.overallScore ?? null,
      })),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    }
  })

  fastify.delete("/session-data", async (req, reply) => {
    const sessionId = req.sessionId
    const submissions = await db.submission.findMany({
      where: { sessionId },
      select: { id: true, sessionId: true },
    })
    for (const { id, sessionId: ownerSessionId } of submissions) {
      await removeQueuedEvalJob(id, { sessionId: ownerSessionId ?? sessionId })
    }
    await db.$transaction([
      db.submission.deleteMany({ where: { sessionId } }),
      db.userApiKey.deleteMany({ where: { sessionId } }),
    ])
    await clearSubmissionCache(submissions.map((submission) => submission.id))
    reply.clearCookie("session_id", { path: "/" })
    return { ok: true, deletedSubmissions: submissions.length }
  })

  fastify.delete<{ Body: { confirmEmail?: string } }>(
    "/",
    { schema: { body: deleteAccountBodySchema } },
    async (req, reply) => {
      const user = req.user
      if (!user) return reply.code(401).send({ error: "Sign in required" })
      const confirmEmail = req.body?.confirmEmail
      if (confirmEmail !== user.email)
        return reply.code(400).send({ error: "Enter your account email to confirm deletion" })
      const submissions = await db.submission.findMany({
        where: { userId: user.id },
        select: { id: true, userId: true },
      })
      for (const { id, userId: ownerUserId } of submissions) {
        await removeQueuedEvalJob(id, { userId: ownerUserId ?? user.id })
      }
      await db.user.delete({ where: { id: user.id } })
      await clearSubmissionCache(submissions.map((submission) => submission.id))
      reply.clearCookie("session_id", { path: "/" })
      return { ok: true }
    },
  )
}

export default mePlugin
