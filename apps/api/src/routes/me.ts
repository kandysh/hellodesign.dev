import type { FastifyPluginAsync } from "fastify"
import { db } from "@sysdesign/db"
import { evalQueue } from "@sysdesign/queue"
import { redis, eventBufKey, replyKey } from "../lib/redis.js"

async function removeQueuedEvalJob(id: string) {
  try {
    const job = await evalQueue.getJob(id)
    if (job && await job.getState() !== "active") await job.remove()
  } catch {
    // The database deletion remains authoritative; workers also check for the submission before writing.
  }
}

async function clearSubmissionCache(ids: string[]) {
  try {
    for (const id of ids) await redis.del(eventBufKey(id), replyKey(id))
  } catch {
    // These short-lived Redis keys expire automatically if Redis is temporarily unavailable.
  }
}

const mePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Unauthorized" })
    return req.user
  })

  fastify.get("/stats", async (req) => {
    const where = req.user ? { userId: req.user.id } : { sessionId: req.sessionId }
    const submissions = await db.submission.findMany({
      where: { ...where, status: "DONE" },
      select: { result: { select: { overallScore: true } }, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
    const scores = submissions.map((s) => s.result?.overallScore).filter((s): s is number => s != null)
    const dayMs = 86_400_000
    const dates = [...new Set(submissions.map((s) => {
      const d = new Date(s.createdAt)
      return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / dayMs)
    }))].sort((a, b) => b - a)
    let streak = 0
    const today = new Date()
    const todayIndex = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / dayMs)
    let cursor = dates[0]
    if (dates.length && cursor >= todayIndex - 1) {
      for (const date of dates) {
        if (date === cursor) { streak++; cursor-- } else break
      }
    }
    return { solved: submissions.length, avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null, streak }
  })

  fastify.get("/submissions", async (req) => {
    const where = req.user ? { userId: req.user.id } : { sessionId: req.sessionId }
    const submissions = await db.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true, questionId: true, status: true, createdAt: true, question: { select: { title: true, category: true } }, result: { select: { overallScore: true } } },
    })
    return submissions.map((s) => ({ id: s.id, questionId: s.questionId, questionTitle: s.question.title, questionCategory: s.question.category, status: s.status.toLowerCase(), createdAt: s.createdAt, overallScore: s.result?.overallScore ?? null }))
  })

  fastify.delete("/session-data", async (req, reply) => {
    const sessionId = req.sessionId
    const submissions = await db.submission.findMany({ where: { sessionId }, select: { id: true } })
    for (const { id } of submissions) await removeQueuedEvalJob(id)
    await db.$transaction([
      db.submission.deleteMany({ where: { sessionId } }),
      db.userApiKey.deleteMany({ where: { sessionId } }),
    ])
    await clearSubmissionCache(submissions.map((submission) => submission.id))
    reply.clearCookie("session_id", { path: "/" })
    return { ok: true, deletedSubmissions: submissions.length }
  })

  fastify.delete("/", async (req, reply) => {
    const user = req.user
    if (!user) return reply.code(401).send({ error: "Sign in required" })
    const confirmEmail = (req.body as { confirmEmail?: string } | undefined)?.confirmEmail
    if (confirmEmail !== user.email) return reply.code(400).send({ error: "Enter your account email to confirm deletion" })
    const submissions = await db.submission.findMany({ where: { userId: user.id }, select: { id: true } })
    for (const { id } of submissions) await removeQueuedEvalJob(id)
    await db.user.delete({ where: { id: user.id } })
    await clearSubmissionCache(submissions.map((submission) => submission.id))
    reply.clearCookie("session_id", { path: "/" })
    return { ok: true }
  })
}

export default mePlugin
