import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { db, submissions } from "@sysdesign/db"
import { eq } from "drizzle-orm"
import { redisSub, evalChannel } from "../lib/redis.js"

const app = new Hono()

// SSE endpoint: streams eval progress for a submission
app.get("/:id/stream", async (c) => {
  const user = c.get("user" as never) as { id: string } | null
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  const id = c.req.param("id")

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))

  if (!submission) return c.json({ error: "Not found" }, 404)
  if (submission.userId !== user.id) return c.json({ error: "Forbidden" }, 403)

  // Already done — return immediately
  if (submission.status === "done" || submission.status === "failed") {
    return c.json({ message: "Evaluation already complete", status: submission.status })
  }

  const channel = evalChannel(id)

  return streamSSE(c, async (stream) => {
    const subscriber = redisSub.duplicate()
    await subscriber.subscribe(channel)

    const cleanup = () => {
      subscriber.unsubscribe(channel).catch(() => {})
      subscriber.quit().catch(() => {})
    }

    stream.onAbort(cleanup)

    await new Promise<void>((resolve) => {
      subscriber.on("message", async (_chan, message) => {
        try {
          const event = JSON.parse(message)
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event.data),
          })
          if (event.type === "evaluation:complete" || event.type === "evaluation:error") {
            resolve()
          }
        } catch {
          // ignore parse errors
        }
      })
    })

    cleanup()
  })
})

export default app
