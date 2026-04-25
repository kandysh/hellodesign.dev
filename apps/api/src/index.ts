import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { auth } from "@sysdesign/auth"
import questionsRouter from "./routes/questions.js"
import submissionsRouter from "./routes/submissions.js"
import streamRouter from "./routes/stream.js"
import meRouter from "./routes/me.js"

const app = new Hono()

// Middleware
app.use("*", logger())
app.use(
  "*",
  cors({
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true,
  }),
)

// Auth middleware — attach user to context
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (session?.user) {
    c.set("user" as never, session.user)
  }
  await next()
})

// Better Auth handler (handles /api/auth/**)
app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw))

// API routes
app.route("/api/questions", questionsRouter)
app.route("/api/submissions", submissionsRouter)
app.route("/api/submissions", streamRouter)
app.route("/api/me", meRouter)

app.get("/health", (c) => c.json({ ok: true }))

const port = Number(process.env.PORT ?? 3001)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 API running at http://localhost:${info.port}`)
})
