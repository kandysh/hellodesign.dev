import type { FastifyPluginAsync } from "fastify"
import { db } from "@sysdesign/db"

const mePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (req, reply) => {
    const user = req.user
    if (!user) return reply.code(401).send({ error: "Unauthorized" })
    return user
  })

  fastify.get("/stats", async (req, reply) => {
    const user = req.user
    if (!user) return reply.code(401).send({ error: "Unauthorized" })

    const submissions = await db.submission.findMany({
      where: { userId: user.id, status: "DONE" },
      select: { result: { select: { overallScore: true } }, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    const solved = submissions.length
    const scores = submissions
      .map((s) => s.result?.overallScore)
      .filter((s): s is number => s !== null && s !== undefined)
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayMs = 86_400_000
    let cursor = today.getTime()
    for (const sub of submissions) {
      const d = new Date(sub.createdAt)
      d.setHours(0, 0, 0, 0)
      const diff = cursor - d.getTime()
      if (diff <= dayMs) {
        if (diff < dayMs) streak++
        cursor = d.getTime()
      } else {
        break
      }
    }

    return { solved, avgScore, streak }
  })

  fastify.get("/submissions", async (req, reply) => {
    const user = req.user
    if (!user) return reply.code(401).send({ error: "Unauthorized" })

    const submissions = await db.submission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        questionId: true,
        status: true,
        createdAt: true,
        question: { select: { title: true, category: true } },
        result: { select: { overallScore: true } },
      },
    })

    return submissions.map((s) => ({
      id: s.id,
      questionId: s.questionId,
      questionTitle: s.question.title,
      questionCategory: s.question.category,
      status: s.status.toLowerCase(),
      createdAt: s.createdAt,
      overallScore: s.result?.overallScore ?? null,
    }))
  })
}

export default mePlugin
