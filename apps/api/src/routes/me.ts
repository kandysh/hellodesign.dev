import { Hono } from "hono"
import { db } from "@sysdesign/db"
import type { AppEnv } from "../lib/types.js"

const app = new Hono<AppEnv>()

app.get("/", async (c) => {
  const user = c.get("user")
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  return c.json(user)
})

app.get("/stats", async (c) => {
  const user = c.get("user")
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  const submissions = await db.submission.findMany({
    where: { userId: user.id, status: "DONE" },
    select: { result: { select: { overallScore: true } }, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  const solved = submissions.length
  const scores = submissions
    .map((s) => s.result?.overallScore)
    .filter((s): s is number => s !== null && s !== undefined)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  // Simple streak: count consecutive days with at least one submission (most recent first)
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
      if (diff < dayMs) streak++ // new day
      cursor = d.getTime()
    } else {
      break
    }
  }

  return c.json({ solved, avgScore, streak })
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
