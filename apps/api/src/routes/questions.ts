import type { FastifyPluginAsync } from "fastify"
import { db } from "@sysdesign/db"

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
}

export default questionsPlugin

