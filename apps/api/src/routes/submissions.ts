import { Hono } from "hono"
import { db, submissions, evaluations, agentResults, questions } from "@sysdesign/db"
import { eq } from "drizzle-orm"
import { evalQueue } from "../lib/queue.js"

const app = new Hono()

// Create a new submission and enqueue evaluation
app.post("/", async (c) => {
  const user = c.get("user" as never) as { id: string } | null
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  const body = await c.req.json<{
    questionId: string
    answerText: string
    excalidrawJson?: Record<string, unknown>
  }>()

  const [question] = await db.select().from(questions).where(eq(questions.id, body.questionId))
  if (!question) return c.json({ error: "Question not found" }, 404)

  const [submission] = await db
    .insert(submissions)
    .values({
      userId: user.id,
      questionId: body.questionId,
      answerText: body.answerText,
      excalidrawJson: body.excalidrawJson ?? null,
      status: "pending",
    })
    .returning()

  if (!submission) return c.json({ error: "Failed to create submission" }, 500)

  await evalQueue.add("evaluate", {
    submissionId: submission.id,
    questionId: body.questionId,
    userId: user.id,
  })

  return c.json({ submissionId: submission.id }, 201)
})

// Get submission with evaluation results
app.get("/:id", async (c) => {
  const user = c.get("user" as never) as { id: string } | null
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  const id = c.req.param("id")

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))

  if (!submission) return c.json({ error: "Not found" }, 404)
  if (submission.userId !== user.id) return c.json({ error: "Forbidden" }, 403)

  const [evaluation] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.submissionId, id))

  let agents: typeof agentResults.$inferSelect[] = []
  if (evaluation) {
    agents = await db
      .select()
      .from(agentResults)
      .where(eq(agentResults.evaluationId, evaluation.id))
  }

  return c.json({ submission, evaluation: evaluation ?? null, agents })
})

export default app
