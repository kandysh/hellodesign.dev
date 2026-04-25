import { Hono } from "hono"
import { db, submissions, evaluations } from "@sysdesign/db"
import { eq, desc } from "drizzle-orm"

const app = new Hono()

app.get("/submissions", async (c) => {
  const user = c.get("user" as never) as { id: string } | null
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  const rows = await db
    .select({
      id: submissions.id,
      questionId: submissions.questionId,
      status: submissions.status,
      createdAt: submissions.createdAt,
      overallScore: evaluations.overallScore,
    })
    .from(submissions)
    .leftJoin(evaluations, eq(evaluations.submissionId, submissions.id))
    .where(eq(submissions.userId, user.id))
    .orderBy(desc(submissions.createdAt))

  return c.json(rows)
})

export default app
