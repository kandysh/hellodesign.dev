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
      result: { select: { overallScore: true } },
    },
  })

  return c.json(submissions)
})

export default app
