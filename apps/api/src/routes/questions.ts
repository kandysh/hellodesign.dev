import { Hono } from "hono"
import { db, questions } from "@sysdesign/db"
import { eq, and } from "drizzle-orm"

const app = new Hono()

app.get("/", async (c) => {
  const category = c.req.query("category")
  const difficulty = c.req.query("difficulty")

  const filters = []
  if (category) filters.push(eq(questions.category, category as never))
  if (difficulty) filters.push(eq(questions.difficulty, difficulty as never))
  filters.push(eq(questions.isPublished, true))

  const rows = await db
    .select()
    .from(questions)
    .where(and(...filters))
    .orderBy(questions.createdAt)

  return c.json(rows)
})

app.get("/:id", async (c) => {
  const id = c.req.param("id")
  const [question] = await db.select().from(questions).where(eq(questions.id, id))
  if (!question) return c.json({ error: "Not found" }, 404)
  return c.json(question)
})

export default app
