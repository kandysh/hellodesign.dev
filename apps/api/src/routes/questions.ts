import { db } from "@sysdesign/db"
import type { FastifyPluginAsync } from "fastify"
import { ownsSubmission } from "../lib/submission-access.js"

/** Extract a short description from the first line of the prompt. */
function shortDescription(prompt: string): string {
  const first = prompt.split("\n").find((l) => l.trim().length > 0) ?? ""
  return first.length > 120 ? `${first.slice(0, 117)}…` : first
}

const questionsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (req) => {
    const { category, difficulty } = req.query as Record<string, string | undefined>

    const questions = await db.question.findMany({
      where: {
        isPublished: true,
        ...(category ? { category } : {}),
        ...(difficulty
          ? { difficulty: difficulty.toUpperCase() as "EASY" | "MEDIUM" | "HARD" }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        prompt: true,
        difficulty: true,
        category: true,
        estimatedMins: true,
        createdAt: true,
      },
    })

    return questions.map(({ prompt, difficulty, ...q }) => ({
      ...q,
      description: shortDescription(prompt),
      difficulty: difficulty.toLowerCase() as "easy" | "medium" | "hard",
    }))
  })

  fastify.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = req.params

    const question = await db.question.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        prompt: true,
        difficulty: true,
        category: true,
        estimatedMins: true,
        hints: true,
        coverageChecklist: true,
        rubric: true,
        createdAt: true,
      },
    })

    if (!question) return reply.code(404).send({ error: "Not found" })

    return {
      ...question,
      difficulty: question.difficulty.toLowerCase() as "easy" | "medium" | "hard",
    }
  })

  fastify.get<{
    Params: { id: string }
    Querystring: { submissionId?: string }
  }>("/:id/reference", async (req, reply) => {
    const submissionId = req.query.submissionId
    if (!submissionId) return reply.code(400).send({ error: "submissionId is required" })

    const [question, submission] = await Promise.all([
      db.question.findUnique({
        where: { id: req.params.id },
        select: { referenceSolution: true },
      }),
      db.submission.findUnique({
        where: { id: submissionId },
        select: { questionId: true, status: true, userId: true, sessionId: true },
      }),
    ])

    if (!question || !submission || submission.questionId !== req.params.id) {
      return reply.code(404).send({ error: "Reference solution not found" })
    }

    if (!ownsSubmission(submission, { userId: req.user?.id, sessionId: req.sessionId })) {
      return reply.code(403).send({ error: "Forbidden" })
    }
    if (submission.status !== "DONE") {
      return reply.code(409).send({ error: "Finish the evaluation before viewing the reference" })
    }
    if (!question.referenceSolution) {
      return reply.code(404).send({ error: "Reference solution is not available" })
    }

    return { referenceSolution: question.referenceSolution }
  })
}

export default questionsPlugin
