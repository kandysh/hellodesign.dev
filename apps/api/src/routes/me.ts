import { Hono } from "hono"
import { db } from "@sysdesign/db"

const app = new Hono()

app.get("/", async (c) => {
  const user = c.get("user" as never) as { id: string; email: string; name?: string } | undefined
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  return c.json(user)
})

app.get("/submissions", async (c) => {
  const user = c.get("user" as never) as { id: string } | undefined
  if (!user) return c.json({ error: "Unauthorized" }, 401)

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

  return c.json(
    submissions.map((s) => ({
      id: s.id,
      questionId: s.questionId,
      questionTitle: s.question.title,
      questionCategory: s.question.category,
      status: s.status.toLowerCase(),
      createdAt: s.createdAt,
      overallScore: s.result?.overallScore ?? null,
    })),
  )
})

export default app
