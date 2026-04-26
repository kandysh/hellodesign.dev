import { Hono } from "hono"
import { db } from "@sysdesign/db"

const app = new Hono()

/** Extract a short description from the first line of the prompt. */
function shortDescription(prompt: string): string {
  const first = prompt.split("\n").find((l) => l.trim().length > 0) ?? ""
  return first.length > 120 ? first.slice(0, 117) + "…" : first
}

app.get("/", async (c) => {
  const category = c.req.query("category")
  const difficulty = c.req.query("difficulty")

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

  return c.json(
    questions.map(({ prompt, difficulty, ...q }) => ({
      ...q,
      description: shortDescription(prompt),
      difficulty: difficulty.toLowerCase() as "easy" | "medium" | "hard",
    })),
  )
})

app.get("/:id", async (c) => {
  const id = c.req.param("id")

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

  if (!question) return c.json({ error: "Not found" }, 404)

  return c.json({
    ...question,
    difficulty: question.difficulty.toLowerCase() as "easy" | "medium" | "hard",
  })
})

export default app

