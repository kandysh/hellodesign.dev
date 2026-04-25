import { Hono } from "hono"
import { db } from "@sysdesign/db"

const app = new Hono()

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
      difficulty: true,
      category: true,
      estimatedMins: true,
      createdAt: true,
    },
  })

  return c.json(questions)
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

  return c.json(question)
})

export default app
